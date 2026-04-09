import { config } from "@/lib/config";

export type BillingInterval = "monthly" | "annual" | "three_pay";
export type PlanLevel = "level_1" | "level_2" | "level_3" | "level_4";

interface PriceAnalyticsDetails {
  billingInterval: BillingInterval;
  planLevel: PlanLevel;
}

type StripePrices = typeof config.stripe.prices;

function buildPriceMap(prices: StripePrices): Record<string, PriceAnalyticsDetails> {
  const map: Record<string, PriceAnalyticsDetails> = {};

  if (prices.level1Monthly) map[prices.level1Monthly] = { planLevel: "level_1", billingInterval: "monthly" };
  if (prices.level1Annual) map[prices.level1Annual] = { planLevel: "level_1", billingInterval: "annual" };
  if (prices.level2Monthly) map[prices.level2Monthly] = { planLevel: "level_2", billingInterval: "monthly" };
  if (prices.level2Annual) map[prices.level2Annual] = { planLevel: "level_2", billingInterval: "annual" };
  if (prices.level3Monthly) map[prices.level3Monthly] = { planLevel: "level_3", billingInterval: "monthly" };
  if (prices.level3Annual) map[prices.level3Annual] = { planLevel: "level_3", billingInterval: "annual" };
  if (prices.level4ThreePay) map[prices.level4ThreePay] = { planLevel: "level_4", billingInterval: "three_pay" };

  return map;
}

export function getSubscriptionAnalyticsFromPriceId(priceId: string | null | undefined) {
  if (!priceId) {
    return {};
  }

  const details = buildPriceMap(config.stripe.prices)[priceId];
  if (!details) {
    return { price_id: priceId };
  }

  return {
    price_id: priceId,
    plan_level: details.planLevel,
    billing_interval: details.billingInterval,
  };
}

export function comparePlanLevels(
  previousTier: string | null | undefined,
  nextTier: string | null | undefined
) {
  const order: Record<string, number> = {
    level_1: 1,
    level_2: 2,
    level_3: 3,
    level_4: 4,
  };

  return (order[nextTier ?? ""] ?? 0) - (order[previousTier ?? ""] ?? 0);
}
