import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { getAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/types/supabase";

/**
 * lib/queries/get-month-weekly-content.ts
 *
 * Returns all published weekly_principle entries assigned to a given month,
 * sorted by week_start descending (most recent first).
 *
 * Assignment rule: uses the `month_year` field which is always set
 * (either explicitly by the content team, or backfilled from week_start).
 *
 * Used by:
 *   - today/page.tsx → weekly archive section (excludes current week)
 *   - library/months/[monthYear]/page.tsx → all weeks for archive view
 */

export type MonthWeeklyContent = Pick<
  Tables<"content">,
  | "id"
  | "title"
  | "excerpt"
  | "description"
  | "body"
  | "reflection_prompt"
  | "vimeo_video_id"
  | "youtube_video_id"
  | "castos_episode_url"
  | "s3_audio_key"
  | "duration_seconds"
  | "week_start"
  | "month_year"
>;

export async function getMonthWeeklyContent(
  monthYear: string
): Promise<MonthWeeklyContent[]> {
  return unstable_cache(
    () => fetchMonthWeeklyContent(monthYear),
    ["month-weekly-content", monthYear],
    {
      tags: [CACHE_TAGS.libraryContent],
      revalidate: 60 * 30,
    }
  )();
}

async function fetchMonthWeeklyContent(
  monthYear: string
): Promise<MonthWeeklyContent[]> {
  const supabase = getAdminClient();

  const { data, error } = await supabase
    .from("content")
    .select(
      "id, title, excerpt, description, body, reflection_prompt, vimeo_video_id, youtube_video_id, castos_episode_url, s3_audio_key, duration_seconds, week_start, month_year"
    )
    .eq("type", "weekly_principle")
    .eq("status", "published")
    .eq("month_year", monthYear)
    .order("week_start", { ascending: false });

  if (error) {
    console.error("[getMonthWeeklyContent] Supabase query error:", error.message);
    return [];
  }

  return data ?? [];
}
