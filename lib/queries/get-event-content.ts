import { createClient } from "@/lib/supabase/server";
import { shouldHideFromMembers } from "@/lib/content/member-content-visibility";
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
  | "tags"
>;

export async function getEventContent(limit = 20): Promise<EventItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("content")
    .select(
      "id, title, excerpt, description, starts_at, duration_seconds, vimeo_video_id, youtube_video_id, join_url, status, tier_min, tags"
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

  return (data ?? []).filter((item) => !shouldHideFromMembers(item));
}
