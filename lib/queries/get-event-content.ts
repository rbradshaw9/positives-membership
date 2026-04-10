import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/supabase";

export type EventItem = Pick<
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
  | "tier_min"
>;

export async function getEventContent(limit = 20): Promise<EventItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("content")
    .select(
      "id, title, excerpt, description, starts_at, duration_seconds, vimeo_video_id, youtube_video_id, join_url, status, tier_min"
    )
    .eq("type", "coaching_call")
    .eq("status", "published")
    .eq("tier_min", "level_2")
    .order("starts_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) {
    console.error("[getEventContent] error:", error.message);
    return [];
  }

  return data ?? [];
}
