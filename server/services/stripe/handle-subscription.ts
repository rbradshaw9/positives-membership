import type Stripe from "stripe";
import { after } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import type { Enums } from "@/types/supabase";
import { config } from "@/lib/config";
import { getStripe } from "@/lib/stripe/config";
import {
  syncAccessRestored,
  syncCancellationCleared,
  syncCancellationState,
  syncPaymentFailed,
  syncPaymentRecovered,
  syncPaymentSucceeded,
  syncTierChange,
  syncTrialEnding,
} from "@/lib/activecampaign/sync";
import { generateBillingToken } from "@/lib/auth/billing-token";
import { trackServerEvent } from "@/lib/analytics/measurement-protocol";
import { comparePlanLevels, getSubscriptionAnalyticsFromPriceId } from "@/lib/analytics/subscription";
import { trackFpSale } from "@/lib/firstpromoter/client";
import { PLAN_NAME_BY_TIER } from "@/lib/plans";
import {
  recordInvoicePaymentFailed,
  recordInvoicePaymentSucceeded,
  syncSubscriptionSnapshotFromStripe,
} from "./member-billing-summary";

type SubscriptionStatus = Enums<"subscription_status">;
type SubscriptionTier = Enums<"subscription_tier">;

function runAfterSubscription(taskName: string, task: () => Promise<void>) {
  after(async () => {
    try {
      await task();
    } catch (error) {
      console.error(
        `[Stripe][after] ${taskName} failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  });
}


/**
 * server/services/stripe/handle-subscription.ts
 * Handlers for Stripe subscription lifecycle webhook events.
 *
 * Each handler mirrors the Stripe subscription state into the Supabase
 * `member` table using the service role client (bypasses RLS).
 *
 * The Stripe customer ID is used to locate the member record.
 * Ensure member.stripe_customer_id is set when a customer is created in Stripe.
 *
 * ActiveCampaign sync is wired into all lifecycle events (non-fatal).
 */

// getAdminClient() — see lib/supabase/admin.ts

/**
 * Map Stripe subscription status → Positives subscription status
 */
function mapStatus(stripeStatus: string): SubscriptionStatus {
  switch (stripeStatus) {
    case "active":
      return "active";
    case "past_due":
      return "past_due";
    case "canceled":
    case "unpaid":
      return "canceled";
    case "trialing":
      return "trialing";
    default:
      return "inactive";
  }
}

/**
 * Map Stripe Price ID → Positives subscription tier.
 *
 * Driven by STRIPE_PRICE_LEVEL_*_{MONTHLY|ANNUAL} env vars.
 * Set these in .env.local once prices are created in your Stripe dashboard.
 *
 * If the price ID is unknown, throws an error rather than silently assigning
 * the wrong tier. The webhook returns 400, prompting Stripe to retry.
 */
function mapTier(priceId: string | null, metadata?: Record<string, string>): SubscriptionTier {
  // Custom L4 subscriptions created via the admin tool use inline price_data.
  // Their price IDs are not in the env-var map, but they carry assigned_tier in metadata.
  if (metadata?.assigned_tier === "level_4") return "level_4";

  if (!priceId) {
    throw new Error(
      `[Stripe] Cannot map tier: subscription has no price ID. ` +
        `Ensure the subscription has at least one active price item.`
    );
  }

  const {
    level1Monthly, level2Monthly, level3Monthly, level4ThreePay,
    level1Annual, level2Annual, level3Annual,
  } = config.stripe.prices;

  const tierMap: Record<string, SubscriptionTier> = {};
  if (level1Monthly)  tierMap[level1Monthly]  = "level_1";
  if (level2Monthly)  tierMap[level2Monthly]  = "level_2";
  if (level3Monthly)  tierMap[level3Monthly]  = "level_3";
  if (level4ThreePay) tierMap[level4ThreePay] = "level_4";
  if (level1Annual)   tierMap[level1Annual]   = "level_1";
  if (level2Annual)   tierMap[level2Annual]   = "level_2";
  if (level3Annual)   tierMap[level3Annual]   = "level_3";

  const tier = tierMap[priceId];

  if (!tier) {
    throw new Error(
      `[Stripe] Unknown price ID: "${priceId}". ` +
        `Add the corresponding STRIPE_PRICE_LEVEL_*_MONTHLY/ANNUAL env var ` +
        `and restart the server.`
    );
  }

  return tier;
}

async function updateMemberSubscription(
  customerId: string,
  subscription: Stripe.Subscription
) {
  const supabase = getAdminClient();
  const stripe = getStripe();

  const priceId =
    subscription.items.data[0]?.price?.id ?? null;

  const status = mapStatus(subscription.status);
  const tier = mapTier(priceId, subscription.metadata as Record<string, string>);
  const planName = PLAN_NAME_BY_TIER[tier];

  // current_period_end was removed in Stripe API 2026-03-25.dahlia.
  // Use cancel_at or ended_at as the effective subscription end date.
  const periodEndTs = subscription.cancel_at ?? subscription.ended_at;
  const subscriptionEndDate = periodEndTs
    ? new Date(periodEndTs * 1000).toISOString()
    : null;

  // First verify the member row exists — a zero-row update is otherwise silent.
  const { data: existing, error: lookupError } = await supabase
    .from("member")
    .select("id, email, subscription_tier, subscription_status, subscription_end_date, referred_by_fpr, email_unsubscribed")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (lookupError) {
    throw new Error(
      `[Stripe] Failed to look up member for customer ${customerId}: ${lookupError.message}`
    );
  }

  if (!existing) {
    // This means stripe_customer_id was never written to the member row.
    // checkout.session.completed should have handled this — if we're here,
    // it either hasn't fired yet or also failed.
    console.error(
      `[Stripe] No member row found with stripe_customer_id: ${customerId}. ` +
        `subscription: ${subscription.id}, status: ${status}. ` +
        `Manual reconciliation required — check Supabase member table.`
    );
    // Throw so Stripe retries this event (gives checkout.session.completed time to run).
    throw new Error(
      `[Stripe] Member not found for customer ${customerId} — will retry.`
    );
  }

  const { error } = await supabase
    .from("member")
    .update({
      subscription_status: status,
      subscription_tier: tier,
      subscription_end_date: subscriptionEndDate,
    })
    .eq("stripe_customer_id", customerId);

  if (error) {
    throw new Error(
      `[Stripe] Failed to update member for customer ${customerId}: ${error.message}`
    );
  }

  console.log(
    `[Stripe] Member updated — customer: ${customerId}, memberId: ${existing.id}, status: ${status}, tier: ${tier}`
  );

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://positives.life";
  const regainedAccess =
    existing.subscription_status === "past_due" &&
    (status === "active" || status === "trialing");

  const cancellationScheduled =
    Boolean(subscription.cancel_at) &&
    (status === "active" || status === "trialing");

  const cancellationCleared =
    Boolean(existing.subscription_end_date) &&
    !subscriptionEndDate &&
    (status === "active" || status === "trialing");

  runAfterSubscription(`subscription syncs for ${subscription.id}`, async () => {
    if (existing.id && existing.subscription_status !== "trialing" && status === "trialing") {
      try {
        await trackServerEvent({
          name: "trial_started",
          clientSeed: customerId,
          userId: existing.id,
          params: {
            plan_level: tier,
            subscription_status: status,
            trial_end: subscription.trial_end ?? undefined,
            ...getSubscriptionAnalyticsFromPriceId(priceId),
          },
        });
      } catch (analyticsError) {
        console.error(
          `[GA4] Failed to track trial start for customer ${customerId}: ` +
            `${analyticsError instanceof Error ? analyticsError.message : String(analyticsError)}`
        );
      }
    }

    if (existing.id && existing.subscription_status === "trialing" && status === "active") {
      try {
        await trackServerEvent({
          name: "trial_converted",
          clientSeed: customerId,
          userId: existing.id,
          params: {
            plan_level: tier,
            subscription_status: status,
            ...getSubscriptionAnalyticsFromPriceId(priceId),
          },
        });
      } catch (analyticsError) {
        console.error(
          `[GA4] Failed to track trial conversion for customer ${customerId}: ` +
            `${analyticsError instanceof Error ? analyticsError.message : String(analyticsError)}`
        );
      }

      if (existing.email && existing.referred_by_fpr) {
        const latestInvoiceId =
          typeof subscription.latest_invoice === "string"
            ? subscription.latest_invoice
            : subscription.latest_invoice?.id ?? null;

        if (!latestInvoiceId) {
          console.warn(
            `[FP] Trial converted for ${existing.email}, but no latest invoice ID was present on subscription ${subscription.id}.`
          );
        } else {
          try {
            const invoice = await stripe.invoices.retrieve(latestInvoiceId);
            const amountPaid = (invoice.amount_paid ?? 0) / 100;

            if (amountPaid > 0) {
              await trackFpSale({
                email: existing.email,
                amount: amountPaid,
                planId: priceId ?? undefined,
                refId: existing.referred_by_fpr,
              });
              console.log(
                `[FP] Trial conversion sale tracked for ${existing.email} (fpr: ${existing.referred_by_fpr})`
              );
            } else {
              console.warn(
                `[FP] Trial converted for ${existing.email}, but invoice ${latestInvoiceId} had no paid amount.`
              );
            }
          } catch (fpError) {
            console.error(
              `[FP] Failed to track trial conversion sale for ${existing.email}: ` +
                `${fpError instanceof Error ? fpError.message : String(fpError)}`
            );
          }
        }
      }
    }

    if (existing.email) {
      try {
        await syncTierChange({
          email: existing.email,
          oldTier: (existing.subscription_tier as SubscriptionTier) ?? null,
          newTier: tier,
          planName,
        });
      } catch (syncError) {
        console.error(
          `[AC] Failed to sync tier change for ${existing.email}: ` +
            `${syncError instanceof Error ? syncError.message : String(syncError)}`
        );
      }
    }

    if (existing.email && regainedAccess) {
      try {
        await syncAccessRestored({
          email: existing.email,
          accessRestoredAt: new Date().toISOString(),
          loginLink: `${appUrl}/login?next=/today`,
          planName,
        });
      } catch (syncError) {
        console.error(
          `[AC] Failed to sync access restored for ${existing.email}: ` +
            `${syncError instanceof Error ? syncError.message : String(syncError)}`
        );
      }
    }

    if (existing.email && cancellationScheduled) {
      try {
        await syncCancellationState({
          email: existing.email,
          tier: null,
          canceledAt: new Date().toISOString(),
          paidThroughAt: subscriptionEndDate ?? undefined,
        });
      } catch (syncError) {
        console.error(
          `[AC] Failed to sync cancellation state for ${existing.email}: ` +
            `${syncError instanceof Error ? syncError.message : String(syncError)}`
        );
      }
    }

    if (existing.email && cancellationCleared) {
      try {
        await syncCancellationCleared({ email: existing.email });
      } catch (syncError) {
        console.error(
          `[AC] Failed to sync cancellation cleared for ${existing.email}: ` +
            `${syncError instanceof Error ? syncError.message : String(syncError)}`
        );
      }
    }

    if (comparePlanLevels(existing.subscription_tier, tier) > 0) {
      try {
        await trackServerEvent({
          name: "upgrade_completed",
          clientSeed: customerId,
          userId: existing.id,
          params: {
            previous_plan_level: existing.subscription_tier ?? undefined,
            new_plan_level: tier,
            subscription_status: status,
            ...getSubscriptionAnalyticsFromPriceId(priceId),
          },
        });
      } catch (analyticsError) {
        console.error(
          `[GA4] Failed to track upgrade for customer ${customerId}: ` +
            `${analyticsError instanceof Error ? analyticsError.message : String(analyticsError)}`
        );
      }
    }
  });
}

export async function handleSubscriptionCreated(
  subscription: Stripe.Subscription
) {
  const customerId = subscription.customer as string;
  await updateMemberSubscription(customerId, subscription);
  await syncSubscriptionSnapshotFromStripe({ customerId, subscription });
}

export async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription
) {
  const customerId = subscription.customer as string;
  await updateMemberSubscription(customerId, subscription);
  await syncSubscriptionSnapshotFromStripe({ customerId, subscription });
}

export async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription
) {
  const supabase = getAdminClient();
  const customerId = subscription.customer as string;

  const { data: canceledMember } = await supabase
    .from("member")
    .select("id, email, subscription_tier")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  const { error } = await supabase
    .from("member")
    .update({
      subscription_status: "canceled",
      subscription_tier: null,
      subscription_end_date: new Date().toISOString(),
    })
    .eq("stripe_customer_id", customerId);

  if (error) {
    throw new Error(
      `Failed to cancel member for customer ${customerId}: ${error.message}`
    );
  }

  console.log(`[Stripe] Subscription canceled — customer: ${customerId}`);
  await syncSubscriptionSnapshotFromStripe({ customerId, subscription });

  runAfterSubscription(`subscription cancellation syncs for ${subscription.id}`, async () => {
    if (canceledMember?.email) {
      try {
        await syncCancellationState({
          email: canceledMember.email,
          tier: (canceledMember.subscription_tier as SubscriptionTier | null) ?? null,
          canceledAt: new Date().toISOString(),
          paidThroughAt: new Date().toISOString(),
        });
      } catch (syncError) {
        console.error(
          `[AC] Failed to sync cancellation state for ${canceledMember.email}: ` +
            `${syncError instanceof Error ? syncError.message : String(syncError)}`
        );
      }
    }

    if (canceledMember?.id) {
      try {
        await trackServerEvent({
          name: "subscription_canceled",
          clientSeed: customerId,
          userId: canceledMember.id,
          params: {
            subscription_status: "canceled",
          },
        });
      } catch (analyticsError) {
        console.error(
          `[GA4] Failed to track cancellation for customer ${customerId}: ` +
            `${analyticsError instanceof Error ? analyticsError.message : String(analyticsError)}`
        );
      }
    }
  });
}

/** Fetch member email + name from Supabase by Stripe customer ID. */
async function getMemberByCustomerId(
  customerId: string
): Promise<{ email: string; name: string | null; subscription_tier: SubscriptionTier | null } | null> {
  const supabase = getAdminClient();
  const { data } = await supabase
    .from("member")
    .select("email, name, subscription_tier")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  return data ?? null;
}

/** Fetch just the member UUID by Stripe customer ID. */
async function getMemberIdByCustomerId(customerId: string): Promise<string | null> {
  const supabase = getAdminClient();
  const { data } = await supabase
    .from("member")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

export async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const supabase = getAdminClient();
  const customerId =
    typeof invoice.customer === "string" ? invoice.customer : null;

  if (!customerId) {
    console.warn("[Stripe] invoice.payment_failed — no customer ID found.");
    return;
  }

  const { error } = await supabase
    .from("member")
    .update({ subscription_status: "past_due" })
    .eq("stripe_customer_id", customerId);

  if (error) {
    throw new Error(
      `Failed to mark past_due for customer ${customerId}: ${error.message}`
    );
  }

  console.log(`[Stripe] Payment failed — customer marked past_due: ${customerId}`);
  await recordInvoicePaymentFailed(invoice);

  runAfterSubscription(`payment failed syncs for ${invoice.id}`, async () => {
    const memberId = await getMemberIdByCustomerId(customerId);
    try {
      await trackServerEvent({
        name: "payment_failed",
        clientSeed: customerId,
        userId: memberId,
        params: {
          currency: invoice.currency?.toUpperCase() ?? "USD",
          value: (invoice.amount_due ?? 0) / 100,
          invoice_id: invoice.id,
          subscription_status: "past_due",
        },
      });
    } catch (analyticsError) {
      console.error(
        `[GA4] Failed to track payment failure for customer ${customerId}: ` +
          `${analyticsError instanceof Error ? analyticsError.message : String(analyticsError)}`
      );
    }

    try {
      const member = await getMemberByCustomerId(customerId);
      if (member?.email) {
        let billingLink: string | undefined;
        try {
          const token = generateBillingToken({ stripeCustomerId: customerId, email: member.email });
          const tokenUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://positives.life"}/account/billing?token=${token}`;
          billingLink = tokenUrl;
        } catch (tokenErr) {
          console.error("[Stripe] Failed to generate billing token (using fallback URL):", tokenErr);
        }

        await syncPaymentFailed({ email: member.email, billingLink });
      }
    } catch (emailErr) {
      console.error("[Stripe] Failed to sync payment-failed state (non-fatal):", emailErr);
    }
  });
}

