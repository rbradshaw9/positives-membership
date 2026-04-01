"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * app/(member)/today/engagement-actions.ts
 * Sprint 8: Weekly and Monthly engagement tracking.
 *
 * Fires `weekly_viewed` / `monthly_viewed` activity_event on first meaningful
 * interaction with the card (expand, play, reflect). Called client-side,
 * best-effort — never surfaces errors to the member.
 *
 * De-duplicated: only one event per (member, content) per day.
 */

export async function trackWeeklyViewed(contentId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // Best-effort insert — ignore duplicate or constraint errors
  await supabase.from("activity_event").insert({
    member_id: user.id,
    event_type: "weekly_viewed",
    content_id: contentId,
    metadata: { trigger: "card_interaction" },
  });
}

export async function trackMonthlyViewed(contentId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("activity_event").insert({
    member_id: user.id,
    event_type: "monthly_viewed",
    content_id: contentId,
    metadata: { trigger: "card_interaction" },
  });
}
