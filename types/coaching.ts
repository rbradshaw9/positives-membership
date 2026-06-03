/**
 * types/coaching.ts
 *
 * Shared narrow types for coaching API routes.
 *
 * Note on BookingRow: Each coaching route queries different columns from
 * coaching_booking (each needs only the fields relevant to its operation),
 * so BookingRow is intentionally defined inline in each route rather than
 * as a single shared type. This keeps the per-route type accurate to its
 * actual SELECT query.
 *
 * CoachingPackRow IS shared — the full pack shape (with sessions_total)
 * is used anywhere a pack is fetched for deduction or display.
 */

/**
 * The minimal pack shape used when deducting or restoring sessions.
 * Always include sessions_total so the cap can be enforced on restore.
 */
export type CoachingPackRow = {
  id: string;
  sessions_remaining: number;
  sessions_total: number;
};
