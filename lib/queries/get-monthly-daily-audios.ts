import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { getAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/types/supabase";

/**
 * lib/queries/get-monthly-daily-audios.ts
 *
 * Returns all published daily_audio entries up to (but not including) today,
 * grouped by month_year. Covers the current month's past days only.
 *
 * Results are sorted newest-first within each month. The "exclude date" is
 * today's date so today's audio (shown separately at the top) isn't repeated.
 */

export type MonthlyDailyAudio = Pick<
  Tables<"content">,
  | "id"
  | "title"
  | "excerpt"
  | "publish_date"
  | "published_at"
  | "duration_seconds"
  | "castos_episode_url"
  | "s3_audio_key"
>;

export interface MonthGroup {
  monthYear: string;   // "2026-04"
  monthName: string;   // "April 2026"
  audios: MonthlyDailyAudio[];
}

/** Format "2026-04" → "April 2026" */
function monthYearToLabel(monthYear: string): string {
  const [year, month] = monthYear.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(
    new Date(year, month - 1, 1)
  );
}

export async function getMonthlyDailyAudios(
  excludeDate: string
): Promise<MonthGroup[]> {
  return unstable_cache(
    () => fetchMonthlyDailyAudios(excludeDate),
    ["monthly-daily-audios", excludeDate],
    {
      tags: [CACHE_TAGS.libraryContent],
      revalidate: 60 * 30,
    }
  )();
}

async function fetchMonthlyDailyAudios(excludeDate: string): Promise<MonthGroup[]> {
  const supabase = getAdminClient();

  // Scope to current month only — the /today page is a "living document"
  // for the current month. Closed months are accessed via /library/months/[monthYear].
  const currentMonthYear = excludeDate.slice(0, 7); // "2026-04"
  const monthStart = `${currentMonthYear}-01`;

  // Some content is published with publish_date set; older entries may only
  // have published_at (a timestamp). We match both:
  //   - rows where publish_date is in range  [monthStart, excludeDate)
  //   - rows where publish_date is null but published_at::date is in range
  const { data, error } = await supabase
    .from("content")
    .select(
      "id, title, excerpt, publish_date, published_at, duration_seconds, castos_episode_url, s3_audio_key"
    )
    .eq("type", "daily_audio")
    .eq("status", "published")
    .or(
      `and(publish_date.gte.${monthStart},publish_date.lt.${excludeDate}),` +
      `and(publish_date.is.null,published_at.gte.${monthStart}T00:00:00,published_at.lt.${excludeDate}T00:00:00)`
    )
    .order("publish_date", { ascending: false, nullsFirst: false })
    .order("published_at", { ascending: false });

  if (error) {
    console.error("[getMonthlyDailyAudios] Supabase query error:", error.message);
    return [];
  }

  if (!data || data.length === 0) return [];

  // Group by calendar month — prefer publish_date, fall back to published_at date
  const groups = new Map<string, MonthlyDailyAudio[]>();
  for (const row of data) {
    const dateStr = row.publish_date ?? row.published_at?.slice(0, 10);
    if (!dateStr) continue;
    const monthYear = dateStr.slice(0, 7); // "2026-04"
    if (!groups.has(monthYear)) groups.set(monthYear, []);
    // Normalise: if publish_date is null but published_at exists, surface publish_date
    // as the published_at date so downstream components can display it
    const normalised = row.publish_date
      ? row
      : { ...row, publish_date: dateStr };
    groups.get(monthYear)!.push(normalised);
  }

  // Return months newest-first
  return Array.from(groups.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([monthYear, audios]) => ({
      monthYear,
      monthName: monthYearToLabel(monthYear),
      audios,
    }));
}

/**
 * getArchiveDailyAudios — fetches ALL published daily_audio content for a
 * specific month_year (e.g. "2026-03"). Returns a single MonthGroup.
 * Used by the /library/months/[monthYear] archive route.
 *
 * Unlike getMonthlyDailyAudios, this does not exclude today and uses the
 * month_year field directly for a precise month boundary.
 */
export async function getArchiveDailyAudios(
  monthYear: string
): Promise<MonthGroup | null> {
  return unstable_cache(
    () => fetchArchiveDailyAudios(monthYear),
    ["archive-daily-audios", monthYear],
    {
      tags: [CACHE_TAGS.libraryContent],
      revalidate: 60 * 60,
    }
  )();
}

async function fetchArchiveDailyAudios(monthYear: string): Promise<MonthGroup | null> {
  const supabase = getAdminClient();

  const { data, error } = await supabase
    .from("content")
    .select(
      "id, title, excerpt, publish_date, published_at, duration_seconds, castos_episode_url, s3_audio_key"
    )
    .eq("type", "daily_audio")
    .eq("status", "published")
    .eq("month_year", monthYear)
    .order("publish_date", { ascending: false });

  if (error) {
    console.error("[getArchiveDailyAudios] Supabase query error:", error.message);
    return null;
  }

  if (!data || data.length === 0) return null;

  return {
    monthYear,
    monthName: monthYearToLabel(monthYear),
    audios: data,
  };
}
