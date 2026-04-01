import { createClient } from "@/lib/supabase/server";
import { getEffectiveDate } from "@/lib/dates/effective-date";
import type { Tables } from "@/types/supabase";

/**
 * lib/queries/get-today-content.ts
 * Server-side query for the current day's daily_audio content.
 *
 * Sprint 5 — includes reflection_prompt so DailyPracticeCard can show
 * a specific reflection question if one is set.
 */

export type TodayContent = Pick<
  Tables<"content">,
  | "id"
  | "title"
  | "description"
  | "excerpt"
  | "reflection_prompt"
  | "duration_seconds"
  | "castos_episode_url"
  | "s3_audio_key"
  | "publish_date"
>;

export async function getTodayContent(): Promise<TodayContent | null> {
  const supabase = await createClient();
  const effectiveDate = getEffectiveDate();

  const { data, error } = await supabase
    .from("content")
    .select(
      "id, title, description, excerpt, reflection_prompt, duration_seconds, castos_episode_url, s3_audio_key, publish_date"
    )
    .eq("type", "daily_audio")
    .eq("status", "published")
    .eq("publish_date", effectiveDate)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[getTodayContent] Supabase query error:", error.message);
    return null;
  }

  return data;
}
