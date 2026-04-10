/**
 * lib/cache-tags.ts
 *
 * Central registry of all Next.js cache tags used with unstable_cache.
 * Import from here — never hardcode tag strings inline.
 *
 * Tags are used in two places:
 *   1. unstable_cache(..., { tags: [CACHE_TAGS.xxx] }) — registers the cache entry
 *   2. revalidateTag(CACHE_TAGS.xxx, "max")            — busts it on publish
 *
 * All three content types are shared across all members (not per-user),
 * so a single tag covers everyone simultaneously.
 */

export const CACHE_TAGS = {
  /** Today's daily_audio — changes at midnight Eastern daily */
  todayContent: "today-content",

  /** Current week's weekly_principle — changes at week boundary */
  weeklyContent: "weekly-content",

  /** Current month's monthly_theme — changes at month boundary */
  monthlyContent: "monthly-content",

  /** All content for the library/search — busted on any content change */
  libraryContent: "library-content",

  /** Coaching call list — busted when a coaching_call is published */
  coachingContent: "coaching-content",
} as const;
