"use server";

import { createClient } from "@/lib/supabase/server";
import { computeNewStreak } from "@/lib/streak/compute-streak";
import { POINT_VALUES, awardMemberPoints } from "@/lib/points/award";

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

export async function markListened(contentId: string): Promise<{ newStreak: number }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Member logged out mid-session — silently exit
    return { newStreak: 0 };
  }

  const now = new Date();

  // ── 1. Promote newest incomplete progress row to completed if it exists ───
  const { data: incompleteProgress } = await supabase
    .from("progress")
    .select("id")
    .eq("member_id", user.id)
    .eq("content_id", contentId)
    .eq("completed", false)
    .order("listened_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let progressError: { message: string } | null = null;

  if (incompleteProgress?.id) {
    const { error } = await supabase
      .from("progress")
      .update({
        completed: true,
        listened_at: now.toISOString(),
      })
      .eq("id", incompleteProgress.id);

    progressError = error;
  } else {
    const { error } = await supabase.from("progress").insert({
      member_id: user.id,
      content_id: contentId,
      completed: true,
      listened_at: now.toISOString(),
    });

    progressError = error;
  }

  if (progressError) {
    console.error("[markListened] progress insert error:", progressError.message);
    // Continue — still attempt activity_event and streak update
  }

  // ── 2. Write activity_event record ─────────────────────────────────────────
  const { data: activityEvent, error: eventError } = await supabase
    .from("activity_event")
    .insert({
      member_id: user.id,
      event_type: "daily_listened",
      content_id: contentId,
      metadata: { percent_completed: 80 },
      // occurred_at defaults to NOW() in DB
    })
    .select("id")
    .single();

  if (eventError) {
    console.error("[markListened] activity_event insert error:", eventError.message);
  }

  await awardMemberPoints({
    memberId: user.id,
    delta: POINT_VALUES.dailyPractice,
    reason: "daily_practice",
    description: "Daily practice completed",
    contentId,
    activityEventId: activityEvent?.id ?? null,
    idempotencyKey: `daily_practice:${user.id}:${now.toISOString().slice(0, 10)}`,
  });

  // ── 3. Fetch current member streak state ────────────────────────────────────
  const { data: member, error: memberFetchError } = await supabase
    .from("member")
    .select("last_practiced_at, practice_streak")
    .eq("id", user.id)
    .single();

  if (memberFetchError || !member) {
    console.error("[markListened] member fetch error:", memberFetchError?.message);
    return { newStreak: 0 };
  }

  // ── 4. Increment streak if appropriate ─────────────────────────────────────
  const lastPracticedAt = member.last_practiced_at
    ? new Date(member.last_practiced_at)
    : null;

  const newStreak = computeNewStreak(
    lastPracticedAt,
    member.practice_streak ?? 0,
    now
  );

  const { error: streakError } = await supabase
    .from("member")
    .update({
      last_practiced_at: now.toISOString(),
      practice_streak: newStreak,
    })
    .eq("id", user.id);

  if (streakError) {
    console.error("[markListened] streak update error:", streakError.message);
  }

  return { newStreak };
}

/**
 * syncListeningProgress — creates or refreshes an incomplete progress record
 * for the current member + content pair once meaningful playback has started.
 */
export async function syncListeningProgress(contentId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const now = new Date().toISOString();
  const { data: existing } = await supabase
    .from("progress")
    .select("id")
    .eq("member_id", user.id)
    .eq("content_id", contentId)
    .eq("completed", false)
    .order("listened_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase
      .from("progress")
      .update({ listened_at: now })
      .eq("id", existing.id);

    if (error) {
      console.error("[syncListeningProgress] progress update error:", error.message);
    }
    return;
  }

  const { error } = await supabase.from("progress").insert({
    member_id: user.id,
    content_id: contentId,
    completed: false,
    listened_at: now,
  });

  if (error) {
    console.error("[syncListeningProgress] progress insert error:", error.message);
  }
}

/**
 * markTrackCompleted — promote the newest incomplete progress record for an
 * audio track to completed, without firing daily-specific streak logic.
 */
export async function markTrackCompleted(contentId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const now = new Date().toISOString();
  const { data: incompleteProgress } = await supabase
    .from("progress")
    .select("id")
    .eq("member_id", user.id)
    .eq("content_id", contentId)
    .eq("completed", false)
    .order("listened_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (incompleteProgress?.id) {
    const { error } = await supabase
      .from("progress")
      .update({
        completed: true,
        listened_at: now,
      })
      .eq("id", incompleteProgress.id);

    if (error) {
      console.error("[markTrackCompleted] progress update error:", error.message);
    }
    return;
  }

  const { error } = await supabase.from("progress").insert({
    member_id: user.id,
    content_id: contentId,
    completed: true,
    listened_at: now,
  });

  if (error) {
    console.error("[markTrackCompleted] progress insert error:", error.message);
  }
}
