import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/supabase";

/**
 * lib/queries/get-monthly-daily-audios.ts
 *
 * Returns all published daily_audio entries for the current calendar month,
 * excluding today's date (since today's audio is shown separately at the top).
 *
 * Query strategy: date range on publish_date — avoids relying on month_year
 * being set on every row (some older rows may have null).
 *
 * Results are sorted newest-first so the archive reads chronologically
 * when reversed (most recent past → oldest).
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

export async function getMonthlyDailyAudios(
  excludeDate: string
): Promise<MonthlyDailyAudio[]> {
  const supabase = await createClient();

  // First day of the current month
  const now = new Date(excludeDate + "T12:00:00");
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const firstOfMonthStr = firstOfMonth.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("content")
    .select(
      "id, title, excerpt, publish_date, duration_seconds, castos_episode_url, s3_audio_key"
    )
    .eq("type", "daily_audio")
    .eq("status", "published")
    .gte("publish_date", firstOfMonthStr)
    .lt("publish_date", excludeDate)
    .order("publish_date", { ascending: false });

  if (error) {
    console.error("[getMonthlyDailyAudios] Supabase query error:", error.message);
    return [];
  }

  return data ?? [];
}
