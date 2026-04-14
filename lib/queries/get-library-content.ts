import { createClient } from "@/lib/supabase/server";
import { shouldHideFromMembers } from "@/lib/content/member-content-visibility";
import type { Tables } from "@/types/supabase";

/**
 * lib/queries/get-library-content.ts
 * Returns published content for the Library page.
 *
 * Sprint 10: accepts memberTier for tier_min filtering.
 * Content with tier_min = NULL is visible to all members.
 * Content with tier_min set is only visible to members at that tier or above.
 *
 * Does NOT join with journal — Library page fetches note existence separately.
 */

export type LibraryItem = Pick<
  Tables<"content">,
  | "id"
  | "type"
  | "title"
  | "excerpt"
  | "description"
  | "download_url"
  | "resource_links"
  | "vimeo_video_id"
  | "youtube_video_id"
  | "castos_episode_url"
  | "s3_audio_key"
  | "publish_date"
  | "week_start"
  | "month_year"
  | "duration_seconds"
  | "tags"
>;

export type ContentTypeFilter =
  | "daily_audio"
  | "weekly_principle"
  | "monthly_theme"
  | "coaching_call"
  | null; // null = all

export async function getLibraryContent(
  typeFilter: ContentTypeFilter = null,
  limit = 50,
  offset = 0,
  memberTier: string | null = null
): Promise<LibraryItem[]> {
  const supabase = await createClient();

  let query = supabase
    .from("content")
    .select(
      "id, type, title, excerpt, description, download_url, resource_links, vimeo_video_id, youtube_video_id, castos_episode_url, s3_audio_key, publish_date, week_start, month_year, duration_seconds, tags"
    )
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (typeFilter) {
    query = query.eq("type", typeFilter);
  } else {
    // Primary content types visible in library — coaching_call included when member is Level 3+
    query = query.in("type", ["daily_audio", "weekly_principle", "monthly_theme", "coaching_call"]);
  }

  // Tier-min filter: null tier_min = all members; set tier_min = only that tier and above.
  // We apply this at the query level by filtering out rows where tier_min is set
  // and the member's tier doesn't meet it. The safest implementation: only show rows
  // where tier_min IS NULL. If the member has a tier, also show rows where tier_min
  // equals a tier they can access. We compute the allowed tiers in application code.
  if (memberTier) {
    const allowedTiers = getAllowedTiers(memberTier);
    // Show content where tier_min is null OR tier_min is one of the allowed tiers
    query = query.or(`tier_min.is.null,tier_min.in.(${allowedTiers.join(",")})`);
  } else {
    // No tier info available — only show ungated content
    query = query.is("tier_min", null);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[getLibraryContent] Supabase query error:", error.message);
    return [];
  }

  return (data ?? []).filter((item) => !shouldHideFromMembers(item));
}

/**
 * Returns the list of tier values accessible to the given member tier.
 * level_3 can access level_1, level_2, level_3 content.
 * This avoids relying on Postgres enum ordering comparison.
 */
function getAllowedTiers(memberTier: string): string[] {
  const order = ["level_1", "level_2", "level_3", "level_4"];
  const idx = order.indexOf(memberTier);
  if (idx === -1) return [];
  return order.slice(0, idx + 1);
}

/**
 * getMemberNoteContentIds — returns the set of content IDs that this member
 * has notes for. Used by Library to show the note indicator efficiently.
 */
export async function getMemberNoteContentIds(memberId: string): Promise<Set<string>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("journal")
    .select("content_id")
    .eq("member_id", memberId)
    .not("content_id", "is", null);

  if (error) {
    console.error("[getMemberNoteContentIds] error:", error.message);
    return new Set();
  }

  return new Set((data ?? []).map((r) => r.content_id as string));
}

/**
 * getMemberNoteCounts — returns the number of reflections a member has for
 * each content item. Used by Today and Library surfaces to show additive
 * reflection language without loading note bodies.
 */
export async function getMemberNoteCounts(
  memberId: string,
  contentIds?: string[]
): Promise<Record<string, number>> {
  const supabase = await createClient();

  let query = supabase
    .from("journal")
    .select("content_id")
    .eq("member_id", memberId)
    .not("content_id", "is", null);

  if (contentIds && contentIds.length > 0) {
    query = query.in("content_id", contentIds);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[getMemberNoteCounts] error:", error.message);
    return {};
  }

  return (data ?? []).reduce<Record<string, number>>((acc, row) => {
    const contentId = row.content_id as string | null;
    if (!contentId) return acc;
    acc[contentId] = (acc[contentId] ?? 0) + 1;
    return acc;
  }, {});
}
