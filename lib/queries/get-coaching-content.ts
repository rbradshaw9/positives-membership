import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/supabase";

/**
 * lib/queries/get-coaching-content.ts
 * Sprint 10: Fetches coaching_call content rows, ordered by starts_at.
 *
 * Returns upcoming + recent replays.
 * Server-only. Does NOT apply tier check here — caller does that.
 *
 * Sprint 10 patch: uses join_url (not castos_episode_url) for Zoom links.
 */

export type CoachingItem = Pick<
  Tables<"content">,
  | "id"
  | "title"
  | "excerpt"
  | "description"
  | "starts_at"
  | "duration_seconds"
  | "vimeo_video_id"
  | "youtube_video_id"
  | "join_url"
  | "status"
>;

export async function getCoachingContent(limit = 20): Promise<CoachingItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("content")
    .select(
      "id, title, excerpt, description, starts_at, duration_seconds, vimeo_video_id, youtube_video_id, join_url, status"
    )
    .eq("type", "coaching_call")
    .eq("status", "published")
    .in("tier_min", ["level_3", "level_4"])
    .order("starts_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) {
    console.error("[getCoachingContent] error:", error.message);
    return [];
  }

  return data ?? [];
}
