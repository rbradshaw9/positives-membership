import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/supabase";

/**
 * lib/queries/get-library-item.ts
 * Sprint 11b: Fetches a single library content item by ID.
 * Returns full body + all media fields needed for /library/[id] detail page.
 * Caller enforces tier access using checkTierAccess.
 */

export type LibraryItemDetail = Pick<
  Tables<"content">,
  | "id"
  | "type"
  | "title"
  | "excerpt"
  | "description"
  | "body"
  | "reflection_prompt"
  | "download_url"
  | "resource_links"
  | "vimeo_video_id"
  | "youtube_video_id"
  | "mux_playback_id"
  | "mux_asset_id"
  | "castos_episode_url"
  | "s3_audio_key"
  | "duration_seconds"
  | "publish_date"
  | "week_start"
  | "month_year"
  | "tier_min"
  | "status"
>;

export async function getLibraryItem(id: string): Promise<LibraryItemDetail | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("content")
    .select(
      "id, type, title, excerpt, description, body, reflection_prompt, download_url, resource_links, vimeo_video_id, youtube_video_id, mux_playback_id, mux_asset_id, castos_episode_url, s3_audio_key, duration_seconds, publish_date, week_start, month_year, tier_min, status"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[getLibraryItem] Supabase query error:", error.message);
    return null;
  }

  return data;
}
