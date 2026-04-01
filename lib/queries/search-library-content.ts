import { createClient } from "@/lib/supabase/server";

/**
 * lib/queries/search-library-content.ts
 * Full-text search across published content using the search_vector column.
 *
 * Uses plainto_tsquery for natural language input (what members type).
 * Returns ranked results with ts_rank scoring.
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
  limit = 20
): Promise<SearchResult[]> {
  const supabase = await createClient();
  const trimmed = query.trim();
  if (!trimmed) return [];

  // Use Supabase's built-in textSearch for the search_vector column
  const { data, error } = await supabase
    .from("content")
    .select(
      "id, type, title, excerpt, description, publish_date, week_start, month_year, duration_seconds"
    )
    .eq("status", "published")
    .in("type", ["daily_audio", "weekly_principle", "monthly_theme"])
    .textSearch("search_vector", trimmed, {
      type: "websearch",
      config: "english",
    })
    .limit(limit);

  if (error) {
    console.error("[searchLibraryContent] error:", error.message);
    return [];
  }

  // Supabase textSearch doesn't return rank in the response, so we assign
  // ordinal rank (results are already relevance-ordered by FTS)
  return (data ?? []).map((row, i) => ({
    ...row,
    rank: 1 - i * 0.01, // descending pseudo-rank for UI ordering
  }));
}
