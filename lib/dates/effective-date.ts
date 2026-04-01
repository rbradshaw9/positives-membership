/**
 * lib/dates/effective-date.ts
 * Server-only — never import in client components.
 *
 * Single source of truth for the canonical Eastern date used in all
 * Today content queries (Daily, Weekly, Monthly).
 *
 * Strategy: Option A — canonical timezone rendering (America/New_York).
 * All Today queries use this date regardless of the member's local time.
 * Member-local rendering (Option B) is deferred to Sprint 4+.
 *
 * Uses date-fns-tz with the IANA string "America/New_York" — handles DST
 * transitions automatically. Do NOT use a fixed UTC offset.
 */

import { format, toZonedTime } from "date-fns-tz";

const CANONICAL_TZ = "America/New_York" as const;

/**
 * Returns the current calendar date in America/New_York timezone.
 * Format: "YYYY-MM-DD"
 *
 * Used for:
 * - Daily audio: exact publish_date match
 * - Weekly principle: week_start <= effectiveDate comparison
 */
export function getEffectiveDate(): string {
  return format(toZonedTime(new Date(), CANONICAL_TZ), "yyyy-MM-dd");
}

/**
 * Returns the current month in "YYYY-MM" format (Eastern time).
 * Used for monthly_theme content queries.
 */
export function getEffectiveMonthYear(): string {
  return format(toZonedTime(new Date(), CANONICAL_TZ), "yyyy-MM");
}
