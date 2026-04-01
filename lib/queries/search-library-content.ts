import { createClient } from "@/lib/supabase/server";

/**
 * lib/queries/search-library-content.ts
 * Full-text search across published content using the search_vector column.
 *
 * Sprint 10: accepts memberTier for tier_min filtering (same logic as getLibraryContent).
 *
 * Server-only.
 */

export interface SearchResult {
  id: string;
  type: string;
  title: string;
  excerpt: string | null;
  description: string | null;
  publish_date: string | null;
  week_start: string | null;
  month_year: string | null;
  duration_seconds: number | null;
  rank: number;
}

export async function searchLibraryContent(
  query: string,
  limit = 20,
  memberTier: string | null = null
): Promise<SearchResult[]> {
  const supabase = await createClient();
  const trimmed = query.trim();
  if (!trimmed) return [];

  let q = supabase
    .from("content")
    .select(
      "id, type, title, excerpt, description, publish_date, week_start, month_year, duration_seconds"
    )
    .eq("status", "published")
    .in("type", ["daily_audio", "weekly_principle", "monthly_theme", "coaching_call"])
    .textSearch("search_vector", trimmed, {
      type: "websearch",
      config: "english",
    })
    .limit(limit);

  // Tier-min filter — mirrors getLibraryContent logic
  if (memberTier) {
    const allowedTiers = getAllowedTiers(memberTier);
    q = q.or(`tier_min.is.null,tier_min.in.(${allowedTiers.join(",")})`);
  } else {
    q = q.is("tier_min", null);
  }

  const { data, error } = await q;

  if (error) {
    console.error("[searchLibraryContent] error:", error.message);
    return [];
  }

  return (data ?? []).map((row, i) => ({
    ...row,
    rank: 1 - i * 0.01,
  }));
}

function getAllowedTiers(memberTier: string): string[] {
  const order = ["level_1", "level_2", "level_3", "level_4"];
  const idx = order.indexOf(memberTier);
  if (idx === -1) return [];
  return order.slice(0, idx + 1);
}
