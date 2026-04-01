/**
 * lib/streak/compute-streak.ts
 * Streak increment predicate — Sprint 1 implementation.
 *
 * Determines whether a completed listen should increment the member's
 * practice_streak counter. Isolated here so Sprint 6 can upgrade to
 * grace-period and Eastern-calendar logic without touching markListened.
 *
 * Sprint 1: simple UTC calendar-day guard — prevents double-incrementing
 * if a member completes the daily more than once in the same UTC day.
 *
 * Sprint 6 upgrade path: replace the body with Eastern-calendar check
 * + 1-day grace period. The signature is stable — markListened doesn't change.
 */

/**
 * Returns true if the practice streak should be incremented.
 *
 * @param lastPracticedAt - The member's last_practiced_at timestamp, or null
 *   if they have never practiced before.
 * @param now - The current timestamp (pass explicitly for testability).
 */
export function shouldIncrementStreak(
  lastPracticedAt: Date | null,
  now: Date
): boolean {
  // First-ever practice — always increment
  if (!lastPracticedAt) return true;

  // Already practiced today (UTC calendar day) — do not double-increment
  // Sprint 6: replace slice(0,10) UTC check with Eastern-calendar date check
  const lastDay = lastPracticedAt.toISOString().slice(0, 10);
  const today = now.toISOString().slice(0, 10);

  return lastDay !== today;
}
