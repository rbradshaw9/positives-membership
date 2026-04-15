import type Stripe from "stripe";
import { comparePlanLevels, getSubscriptionAnalyticsFromPriceId } from "@/lib/analytics/subscription";
import { config } from "@/lib/config";
import { getPlanName } from "@/lib/plans";
import { getStripe } from "@/lib/stripe/config";

export type AdminPlanChangeTargetKey =
  | "level_1_monthly"
  | "level_2_monthly"
  | "level_3_monthly"
  | "level_1_annual"
  | "level_2_annual"
  | "level_3_annual";

export type AdminPlanChangeKind = "upgrade" | "scheduled_change" | "same_plan";

export type AdminPlanChangeOption = {
  key: AdminPlanChangeTargetKey;
  priceId: string;
  tier: "level_1" | "level_2" | "level_3";
  interval: "monthly" | "annual";
  label: string;
};

export type AdminPlanChangePreview = {
  ok: true;
  targetKey: AdminPlanChangeTargetKey;
  subscriptionId: string;
  subscriptionItemId: string;
  currentPriceId: string;
  targetPriceId: string;
  currentPlanName: string;
  targetPlanName: string;
  kind: AdminPlanChangeKind;
  amountDueCents: number;
  currency: string;
  prorationDate: number;
  nextBillingAt: number;
  nextBillingLabel: string;
  effectiveLabel: string;
  message: string;
} | {
  ok: false;
  targetKey?: AdminPlanChangeTargetKey;
  error: string;
};

export function getAdminPlanChangeOptions(): AdminPlanChangeOption[] {
  const priceConfig = config.stripe.prices;
  const candidates: Array<AdminPlanChangeOption | null> = [
    priceConfig.level1Monthly ? {
      key: "level_1_monthly",
      priceId: priceConfig.level1Monthly,
      tier: "level_1",
      interval: "monthly",
      label: `${getPlanName("level_1")} monthly`,
    } : null,
    priceConfig.level2Monthly ? {
      key: "level_2_monthly",
      priceId: priceConfig.level2Monthly,
      tier: "level_2",
      interval: "monthly",
      label: `${getPlanName("level_2")} monthly`,
    } : null,
    priceConfig.level3Monthly ? {
      key: "level_3_monthly",
      priceId: priceConfig.level3Monthly,
      tier: "level_3",
      interval: "monthly",
      label: `${getPlanName("level_3")} monthly`,
    } : null,
    priceConfig.level1Annual ? {
      key: "level_1_annual",
      priceId: priceConfig.level1Annual,
      tier: "level_1",
      interval: "annual",
      label: `${getPlanName("level_1")} annual`,
    } : null,
    priceConfig.level2Annual ? {
      key: "level_2_annual",
      priceId: priceConfig.level2Annual,
      tier: "level_2",
      interval: "annual",
      label: `${getPlanName("level_2")} annual`,
    } : null,
    priceConfig.level3Annual ? {
      key: "level_3_annual",
      priceId: priceConfig.level3Annual,
      tier: "level_3",
      interval: "annual",
      label: `${getPlanName("level_3")} annual`,
    } : null,
  ];

  return candidates.filter(Boolean) as AdminPlanChangeOption[];
}

function getTargetOption(targetKey: string | null | undefined) {
  return getAdminPlanChangeOptions().find((option) => option.key === targetKey);
}

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(timestamp * 1000));
}

function formatPlanLabel(priceId: string | null | undefined) {
  const details = getSubscriptionAnalyticsFromPriceId(priceId);
  if (!details.plan_level) return priceId ? "Unknown Stripe plan" : "No current plan";
  const suffix = details.billing_interval === "annual" ? " annual" : " monthly";
  return `${getPlanName(details.plan_level)}${suffix}`;
}

function getCustomerId(customer: string | Stripe.Customer | Stripe.DeletedCustomer | null) {
  if (!customer) return null;
  return typeof customer === "string" ? customer : customer.id;
}

async function getActiveSubscription(stripeCustomerId: string) {
  const stripe = getStripe();
  const subscriptions = await stripe.subscriptions.list({
    customer: stripeCustomerId,
    status: "all",
    limit: 10,
    expand: ["data.schedule"],
  });

  return subscriptions.data.find((subscription) =>
    ["active", "trialing", "past_due", "unpaid"].includes(subscription.status)
  ) ?? null;
}

function getPrimarySubscriptionItem(subscription: Stripe.Subscription) {
  return subscription.items.data[0] ?? null;
}

function getChangeKind(currentPriceId: string, target: AdminPlanChangeOption): AdminPlanChangeKind {
  const current = getSubscriptionAnalyticsFromPriceId(currentPriceId);
  if (current.price_id === target.priceId) return "same_plan";
  const tierDelta = comparePlanLevels(current.plan_level, target.tier);
  return tierDelta > 0 ? "upgrade" : "scheduled_change";
}

