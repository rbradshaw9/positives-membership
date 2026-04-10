import Stripe from "stripe";
import { getSubscriptionAnalyticsFromPriceId, comparePlanLevels } from "@/lib/analytics/subscription";
import { getPositivesPlanName } from "@/lib/plans";
import { getStripe } from "@/lib/stripe/config";

type BillingChangeKind = "upgrade" | "downgrade" | "billing_change" | "change";

export interface ScheduledBillingChange {
  currentPlanName: string;
  nextPlanName: string;
  effectiveAt: number;
  effectiveLabel: string;
  kind: BillingChangeKind;
}

function getPriceIdFromPhase(
  phase: Stripe.SubscriptionSchedule.Phase | undefined
): string | null {
  const price = phase?.items?.[0]?.price;

  if (!price) return null;
  if (typeof price === "string") return price;
  return price.id ?? null;
}

function getPlanLabelFromPriceId(priceId: string | null): string | null {
  if (!priceId) return null;

  const details = getSubscriptionAnalyticsFromPriceId(priceId);
  if (!details.plan_level) return null;

  const planName = getPositivesPlanName(details.plan_level);

  switch (details.billing_interval) {
    case "annual":
      return `${planName} (annual)`;
    case "three_pay":
      return `${planName} (3-pay)`;
    default:
      return planName;
  }
}

function getBillingChangeKind(
  currentPriceId: string | null,
  nextPriceId: string | null
): BillingChangeKind {
  const current = getSubscriptionAnalyticsFromPriceId(currentPriceId);
  const next = getSubscriptionAnalyticsFromPriceId(nextPriceId);

  if (current.plan_level && next.plan_level) {
    const delta = comparePlanLevels(current.plan_level, next.plan_level);
    if (delta > 0) return "upgrade";
    if (delta < 0) return "downgrade";
  }

  if (
    current.billing_interval &&
    next.billing_interval &&
    current.billing_interval !== next.billing_interval
  ) {
    return "billing_change";
  }

  return "change";
}

export async function getScheduledBillingChange(
  stripeCustomerId: string | null | undefined
): Promise<ScheduledBillingChange | null> {
  if (!stripeCustomerId) return null;

  try {
    const stripe = getStripe();
    const subscriptions = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      status: "all",
      limit: 10,
      expand: ["data.schedule"],
    });

    const subscription = subscriptions.data.find((item) =>
      ["active", "trialing", "past_due", "unpaid", "paused"].includes(item.status)
    );

    if (!subscription) return null;

    const schedule =
      subscription.schedule && typeof subscription.schedule !== "string"
        ? subscription.schedule
        : null;

    if (!schedule || schedule.status !== "active" || schedule.phases.length < 2) {
      return null;
    }

    const now = Math.floor(Date.now() / 1000);
    const currentPhaseIndex = schedule.phases.findIndex(
      (phase) =>
        phase.start_date <= now &&
        (phase.end_date === null || phase.end_date === undefined || phase.end_date > now)
    );

    const currentPhase =
      currentPhaseIndex >= 0 ? schedule.phases[currentPhaseIndex] : undefined;
    const nextPhase =
      currentPhaseIndex >= 0
        ? schedule.phases[currentPhaseIndex + 1]
        : schedule.phases.find((phase) => phase.start_date > now);

    if (!nextPhase) return null;

    const subscriptionPriceId = subscription.items.data[0]?.price?.id ?? null;
    const currentPriceId = getPriceIdFromPhase(currentPhase) ?? subscriptionPriceId;
    const nextPriceId = getPriceIdFromPhase(nextPhase);

    if (!currentPriceId || !nextPriceId || currentPriceId === nextPriceId) {
      return null;
    }

    const currentPlanName = getPlanLabelFromPriceId(currentPriceId);
    const nextPlanName = getPlanLabelFromPriceId(nextPriceId);

    if (!currentPlanName || !nextPlanName) {
      return null;
    }

    return {
      currentPlanName,
      nextPlanName,
      effectiveAt: nextPhase.start_date,
      effectiveLabel: new Intl.DateTimeFormat("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }).format(new Date(nextPhase.start_date * 1000)),
      kind: getBillingChangeKind(currentPriceId, nextPriceId),
    };
  } catch (error) {
    console.error("[account] Failed to load scheduled billing change:", error);
    return null;
  }
}