export async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId =
    typeof invoice.customer === "string" ? invoice.customer : null;

  if (!customerId) {
    console.warn("[Stripe] invoice.payment_succeeded — no customer ID found.");
    return;
  }

  await recordInvoicePaymentSucceeded(invoice);

  runAfterSubscription(`payment succeeded syncs for ${invoice.id}`, async () => {
    try {
      const member = await getMemberByCustomerId(customerId);
      if (member?.email && invoice.amount_paid > 0) {
        const amountPaid = `$${(invoice.amount_paid / 100).toFixed(2)}`;
        const invoiceNumber = invoice.number ?? invoice.id;
        const nextBillingDate = invoice.lines.data[0]?.period?.end
          ? new Date(invoice.lines.data[0].period.end * 1000).toLocaleDateString("en-US", {
              month: "long", day: "numeric", year: "numeric",
            })
          : undefined;
        const invoiceUrl = invoice.invoice_pdf ?? undefined;

        await syncPaymentSucceeded({
          email: member.email,
          amountPaid,
          invoiceNumber,
          invoiceUrl,
          nextBillingDate,
        });
      }
    } catch (emailErr) {
      console.error("[Stripe] Failed to sync receipt fields (non-fatal):", emailErr);
    }

    try {
      const recoveredMember = await getMemberByCustomerId(customerId);
      if (recoveredMember?.email) {
        await syncPaymentRecovered({ email: recoveredMember.email });
      }
    } catch (syncError) {
      console.error("[Stripe] Failed to sync payment recovered state (non-fatal):", syncError);
    }
  });
}

export async function handleTrialWillEnd(subscription: Stripe.Subscription) {
  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : null;

  if (!customerId) {
    console.warn("[Stripe] customer.subscription.trial_will_end — no customer ID found.");
    return;
  }

  const member = await getMemberByCustomerId(customerId);
  if (!member?.email) {
    console.warn(
      `[Stripe] customer.subscription.trial_will_end — no member email for customer ${customerId}.`
    );
    return;
  }

  const trialEndDate = subscription.trial_end
    ? new Date(subscription.trial_end * 1000).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : undefined;

  runAfterSubscription(`trial ending sync for ${subscription.id}`, async () => {
    try {
      await syncTrialEnding({
        email: member.email,
        trialEndDate,
      });
    } catch (error) {
      console.error(
        `[Stripe] Failed to sync trial-ending state for customer ${customerId}:`,
        error,
      );
    }
  });
}
