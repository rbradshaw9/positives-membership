export type SubscriptionTier = "level_1" | "level_2" | "level_3" | "level_4";

export const PLAN_NAME_BY_TIER: Record<SubscriptionTier, string> = {
  level_1: "Positives",
  level_2: "Positives Plus",
  level_3: "Coaching Circle",   // legacy — no longer sold publicly
  level_4: "Executive Coaching", // legacy — no longer sold publicly
};

export const POSITIVES_PLAN_NAME_BY_TIER: Record<SubscriptionTier, string> = {
  level_1: "Positives",
  level_2: "Positives Plus",
  level_3: "Positives Coaching Circle",
  level_4: "Positives Executive Coaching",
};

export const ADMIN_PLAN_SHORT_LABEL_BY_TIER: Record<SubscriptionTier, string> = {
  level_1: "Basic",
  level_2: "Plus",
  level_3: "Coaching",  // legacy
  level_4: "Executive", // legacy
};

export const TIER_ACCESS_LABEL_BY_TIER: Record<SubscriptionTier, string> = {
  level_1: "All Members",
  level_2: "Plus and above",
  level_3: "Legacy Coaching Circle and above",
  level_4: "Legacy Executive Coaching only",
};

export function getPlanName(tier: string | null | undefined): string {
  if (!tier) return PLAN_NAME_BY_TIER.level_1;
  return PLAN_NAME_BY_TIER[tier as SubscriptionTier] ?? PLAN_NAME_BY_TIER.level_1;
}

export function getPositivesPlanName(tier: string | null | undefined): string {
  if (!tier) return POSITIVES_PLAN_NAME_BY_TIER.level_1;
  return POSITIVES_PLAN_NAME_BY_TIER[tier as SubscriptionTier] ?? POSITIVES_PLAN_NAME_BY_TIER.level_1;
}
