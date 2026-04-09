import type Stripe from "stripe";
import { getAdminClient } from "@/lib/supabase/admin";
import type { Enums } from "@/types/supabase";
import { config } from "@/lib/config";
import { resend, FROM_ADDRESS, REPLY_TO } from "@/lib/email/resend";
import { receiptEmailHtml, receiptEmailText } from "@/lib/email/templates/receipt";
import { paymentFailedEmailHtml, paymentFailedEmailText } from "@/lib/email/templates/payment-failed";
import { syncCancellation, syncPaymentFailed, syncPaymentRecovered, syncTierChange } from "@/lib/activecampaign/sync";
import { generateBillingToken } from "@/lib/auth/billing-token";
import { enrollInWinbackSequence } from "@/lib/winback/enroll";
import { enrollInPaymentRecoverySequence, cancelPaymentRecoverySequence } from "@/lib/payment-recovery/enroll";
import { trackServerEvent } from "@/lib/analytics/measurement-protocol";
import { comparePlanLevels, getSubscriptionAnalyticsFromPriceId } from "@/lib/analytics/subscription";

type SubscriptionStatus = Enums<"subscription_status">;
type SubscriptionTier = Enums<"subscription_tier">;


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

  const priceId =
    subscription.items.data[0]?.price?.id ?? null;

  const status = mapStatus(subscription.status);
  const tier = mapTier(priceId, subscription.metadata as Record<string, string>);

  // current_period_end was removed in Stripe API 2026-03-25.dahlia.
  // Use cancel_at or ended_at as the effective subscription end date.
  const periodEndTs = subscription.cancel_at ?? subscription.ended_at;
  const subscriptionEndDate = periodEndTs
    ? new Date(periodEndTs * 1000).toISOString()
    : null;

  // First verify the member row exists — a zero-row update is otherwise silent.
  const { data: existing, error: lookupError } = await supabase
    .from("member")
    .select("id, email, subscription_tier")
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

  // Non-fatal: sync tier change to ActiveCampaign
  if (existing.email) {
    await syncTierChange({
      email:   existing.email,
      oldTier: (existing.subscription_tier as SubscriptionTier) ?? null,
      newTier: tier,
    });
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
}

export async function handleSubscriptionCreated(
  subscription: Stripe.Subscription
) {
  const customerId = subscription.customer as string;
  await updateMemberSubscription(customerId, subscription);
}

export async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription
) {
  const customerId = subscription.customer as string;
  await updateMemberSubscription(customerId, subscription);
}

