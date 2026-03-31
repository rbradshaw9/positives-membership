import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/supabase";

/**
 * lib/queries/get-today-content.ts
 * Server-side query for the latest active daily audio content.
 *
 * Returns the most recently published active `daily_audio` content row,
 * or null if no content is available yet.
 *
 * TodayContent is derived directly from the generated Database types —
 * no manual type duplication.
 */

// Pick only the fields consumed by the today page / DailyPracticeCard.
// Derived from the generated Tables<"content"> Row type.
export type TodayContent = Pick<
  Tables<"content">,
  | "id"
  | "title"
  | "description"
  | "duration_seconds"
  | "castos_episode_url"
  | "s3_audio_key"
  | "published_at"
>;

export async function getTodayContent(): Promise<TodayContent | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("content")
    .select(
      "id, title, description, duration_seconds, castos_episode_url, s3_audio_key, published_at"
    )
    .eq("type", "daily_audio")
    .eq("is_active", true)
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[getTodayContent] Supabase query error:", error.message);
    return null;
  }

  return data;
}
