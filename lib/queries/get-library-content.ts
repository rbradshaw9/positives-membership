import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/supabase";

/**
 * lib/queries/get-library-content.ts
 * Returns published content for the Library page.
 *
 * Supports optional type filter ('daily_audio' | 'weekly_principle' | 'monthly_theme').
 * Ordered by most recent first using the most relevant date field per type.
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
  | "publish_date"
  | "week_start"
  | "month_year"
  | "duration_seconds"
>;

export type ContentTypeFilter =
  | "daily_audio"
  | "weekly_principle"
  | "monthly_theme"
  | null; // null = all

export async function getLibraryContent(
  typeFilter: ContentTypeFilter = null,
  limit = 50,
  offset = 0
): Promise<LibraryItem[]> {
  const supabase = await createClient();

  let query = supabase
    .from("content")
    .select(
      "id, type, title, excerpt, description, publish_date, week_start, month_year, duration_seconds"
    )
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (typeFilter) {
    query = query.eq("type", typeFilter);
  } else {
    // All three primary content types only — exclude library/workshop until those features exist
    query = query.in("type", ["daily_audio", "weekly_principle", "monthly_theme"]);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[getLibraryContent] Supabase query error:", error.message);
    return [];
  }

  return data ?? [];
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
