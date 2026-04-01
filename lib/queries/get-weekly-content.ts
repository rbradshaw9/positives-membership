import { createClient } from "@/lib/supabase/server";
import { getEffectiveDate } from "@/lib/dates/effective-date";
import type { Tables } from "@/types/supabase";

/**
 * lib/queries/get-weekly-content.ts
 * Returns the current active weekly_principle content.
 *
 * "Active" = the most recent weekly_principle whose week_start (Monday)
 * is on or before today's Eastern canonical date.
 *
 * Self-activating: no cron needed. On Monday, effective_date advances and
 * the query automatically returns the new week's record if one exists.
 *
 * Returns null if no weekly record has a week_start on or before today.
 */

export type WeeklyContent = Pick<
  Tables<"content">,
  "id" | "title" | "description" | "excerpt" | "vimeo_video_id" | "week_start"
>;

export async function getWeeklyContent(): Promise<WeeklyContent | null> {
  const supabase = await createClient();
  const effectiveDate = getEffectiveDate();

  const { data, error } = await supabase
    .from("content")
    .select("id, title, description, excerpt, vimeo_video_id, week_start")
    .eq("type", "weekly_principle")
    .eq("status", "published")
    .lte("week_start", effectiveDate) // week has started (or started today)
    .order("week_start", { ascending: false }) // most recent active week wins
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[getWeeklyContent] Supabase query error:", error.message);
    return null;
  }

  return data;
}
