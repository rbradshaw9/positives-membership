import type Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import type { SubscriptionStatus, SubscriptionTier } from "@/types/supabase";

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
 * TODO (production):
 * - Map Stripe Price IDs to subscription tiers (level_1–level_4)
 * - Handle subscription trial states
 * - Trigger ActiveCampaign tag updates on status change
 * - Trigger Castos feed access update on status change
 */

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  // Service role client — bypasses RLS. No generic: proper types come from
  // `supabase gen types typescript` once the project is connected.
  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

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
 * Map Stripe Price ID → Positives subscription tier
 * TODO: Replace with real Price IDs from Stripe dashboard.
 */
function mapTier(_priceId: string | null): SubscriptionTier {
  // Placeholder — wire up to real Stripe Price IDs
  // e.g. if (priceId === 'price_123') return 'level_1';
  return "level_1";
}

async function updateMemberSubscription(
  customerId: string,
  subscription: Stripe.Subscription
) {
  const supabase = getAdminClient();

  const priceId =
    subscription.items.data[0]?.price?.id ?? null;

  const status = mapStatus(subscription.status);
  const tier = mapTier(priceId);

  // current_period_end was removed in Stripe API 2026-03-25.dahlia.
  // Use cancel_at or ended_at as the effective subscription end date.
  // TODO: review when Stripe finalizes the billing period field naming in this API version.
  const periodEndTs = subscription.cancel_at ?? subscription.ended_at;
  const subscriptionEndDate = periodEndTs
    ? new Date(periodEndTs * 1000).toISOString()
    : null;

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
      `Failed to update member for customer ${customerId}: ${error.message}`
    );
  }

  console.log(
    `[Stripe] Member updated — customer: ${customerId}, status: ${status}, tier: ${tier}`
  );
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
}

export async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const supabase = getAdminClient();
  // invoice.customer is string | Stripe.Customer | Stripe.DeletedCustomer | null
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
}
