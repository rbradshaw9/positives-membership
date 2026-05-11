import Stripe from "stripe";
import { unstable_cache } from "next/cache";
import {
  comparePlanLevels,
  getSubscriptionAnalyticsFromPriceId,
} from "@/lib/analytics/subscription";
import { getPositivesPlanName } from "@/lib/plans";
import { getStripe } from "@/lib/stripe/config";
import { isStripeResourceMissingError } from "@/lib/stripe/errors";
import {
  getMemberRecentStripeInvoices,
  type MemberStripeInvoiceActivity,
} from "@/server/services/stripe/member-billing-activity";
import type { ScheduledBillingChange } from "@/server/services/stripe/get-scheduled-billing-change";

type BillingChangeKind = ScheduledBillingChange["kind"];

export interface AccountBillingSummary {
  scheduledBillingChange: ScheduledBillingChange | null;
  nextRenewalDate: string | null;
  billingPortalAvailable: boolean;
  currentSubscription: AccountSubscriptionSnapshot | null;
  recentInvoices: MemberStripeInvoiceActivity[];
  invoiceLoadFailed: boolean;
}

export interface AccountSubscriptionSnapshot {
  id: string;
  status: string;
  planName: string | null;
  amountLabel: string | null;
  intervalLabel: string | null;
  currentPeriodEndLabel: string | null;
  cancelAtPeriodEnd: boolean;
  cancelAtLabel: string | null;
}

const BILLING_SUMMARY_CACHE_SECONDS = 60 * 5;

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(timestamp * 1000));
}

function formatMoney(amountCents: number | null | undefined, currency = "usd") {
  if (typeof amountCents !== "number") return null;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);
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

function getScheduledChangeFromSubscription(
  subscription: Stripe.Subscription
): ScheduledBillingChange | null {
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
    effectiveLabel: formatDate(nextPhase.start_date),
    kind: getBillingChangeKind(currentPriceId, nextPriceId),
  };
}

function getSubscriptionSnapshot(
  subscription: Stripe.Subscription | null | undefined
): AccountSubscriptionSnapshot | null {
  if (!subscription) return null;

  const item = subscription.items.data[0];
  const price = item?.price ?? null;
  const analytics = getSubscriptionAnalyticsFromPriceId(price?.id ?? null);
  const interval = price?.recurring?.interval ?? null;
  const amount = formatMoney(price?.unit_amount ?? null, price?.currency ?? subscription.currency ?? "usd");
  const planName = analytics.plan_level ? getPositivesPlanName(analytics.plan_level) : null;

  return {
    id: subscription.id,
    status: subscription.status,
    planName: planName
      ? analytics.billing_interval === "annual"
        ? `${planName} (annual)`
        : analytics.billing_interval === "three_pay"
          ? `${planName} (3-pay)`
          : planName
      : null,
    amountLabel: amount,
    intervalLabel: interval ? `/${interval}` : null,
    currentPeriodEndLabel: item?.current_period_end ? formatDate(item.current_period_end) : null,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    cancelAtLabel: subscription.cancel_at ? formatDate(subscription.cancel_at) : null,
  };
}

async function fetchAccountBillingSummaryFromStripe(
  stripeCustomerId: string
): Promise<AccountBillingSummary> {
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
    let recentInvoices: MemberStripeInvoiceActivity[] = [];
    let invoiceLoadFailed = false;

    try {
      recentInvoices = await getMemberRecentStripeInvoices(stripeCustomerId, 6);
    } catch (invoiceError) {
      invoiceLoadFailed = true;
      console.error("[account] Failed to load recent invoices:", invoiceError);
    }

    if (!subscription) {
      return {
        scheduledBillingChange: null,
        nextRenewalDate: null,
        billingPortalAvailable: true,
        currentSubscription: null,
        recentInvoices,
        invoiceLoadFailed,
      };
    }

    const renewalAt = subscription.items.data[0]?.current_period_end ?? null;

    return {
      scheduledBillingChange: getScheduledChangeFromSubscription(subscription),
      nextRenewalDate: renewalAt ? formatDate(renewalAt) : null,
      billingPortalAvailable: true,
      currentSubscription: getSubscriptionSnapshot(subscription),
      recentInvoices,
      invoiceLoadFailed,
    };
  } catch (error) {
    if (isStripeResourceMissingError(error)) {
      console.warn(
        `[account] Stripe customer ${stripeCustomerId} is missing; skipping billing summary.`
      );
      return {
        scheduledBillingChange: null,
        nextRenewalDate: null,
        billingPortalAvailable: false,
        currentSubscription: null,
        recentInvoices: [],
        invoiceLoadFailed: false,
      };
    }

    console.error("[account] Failed to load account billing summary:", error);
    return {
      scheduledBillingChange: null,
      nextRenewalDate: null,
      billingPortalAvailable: false,
      currentSubscription: null,
      recentInvoices: [],
      invoiceLoadFailed: true,
    };
  }
}

export async function getAccountBillingSummary(
  stripeCustomerId: string | null | undefined
): Promise<AccountBillingSummary> {
  if (!stripeCustomerId) {
    return {
      scheduledBillingChange: null,
      nextRenewalDate: null,
      billingPortalAvailable: false,
      currentSubscription: null,
      recentInvoices: [],
      invoiceLoadFailed: false,
    };
  }

  return unstable_cache(
    () => fetchAccountBillingSummaryFromStripe(stripeCustomerId),
    ["account-billing-summary", stripeCustomerId],
    {
      tags: [`account-billing-summary-${stripeCustomerId}`],
      revalidate: BILLING_SUMMARY_CACHE_SECONDS,
    }
  )();
}
