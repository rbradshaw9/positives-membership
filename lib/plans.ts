export type SubscriptionTier = "level_1" | "level_2" | "level_3" | "level_4";

export const PLAN_NAME_BY_TIER: Record<SubscriptionTier, string> = {
  level_1: "Membership",
  level_2: "Membership + Events",
  level_3: "Coaching Circle",
  level_4: "Executive Coaching",
};

export const POSITIVES_PLAN_NAME_BY_TIER: Record<SubscriptionTier, string> = {
  level_1: "Positives Membership",
  level_2: "Positives Membership + Events",
  level_3: "Positives Coaching Circle",
  level_4: "Positives Executive Coaching",
};

export const ADMIN_PLAN_SHORT_LABEL_BY_TIER: Record<SubscriptionTier, string> = {
  level_1: "Membership",
  level_2: "Events",
  level_3: "Coaching",
  level_4: "Executive",
};

export const TIER_ACCESS_LABEL_BY_TIER: Record<SubscriptionTier, string> = {
  level_1: "All Members",
  level_2: "Membership + Events and above",
  level_3: "Coaching Circle and above",
  level_4: "Executive Coaching only",
};

export function getPlanName(tier: string | null | undefined): string {
  if (!tier) return PLAN_NAME_BY_TIER.level_1;
  return PLAN_NAME_BY_TIER[tier as SubscriptionTier] ?? PLAN_NAME_BY_TIER.level_1;
}

export function getPositivesPlanName(tier: string | null | undefined): string {
  if (!tier) return POSITIVES_PLAN_NAME_BY_TIER.level_1;
  return POSITIVES_PLAN_NAME_BY_TIER[tier as SubscriptionTier] ?? POSITIVES_PLAN_NAME_BY_TIER.level_1;
}
