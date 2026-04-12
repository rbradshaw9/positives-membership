import { unstable_cache } from "next/cache";
import { getAdminClient } from "@/lib/supabase/admin";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { shouldHideFromMembers } from "@/lib/content/member-content-visibility";
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
  | "tags"
>;

async function fetchCoachingContent(limit: number): Promise<CoachingItem[]> {
  const supabase = getAdminClient();

  const { data, error } = await supabase
    .from("content")
    .select(
      "id, title, excerpt, description, starts_at, duration_seconds, vimeo_video_id, youtube_video_id, join_url, status, tags"
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

  const now = Date.now();

  return (data ?? []).filter((item) => {
    if (shouldHideFromMembers(item)) return false;

    const startsAtTime = item.starts_at ? new Date(item.starts_at).getTime() : null;
    const isUpcoming = startsAtTime ? startsAtTime > now : false;
    const hasReplayMedia = Boolean(item.vimeo_video_id || item.youtube_video_id);

    if (isUpcoming) {
      return Boolean(item.join_url);
    }

    return hasReplayMedia;
  });
}

export async function getCoachingContent(limit = 20): Promise<CoachingItem[]> {
  return unstable_cache(() => fetchCoachingContent(limit), ["coaching-content", String(limit)], {
    tags: [CACHE_TAGS.coachingContent],
    revalidate: 60 * 10,
  })();
}