export async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription
) {
  const supabase = getAdminClient();
  const customerId = subscription.customer as string;

  const { data: canceledMember } = await supabase
    .from("member")
    .select("id, email")
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

  if (canceledMember?.email) {
    // Non-fatal: sync cancellation tag to ActiveCampaign
    await syncCancellation({ email: canceledMember.email, tier: null });
    // Non-fatal: enroll in win-back email sequence (Day 1, 14, 30)
    await enrollInWinbackSequence(canceledMember.id, canceledMember.email);
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
}

/** Fetch member email + name from Supabase by Stripe customer ID. */
async function getMemberByCustomerId(
  customerId: string
): Promise<{ email: string; name: string | null } | null> {
  const supabase = getAdminClient();
  const { data } = await supabase
    .from("member")
    .select("email, name")
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

  // Non-fatal: send payment-failed email (with signed 1-click billing link)
  try {
    const member = await getMemberByCustomerId(customerId);
    if (member?.email) {
      const firstName = member.name?.split(" ")[0] ?? "there";
      const amountDue = invoice.amount_due
        ? `$${(invoice.amount_due / 100).toFixed(2)}`
        : "your membership fee";
      const nextRetryDate = invoice.next_payment_attempt
        ? new Date(invoice.next_payment_attempt * 1000).toLocaleDateString("en-US", {
            month: "long", day: "numeric", year: "numeric",
          })
        : undefined;

      // Generate signed billing token for 1-click access (no login required)
      let updatePaymentUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://positives.life"}/account/billing`;
      let billingLink: string | undefined;
      try {
        const token = generateBillingToken({ stripeCustomerId: customerId, email: member.email });
        const tokenUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://positives.life"}/account/billing?token=${token}`;
        updatePaymentUrl = tokenUrl;
        billingLink = tokenUrl;
      } catch (tokenErr) {
        console.error("[Stripe] Failed to generate billing token (using fallback URL):", tokenErr);
      }

      await resend.emails.send(
        {
          from: FROM_ADDRESS,
          replyTo: REPLY_TO,
          to: member.email,
          subject: "Action needed — your Positives payment didn't go through",
          html: paymentFailedEmailHtml({ firstName, amountDue, updatePaymentUrl, nextRetryDate }),
          text: paymentFailedEmailText({ firstName, amountDue, updatePaymentUrl, nextRetryDate }),
        },
        { idempotencyKey: `payment-failed/${invoice.id}` },
      );
      console.log(`[Stripe] Payment-failed email sent to ${member.email}`);

      // Sync past_due tag + billing link to ActiveCampaign (CRM only — no AC emails)
      await syncPaymentFailed({ email: member.email, billingLink });

      // Enroll in Day 3 + Day 7 follow-up recovery sequence
      if (memberId) {
        await enrollInPaymentRecoverySequence(memberId, member.email);
      }
    }
  } catch (emailErr) {
    console.error("[Stripe] Failed to send payment-failed email (non-fatal):", emailErr);
  }
}

export async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId =
    typeof invoice.customer === "string" ? invoice.customer : null;

  if (!customerId) {
    console.warn("[Stripe] invoice.payment_succeeded — no customer ID found.");
    return;
  }

  // Non-fatal: send receipt email
  try {
    const member = await getMemberByCustomerId(customerId);
    if (member?.email && invoice.amount_paid > 0) {
      const firstName = member.name?.split(" ")[0] ?? "there";
      const amountPaid = `$${(invoice.amount_paid / 100).toFixed(2)}`;
      const billingDate = new Date(invoice.created * 1000).toLocaleDateString("en-US", {
        month: "long", day: "numeric", year: "numeric",
      });
      const description =
        invoice.lines.data[0]?.description ?? "Positives Membership";
      const invoiceNumber = invoice.number ?? invoice.id;
      const nextBillingDate = invoice.lines.data[0]?.period?.end
        ? new Date(invoice.lines.data[0].period.end * 1000).toLocaleDateString("en-US", {
            month: "long", day: "numeric", year: "numeric",
          })
        : undefined;
      const invoiceUrl = invoice.invoice_pdf ?? undefined;

      await resend.emails.send({
        from: FROM_ADDRESS,
        replyTo: REPLY_TO,
        to: member.email,
        subject: `Positives receipt — ${amountPaid}`,
        html: receiptEmailHtml({
          firstName, invoiceNumber, amountPaid, billingDate,
          description, nextBillingDate, invoiceUrl,
        }),
        text: receiptEmailText({
          firstName, invoiceNumber, amountPaid, billingDate,
          description, nextBillingDate, invoiceUrl,
        }),
      });
      console.log(`[Stripe] Receipt email sent to ${member.email} for invoice ${invoiceNumber}`);
    }
  } catch (emailErr) {
    console.error("[Stripe] Failed to send receipt email (non-fatal):", emailErr);
  }

  // Non-fatal: remove past_due tag in AC + cancel pending recovery emails
  const recoveredMember = await getMemberByCustomerId(customerId);
  if (recoveredMember?.email) {
    await syncPaymentRecovered({ email: recoveredMember.email });
  }
  const recoveredMemberId = await getMemberIdByCustomerId(customerId);
  if (recoveredMemberId) {
    await cancelPaymentRecoverySequence(recoveredMemberId);
  }
}
