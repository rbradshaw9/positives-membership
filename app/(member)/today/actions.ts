"use server";

import { createClient } from "@/lib/supabase/server";
import { shouldIncrementStreak } from "@/lib/streak/compute-streak";

/**
 * app/(member)/today/actions.ts
 * Server actions for the Today page.
 *
 * markListened — called by DailyPracticeCard at ~80% audio completion.
 *
 * Writes to:
 *   - progress         (content-specific listen record)
 *   - activity_event   (general engagement log — daily_listened event)
 *   - member           (updates last_practiced_at + practice_streak)
 *
 * Fails quietly from the member's perspective. A tracking failure should
 * never interrupt audio playback or degrade the member experience.
 */

export async function markListened(contentId: string): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Member logged out mid-session — silently exit
    return;
  }

  const now = new Date();

  // ── 1. Write progress record ────────────────────────────────────────────────
  const { error: progressError } = await supabase.from("progress").insert({
    member_id: user.id,
    content_id: contentId,
    completed: true,
    // listened_at defaults to NOW() in DB
  });

  if (progressError) {
    console.error("[markListened] progress insert error:", progressError.message);
    // Continue — still attempt activity_event and streak update
  }

  // ── 2. Write activity_event record ─────────────────────────────────────────
  const { error: eventError } = await supabase.from("activity_event").insert({
    member_id: user.id,
    event_type: "daily_listened",
    content_id: contentId,
    metadata: { percent_completed: 80 },
    // occurred_at defaults to NOW() in DB
  });

  if (eventError) {
    console.error("[markListened] activity_event insert error:", eventError.message);
  }

  // ── 3. Fetch current member streak state ────────────────────────────────────
  const { data: member, error: memberFetchError } = await supabase
    .from("member")
    .select("last_practiced_at, practice_streak")
    .eq("id", user.id)
    .single();

  if (memberFetchError || !member) {
    console.error("[markListened] member fetch error:", memberFetchError?.message);
    return;
  }

  // ── 4. Increment streak if appropriate ─────────────────────────────────────
  const lastPracticedAt = member.last_practiced_at
    ? new Date(member.last_practiced_at)
    : null;

  const increment = shouldIncrementStreak(lastPracticedAt, now);

  const { error: streakError } = await supabase
    .from("member")
    .update({
      last_practiced_at: now.toISOString(),
      practice_streak: increment
        ? (member.practice_streak ?? 0) + 1
        : member.practice_streak,
    })
    .eq("id", user.id);

  if (streakError) {
    console.error("[markListened] streak update error:", streakError.message);
  }
}
