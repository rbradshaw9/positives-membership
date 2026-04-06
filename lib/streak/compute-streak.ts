/**
 * lib/streak/compute-streak.ts
 * Streak computation — corrected Sprint 6 implementation.
 *
 * computeNewStreak replaces the old shouldIncrementStreak boolean predicate.
 * It returns the correct NEW streak count accounting for:
 *   - First-ever practice → 1
 *   - Same day (double-listen) → unchanged
 *   - Consecutive day (yesterday) → +1
 *   - Missed a day or more → reset to 1
 *
 * isStreakActive is used by the display layer (today page, member layout) to
 * show 0 if the stored practice_streak refers to a broken streak that hasn't
 * been corrected in the DB yet (i.e. the member hasn't listened since breaking).
 */

/**
 * Returns the correct new practice_streak value to write to the DB.
 *
 * @param lastPracticedAt - The member's last_practiced_at UTC timestamp, or null.
 * @param currentStreak   - The currently stored practice_streak value.
 * @param now             - The current timestamp (pass explicitly for testability).
 */
export function computeNewStreak(
  lastPracticedAt: Date | null,
  currentStreak: number,
  now: Date
): number {
  // First-ever practice
  if (!lastPracticedAt) return 1;

  const lastDay = lastPracticedAt.toISOString().slice(0, 10);
  const today = now.toISOString().slice(0, 10);

  // Same UTC calendar day — don't change the streak (prevents double-increment)
  if (lastDay === today) return currentStreak;

  // Yesterday — consecutive practice, increment
  const yesterday = new Date(now);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  if (lastDay === yesterdayStr) return currentStreak + 1;

  // Any earlier day — streak is broken, restart from 1
  return 1;
}

/**
 * Returns true if the stored streak is still valid (not broken).
 * Used by the display layer so we can show 0 before the member listens again.
 *
 * A streak is active if last_practiced_at is today or yesterday (UTC).
 *
 * @param lastPracticedAt - ISO string from the DB, or null.
 * @param today           - Today's UTC date string "YYYY-MM-DD".
 */
export function isStreakActive(
  lastPracticedAt: string | null | undefined,
  today: string
): boolean {
  if (!lastPracticedAt) return false;

  const lastDay = lastPracticedAt.slice(0, 10);
  if (lastDay === today) return true;

  const d = new Date(today + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - 1);
  const yesterday = d.toISOString().slice(0, 10);

  return lastDay === yesterday;
}

/**
 * @deprecated Use computeNewStreak instead. Kept for reference only.
 */
export function shouldIncrementStreak(
  lastPracticedAt: Date | null,
  now: Date
): boolean {
  if (!lastPracticedAt) return true;
  const lastDay = lastPracticedAt.toISOString().slice(0, 10);
  const today = now.toISOString().slice(0, 10);
  return lastDay !== today;
}
