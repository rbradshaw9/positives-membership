import { unstable_cache } from "next/cache";
import { getAdminClient } from "@/lib/supabase/admin";
import { getEffectiveDate } from "@/lib/dates/effective-date";
import { CACHE_TAGS } from "@/lib/cache-tags";
import type { Tables } from "@/types/supabase";

/**
 * lib/queries/get-weekly-content.ts
 *
 * Returns the current active weekly_principle content.
 *
 * Wrapped in unstable_cache tagged with CACHE_TAGS.weeklyContent.
 * Busted immediately on any admin publish via revalidateTag.
 * 6-hour TTL backstop — weekly content rarely changes mid-week.
 */

export type WeeklyContent = Pick<
  Tables<"content">,
  | "id"
  | "title"
  | "description"
  | "excerpt"
  | "body"
  | "reflection_prompt"
  | "download_url"
  | "resource_links"
  | "vimeo_video_id"
  | "youtube_video_id"
  | "mux_playback_id"
  | "castos_episode_url"
  | "s3_audio_key"
  | "duration_seconds"
  | "week_start"
>;

async function fetchWeeklyContent(effectiveDate: string): Promise<WeeklyContent | null> {
  // getAdminClient() does not read cookies — safe to call inside unstable_cache.
  const supabase = getAdminClient();

  const { data, error } = await supabase
    .from("content")
    .select(
      "id, title, description, excerpt, body, reflection_prompt, download_url, resource_links, vimeo_video_id, youtube_video_id, mux_playback_id, castos_episode_url, s3_audio_key, duration_seconds, week_start"
    )
    .eq("type", "weekly_principle")
    .eq("status", "published")
    .lte("week_start", effectiveDate)
    .order("week_start", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[getWeeklyContent] Supabase query error:", error.message);
    return null;
  }

  return data;
}

export async function getWeeklyContent(): Promise<WeeklyContent | null> {
  const effectiveDate = getEffectiveDate();

  return unstable_cache(
    () => fetchWeeklyContent(effectiveDate),
    ["weekly-content", effectiveDate],
    {
      tags: [CACHE_TAGS.weeklyContent],
      revalidate: 60 * 60 * 6, // 6-hour backstop
    }
  )();
}
