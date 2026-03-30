import { createClient } from "@/lib/supabase/server";

/**
 * lib/queries/get-today-content.ts
 * Server-side query for the latest active daily audio content.
 *
 * Returns the most recently published active `daily_audio` content row,
 * or null if no content is available yet.
 *
 * Called from the /today Server Component page.
 * Never called client-side — this file is server-only.
 */

export type TodayContent = {
  id: string;
  title: string;
  description: string | null;
  duration_seconds: number | null;
  castos_episode_url: string | null;
  s3_audio_key: string | null;
  published_at: string | null;
};

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
    // Log but don't throw — degrade gracefully to empty state on the page.
    console.error("[getTodayContent] Supabase query error:", error.message);
    return null;
  }

  return data as TodayContent | null;
}
