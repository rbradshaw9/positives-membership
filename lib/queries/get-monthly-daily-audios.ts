import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/supabase";

/**
 * lib/queries/get-monthly-daily-audios.ts
 *
 * Returns all published daily_audio entries up to (but not including) today,
 * grouped by month_year. Covers the current month's past days AND any prior
 * complete months — so the archive shows March in full plus April days so far.
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
  const supabase = await createClient();

  // Pull all past published daily audios (up to but not including today)
  // Go back up to 60 days to cover the prior complete month
  const now = new Date(excludeDate + "T12:00:00");
  const sixtyDaysAgo = new Date(now);
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  const fromDate = sixtyDaysAgo.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("content")
    .select(
      "id, title, excerpt, publish_date, duration_seconds, castos_episode_url, s3_audio_key"
    )
    .eq("type", "daily_audio")
    .eq("status", "published")
    .gte("publish_date", fromDate)
    .lt("publish_date", excludeDate)
    .order("publish_date", { ascending: false });

  if (error) {
    console.error("[getMonthlyDailyAudios] Supabase query error:", error.message);
    return [];
  }

  if (!data || data.length === 0) return [];

  // Group by calendar month derived from publish_date
  const groups = new Map<string, MonthlyDailyAudio[]>();
  for (const row of data) {
    if (!row.publish_date) continue;
    const monthYear = row.publish_date.slice(0, 7); // "2026-04"
    if (!groups.has(monthYear)) groups.set(monthYear, []);
    groups.get(monthYear)!.push(row);
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
 * Used by the /practice/[monthYear] archive route.
 *
 * Unlike getMonthlyDailyAudios, this does not exclude today and uses the
 * month_year field directly for a precise month boundary.
 */
export async function getArchiveDailyAudios(
  monthYear: string
): Promise<MonthGroup | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("content")
    .select(
      "id, title, excerpt, publish_date, duration_seconds, castos_episode_url, s3_audio_key"
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