export async function getAdminPlanChangePreview(params: {
  stripeCustomerId: string | null | undefined;
  targetKey: string | null | undefined;
}): Promise<AdminPlanChangePreview> {
  const target = getTargetOption(params.targetKey);
  if (!target) return { ok: false, error: "Choose a configured target plan." };
  if (!params.stripeCustomerId) {
    return { ok: false, targetKey: target.key, error: "This member does not have a Stripe customer linked." };
  }

  const stripe = getStripe();
  const subscription = await getActiveSubscription(params.stripeCustomerId);
  if (!subscription) {
    return { ok: false, targetKey: target.key, error: "No active Stripe subscription was found for this customer." };
  }

  const item = getPrimarySubscriptionItem(subscription);
  if (!item?.id || !item.price?.id) {
    return { ok: false, targetKey: target.key, error: "This subscription does not have a supported primary price item." };
  }

  const currentPriceId = item.price.id;
  const prorationDate = Math.floor(Date.now() / 1000);
  const nextBillingAt = item.current_period_end;
  const kind = getChangeKind(currentPriceId, target);
  let amountDueCents = 0;
  let currency = item.price.currency ?? "usd";

  if (kind === "upgrade") {
    const invoice = await stripe.invoices.createPreview({
      customer: params.stripeCustomerId,
      subscription: subscription.id,
      subscription_details: {
        items: [{
          id: item.id,
          price: target.priceId,
          quantity: item.quantity ?? 1,
        }],
        proration_behavior: "always_invoice",
        proration_date: prorationDate,
      },
    });

    amountDueCents = invoice.amount_due ?? invoice.total ?? 0;
    currency = invoice.currency ?? currency;
  }

  const currentPlanName = formatPlanLabel(currentPriceId);
  const targetPlanName = target.label;
  const nextBillingLabel = formatDate(nextBillingAt);
  const effectiveLabel = kind === "upgrade" ? "Immediately after confirmation" : nextBillingLabel;

  return {
    ok: true,
    targetKey: target.key,
    subscriptionId: subscription.id,
    subscriptionItemId: item.id,
    currentPriceId,
    targetPriceId: target.priceId,
    currentPlanName,
    targetPlanName,
    kind,
    amountDueCents,
    currency,
    prorationDate,
    nextBillingAt,
    nextBillingLabel,
    effectiveLabel,
    message:
      kind === "same_plan"
        ? "This member is already on that plan."
        : kind === "upgrade"
          ? "Stripe will apply this upgrade now and attempt to collect the prorated amount immediately."
          : "Stripe will schedule this change for the next billing date. There is no immediate charge.",
  };
}

export async function applyAdminPlanChange(params: {
  memberId: string;
  actorId: string;
  stripeCustomerId: string | null | undefined;
  targetKey: string | null | undefined;
  reason: string;
}) {
  const preview = await getAdminPlanChangePreview({
    stripeCustomerId: params.stripeCustomerId,
    targetKey: params.targetKey,
  });

  if (!preview.ok) return preview;
  if (preview.kind === "same_plan") {
    return { ok: false as const, targetKey: preview.targetKey, error: "The member is already on this plan." };
  }

  const stripe = getStripe();
  const metadata = {
    member_id: params.memberId,
    actor_member_id: params.actorId,
    admin_change_reason: params.reason.slice(0, 500),
    admin_plan_change: "true",
    target_price_id: preview.targetPriceId,
  };

  if (preview.kind === "upgrade") {
    await stripe.subscriptions.update(preview.subscriptionId, {
      items: [{
        id: preview.subscriptionItemId,
        price: preview.targetPriceId,
      }],
      payment_behavior: "allow_incomplete",
      proration_behavior: "always_invoice",
      proration_date: preview.prorationDate,
      metadata,
    });

    return preview;
  }

  const subscription = await stripe.subscriptions.retrieve(preview.subscriptionId, {
    expand: ["schedule"],
  });
  const customerId = getCustomerId(subscription.customer);
  const item = getPrimarySubscriptionItem(subscription);
  if (!customerId || !item?.price?.id) {
    return {
      ok: false as const,
      targetKey: preview.targetKey,
      error: "Could not safely schedule this subscription change.",
    };
  }

  if (subscription.schedule) {
    return {
      ok: false as const,
      targetKey: preview.targetKey,
      error: "This subscription already has a scheduled change. Review it in Stripe before replacing it.",
    };
  }

  const schedule = await stripe.subscriptionSchedules.create({
    from_subscription: subscription.id,
  });

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
      {
        start_date: item.current_period_end,
        items: [{
          price: preview.targetPriceId,
          quantity: item.quantity ?? 1,
        }],
        proration_behavior: "none",
        metadata,
      },
    ],
  });

  return preview;
}
