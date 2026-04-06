import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getEffectiveDate } from "@/lib/dates/effective-date";
import { CACHE_TAGS } from "@/lib/cache-tags";
import type { Tables } from "@/types/supabase";

/**
 * lib/queries/get-today-content.ts
 *
 * Returns today's daily_audio content.
 *
 * Wrapped in unstable_cache (compatible with current Next.js 16 config without
 * cacheComponents). Tagged with CACHE_TAGS.todayContent so admin publish actions
 * can bust the cache immediately via revalidateTag.
 *
 * Cache key includes effectiveDate so it auto-rotates at midnight daily.
 * 2-hour TTL is a backstop — revalidateTag fires immediately on any publish.
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

async function fetchTodayContent(effectiveDate: string): Promise<TodayContent | null> {
  const supabase = await createClient();

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

export async function getTodayContent(): Promise<TodayContent | null> {
  const effectiveDate = getEffectiveDate();

  return unstable_cache(
    () => fetchTodayContent(effectiveDate),
    ["today-content", effectiveDate],
    {
      tags: [CACHE_TAGS.todayContent],
      revalidate: 60 * 60 * 2, // 2-hour backstop
    }
  )();
}
