import { createClient } from "@/lib/supabase/server";
import { getEffectiveMonthYear } from "@/lib/dates/effective-date";
import type { Tables } from "@/types/supabase";

/**
 * lib/queries/get-monthly-content.ts
 * Returns the current active monthly_theme content.
 *
 * Matches on month_year string ('YYYY-MM') against the current Eastern month.
 * Self-activating: on the 1st of the month, the month_year changes and
 * the query returns the new month's record automatically.
 *
 * Returns null if no monthly record exists for the current month.
 */

export type MonthlyContent = Pick<
  Tables<"content">,
  "id" | "title" | "description" | "excerpt" | "vimeo_video_id" | "month_year"
>;

export async function getMonthlyContent(): Promise<MonthlyContent | null> {
  const supabase = await createClient();
  const effectiveMonthYear = getEffectiveMonthYear();

  const { data, error } = await supabase
    .from("content")
    .select("id, title, description, excerpt, vimeo_video_id, month_year")
    .eq("type", "monthly_theme")
    .eq("status", "published")
    .eq("month_year", effectiveMonthYear)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[getMonthlyContent] Supabase query error:", error.message);
    return null;
  }

  return data;
}
