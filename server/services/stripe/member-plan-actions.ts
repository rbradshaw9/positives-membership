import { config } from "@/lib/config";
import { getStripe } from "@/lib/stripe/config";
import { isStripeResourceMissingError } from "@/lib/stripe/errors";
import type { Enums } from "@/types/supabase";

type FailResult = { ok: false; reason: "no_subscription" | "customer_missing" | "stripe_error"; message: string };
type ActionResult<T extends object = object> = ({ ok: true } & T) | FailResult;

function formatPeriodEnd(timestamp: number): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(timestamp * 1000));
}

async function getActiveSubscription(stripeCustomerId: string) {
  const stripe = getStripe();
  const list = await stripe.subscriptions.list({
    customer: stripeCustomerId,
    status: "all",
    limit: 10,
  });
  return (
    list.data.find((s) =>
      ["active", "trialing", "past_due"].includes(s.status)
    ) ?? null
  );
}

function retentionCouponId(tier: Enums<"subscription_tier"> | null | undefined): string {
  return tier && tier !== "level_1"
    ? "RETENTION_50PCT_L2PLUS"
    : "RETENTION_1MO_FREE";
}

/**
 * Applies a tier-appropriate retention coupon to the member's active subscription.
 * L1 → 1 month free. L2+ → 50% off next month.
 * Called when a member accepts the retention offer on the cancel page.
 */
export async function applyRetentionCoupon(
  stripeCustomerId: string,
  subscriptionTier: Enums<"subscription_tier"> | null | undefined
): Promise<{ ok: true } | FailResult> {
  const stripe = getStripe();

  try {
    const subscription = await getActiveSubscription(stripeCustomerId);
    if (!subscription) {
      return { ok: false, reason: "no_subscription", message: "No active subscription found." };
    }

    const coupon = retentionCouponId(subscriptionTier);
    await stripe.subscriptions.update(subscription.id, {
      discounts: [{ coupon }],
    });

    return { ok: true };
  } catch (error) {
    if (isStripeResourceMissingError(error)) {
      return { ok: false, reason: "customer_missing", message: "Stripe customer not found." };
    }
    const message = error instanceof Error ? error.message : "Stripe error";
    return { ok: false, reason: "stripe_error", message };
  }
}

/**
 * Sets cancel_at_period_end = true on the member's active subscription.
 * Access continues until the current billing period ends.
 * Returns the formatted period end date for display.
 */
export async function cancelSubscriptionAtPeriodEnd(
  stripeCustomerId: string
): Promise<ActionResult<{ periodEndLabel: string }>> {
  const stripe = getStripe();

  try {
    const subscription = await getActiveSubscription(stripeCustomerId);
    if (!subscription) {
      return { ok: false, reason: "no_subscription", message: "No active subscription found." };
    }

    await stripe.subscriptions.update(subscription.id, {
      cancel_at_period_end: true,
    });

    // current_period_end lives on the subscription item in Stripe API v21+
    const periodEnd = subscription.items.data[0]?.current_period_end ?? 0;
    return { ok: true, periodEndLabel: formatPeriodEnd(periodEnd) };
  } catch (error) {
    if (isStripeResourceMissingError(error)) {
      return { ok: false, reason: "customer_missing", message: "Stripe customer not found." };
    }
    const message = error instanceof Error ? error.message : "Stripe error";
    return { ok: false, reason: "stripe_error", message };
  }
}

/**
 * Upgrades a member from L1 to L2 monthly immediately with proration.
 * Stripe will invoice the prorated difference right away.
 */
export async function applyMemberUpgrade(
  stripeCustomerId: string
): Promise<{ ok: true } | FailResult> {
  const targetPriceId = config.stripe.prices.level2Monthly;
  if (!targetPriceId) {
    return { ok: false, reason: "stripe_error", message: "L2 price is not configured." };
  }

  const stripe = getStripe();

  try {
    const subscription = await getActiveSubscription(stripeCustomerId);
    if (!subscription) {
      return { ok: false, reason: "no_subscription", message: "No active subscription found." };
    }

    const item = subscription.items.data[0];
    if (!item) {
      return { ok: false, reason: "stripe_error", message: "Subscription has no items." };
    }

    await stripe.subscriptions.update(subscription.id, {
      items: [{ id: item.id, price: targetPriceId }],
      payment_behavior: "allow_incomplete",
      proration_behavior: "always_invoice",
      proration_date: Math.floor(Date.now() / 1000),
    });

    return { ok: true };
  } catch (error) {
    if (isStripeResourceMissingError(error)) {
      return { ok: false, reason: "customer_missing", message: "Stripe customer not found." };
    }
    const message = error instanceof Error ? error.message : "Stripe error";
    return { ok: false, reason: "stripe_error", message };
  }
}
