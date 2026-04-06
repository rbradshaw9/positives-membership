import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getEffectiveMonthYear } from "@/lib/dates/effective-date";
import { CACHE_TAGS } from "@/lib/cache-tags";
import type { Tables } from "@/types/supabase";

/**
 * lib/queries/get-monthly-content.ts
 *
 * Returns the current active monthly_theme content.
 *
 * Wrapped in unstable_cache tagged with CACHE_TAGS.monthlyContent.
 * Busted immediately on any admin publish via revalidateTag.
 * 12-hour TTL backstop — monthly content almost never changes after publish.
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
  | "mux_asset_id"
  | "month_year"
>;

async function fetchMonthlyContent(targetMonthYear: string): Promise<MonthlyContent | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("content")
    .select(
      "id, title, description, excerpt, body, reflection_prompt, download_url, resource_links, vimeo_video_id, youtube_video_id, mux_playback_id, mux_asset_id, month_year"
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

export async function getMonthlyContent(
  monthYear?: string
): Promise<MonthlyContent | null> {
  const targetMonthYear = monthYear ?? getEffectiveMonthYear();

  return unstable_cache(
    () => fetchMonthlyContent(targetMonthYear),
    ["monthly-content", targetMonthYear],
    {
      tags: [CACHE_TAGS.monthlyContent],
      revalidate: 60 * 60 * 12, // 12-hour backstop
    }
  )();
}
