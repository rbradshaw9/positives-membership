import { createClient } from "@/lib/supabase/server";
import { getEffectiveMonthYear } from "@/lib/dates/effective-date";
import type { Tables } from "@/types/supabase";

/**
 * lib/queries/get-monthly-content.ts
 * Returns the current active monthly_theme content.
 *
 * Sprint 5 — includes new rich fields (body, reflection_prompt, download_url,
 * youtube_video_id) so MonthlyThemeCard can render deeper content.
 */

export type MonthlyContent = Pick<
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
  | "month_year"
>;

export async function getMonthlyContent(
  monthYear?: string
): Promise<MonthlyContent | null> {
  const supabase = await createClient();
  const targetMonthYear = monthYear ?? getEffectiveMonthYear();

  const { data, error } = await supabase
    .from("content")
    .select(
      "id, title, description, excerpt, body, reflection_prompt, download_url, resource_links, vimeo_video_id, youtube_video_id, mux_playback_id, month_year"
    )
    .eq("type", "monthly_theme")
    .eq("status", "published")
    .eq("month_year", targetMonthYear)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[getMonthlyContent] Supabase query error:", error.message);
    return null;
  }

  return data;
}

