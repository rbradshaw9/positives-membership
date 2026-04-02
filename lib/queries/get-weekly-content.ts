import { createClient } from "@/lib/supabase/server";
import { getEffectiveDate } from "@/lib/dates/effective-date";
import type { Tables } from "@/types/supabase";

/**
 * lib/queries/get-weekly-content.ts
 * Returns the current active weekly_principle content.
 *
 * Sprint 5 — includes new rich fields (body, reflection_prompt, download_url,
 * youtube_video_id) so WeeklyPrincipleCard can render media-aware depth.
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

export async function getWeeklyContent(): Promise<WeeklyContent | null> {
  const supabase = await createClient();
  const effectiveDate = getEffectiveDate();

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
