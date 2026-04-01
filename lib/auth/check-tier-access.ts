/**
 * lib/auth/check-tier-access.ts
 * Sprint 10: Tier comparison helper for server-side access control.
 *
 * Rules:
 * - requiredTier null/undefined → access granted (content is for all tiers)
 * - memberTier null/undefined   → access denied (no tier = not a tiered member)
 * - Otherwise compare using explicit numeric ordering (never Postgres enum ordering)
 *
 * tier order: level_1 < level_2 < level_3 < level_4
 *
 * Server-only. No Supabase imports. Pure function — safe to unit test.
 */

const TIER_ORDER: Record<string, number> = {
  level_1: 1,
  level_2: 2,
  level_3: 3,
  level_4: 4,
};

/**
 * Returns true if the member's tier meets or exceeds the required tier.
 *
 * @param memberTier    - The member's subscription_tier value from the DB
 * @param requiredTier  - The minimum tier required (e.g. tier_min on content)
 */
export function checkTierAccess(
  memberTier: string | null | undefined,
  requiredTier: string | null | undefined
): boolean {
  if (!requiredTier) return true; // null tier_min = open to all active members
  if (!memberTier) return false;  // authenticated but no tier → no premium access
  const memberLevel = TIER_ORDER[memberTier] ?? 0;
  const requiredLevel = TIER_ORDER[requiredTier] ?? 0;
  return memberLevel >= requiredLevel;
}
