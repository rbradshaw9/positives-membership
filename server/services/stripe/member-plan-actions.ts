import type Stripe from "stripe";
import { config } from "@/lib/config";
import { getSubscriptionAnalyticsFromPriceId } from "@/lib/analytics/subscription";
import { getStripe } from "@/lib/stripe/config";
import { isStripeResourceMissingError } from "@/lib/stripe/errors";
import type { Enums } from "@/types/supabase";

type FailResult = {
  ok: false;
  reason: "no_subscription" | "customer_missing" | "same_plan" | "stripe_error";
  message: string;
};
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
    expand: ["data.schedule"],
  });
  return (
    list.data.find((s) =>
      ["active", "trialing", "past_due"].includes(s.status)
    ) ?? null
  );
}

function getPrimarySubscriptionItem(subscription: Stripe.Subscription) {
  return subscription.items.data[0] ?? null;
}

function getLevel1TargetPriceId(currentPriceId: string | null | undefined) {
  const current = getSubscriptionAnalyticsFromPriceId(currentPriceId);
  if (current.billing_interval === "annual" && config.stripe.prices.level1Annual) {
    return config.stripe.prices.level1Annual;
  }

  return config.stripe.prices.level1Monthly;
}

function retentionCouponId(tier: Enums<"subscription_tier"> | null | undefined): string {
  return tier && tier !== "level_1"
    ? "RETENTION_50PCT_L2PLUS"
    : "RETENTION_1MO_FREE";
}

const WINBACK_COUPON_ID = "WINBACK_50PCT_ONCE";
const WINBACK_PROMOTION_CODE = "COMEBACK50";

async function ensureWinbackPromotionCode(): Promise<string> {
  const stripe = getStripe();

  try {
    await stripe.coupons.retrieve(WINBACK_COUPON_ID);
  } catch (error) {
    if (!isStripeResourceMissingError(error)) throw error;
    await stripe.coupons.create({
      id: WINBACK_COUPON_ID,
      name: "Come back to Positives - 50% off",
      percent_off: 50,
      duration: "once",
    });
  }

  const existing = await stripe.promotionCodes.list({
    code: WINBACK_PROMOTION_CODE,
    active: true,
    limit: 1,
  });

  if (existing.data[0]) {
    return existing.data[0].code ?? WINBACK_PROMOTION_CODE;
  }

  const promotionCode = await stripe.promotionCodes.create({
    promotion: { type: "coupon", coupon: WINBACK_COUPON_ID },
    code: WINBACK_PROMOTION_CODE,
    active: true,
    metadata: {
      source: "member_cancellation_winback",
    },
  });

  return promotionCode.code ?? WINBACK_PROMOTION_CODE;
}

/**
 * Applies a tier-appropriate retention coupon to the member's active subscription.
 * L1 → 1 month free. L2+ → 50% off next month.
 * Called when a member accepts the retention offer on the cancel page.
 */
export async function applyRetentionCoupon(
  stripeCustomerId: string,
  subscriptionTier: Enums<"subscription_tier"> | null | undefined
): Promise<ActionResult<{ couponId: string }>> {
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

    return { ok: true, couponId: coupon };
  } catch (error) {
    if (isStripeResourceMissingError(error)) {
      return { ok: false, reason: "customer_missing", message: "Stripe customer not found." };
    }
    const message = error instanceof Error ? error.message : "Stripe error";
    return { ok: false, reason: "stripe_error", message };
  }
}

/**
 * Schedules a Plus member down to Positives at the next renewal. Downgrades are
 * never immediate so members keep paid Plus access through the period they
 * already bought.
 */
export async function applyMemberDowngradeToLevel1(
  stripeCustomerId: string,
  options: { includeFreeMonth?: boolean } = {}
): Promise<ActionResult<{ effectiveLabel: string; targetPriceId: string; offerApplied: boolean }>> {
  const stripe = getStripe();

  try {
    const subscription = await getActiveSubscription(stripeCustomerId);
    if (!subscription) {
      return { ok: false, reason: "no_subscription", message: "No active subscription found." };
    }

    if (subscription.schedule) {
      return {
        ok: false,
        reason: "stripe_error",
        message: "This subscription already has a scheduled change. Review billing before adding another change.",
      };
    }

    const item = getPrimarySubscriptionItem(subscription);
    if (!item?.price?.id) {
      return {
        ok: false,
        reason: "stripe_error",
        message: "Subscription has no supported plan item.",
      };
    }

    const current = getSubscriptionAnalyticsFromPriceId(item.price.id);
    if (current.plan_level === "level_1") {
      return {
        ok: false,
        reason: "same_plan",
        message: "This membership is already on Positives.",
      };
    }

    const targetPriceId = getLevel1TargetPriceId(item.price.id);
    if (!targetPriceId) {
      return {
        ok: false,
        reason: "stripe_error",
        message: "The Positives plan price is not configured.",
      };
    }

    const metadata = {
      member_self_service_change: "downgrade",
      target_price_id: targetPriceId,
      retention_offer: options.includeFreeMonth ? "level_1_free_month" : "none",
    };
    const schedule = await stripe.subscriptionSchedules.create({
      from_subscription: subscription.id,
    });
    const nextPhase: Stripe.SubscriptionScheduleUpdateParams.Phase = {
      start_date: item.current_period_end,
      items: [{
        price: targetPriceId,
        quantity: item.quantity ?? 1,
      }],
      proration_behavior: "none",
      metadata,
    };

    if (options.includeFreeMonth) {
      nextPhase.discounts = [{ coupon: "RETENTION_1MO_FREE" }];
    }

    await stripe.subscriptionSchedules.update(schedule.id, {
      metadata,
      end_behavior: "release",
      proration_behavior: "none",
      phases: [
        {
          start_date: item.current_period_start,
          end_date: item.current_period_end,
          items: [{
            price: item.price.id,
            quantity: item.quantity ?? 1,
          }],
        },
        nextPhase,
      ],
    });

    return {
      ok: true,
      effectiveLabel: formatPeriodEnd(item.current_period_end),
      targetPriceId,
      offerApplied: options.includeFreeMonth === true,
    };
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
): Promise<ActionResult<{ periodEndLabel: string; winbackCode: string }>> {
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
    let winbackCode = WINBACK_PROMOTION_CODE;
    try {
      winbackCode = await ensureWinbackPromotionCode();
    } catch (error) {
      console.error("[Stripe] Failed to ensure winback promotion code:", error);
    }
    return { ok: true, periodEndLabel: formatPeriodEnd(periodEnd), winbackCode };
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
