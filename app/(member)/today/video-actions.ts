"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * app/(member)/today/video-actions.ts
 *
 * Tracks per-user video watch progress for gamification, reporting,
 * and resume-from-last-position. One row per (user, content_id).
 *
 * Called from VideoEmbed:
 *   - On play start (watchPercent=0, resumeAtSeconds=current position)
 *   - At 25/50/75/95% milestones
 *   - On pause (to capture exact resume position)
 *   - On ended (watchPercent=100)
 */
export async function recordVideoProgress({
  contentId,
  watchPercent,
  resumeAtSeconds,
}: {
  contentId?: string | null;
  watchPercent: number;
  resumeAtSeconds?: number;
}) {
  if (!contentId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const clampedPercent = Math.min(100, Math.max(0, Math.round(watchPercent)));
  const completed = clampedPercent >= 80;
  const now = new Date().toISOString();
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  const { data: existing } = await supabase
    .from("video_views")
    .select("id, last_seen_at, watch_percent, session_count, resume_at_seconds")
    .match({ user_id: user.id, content_id: contentId })
    .maybeSingle();

  if (existing) {
    const isNewSession = existing.last_seen_at < tenMinutesAgo;
    await supabase
      .from("video_views")
      .update({
        watch_percent: Math.max(existing.watch_percent, clampedPercent),
        completed: existing.watch_percent >= 80 || completed,
        last_seen_at: now,
        resume_at_seconds:
          resumeAtSeconds !== undefined
            ? resumeAtSeconds
            : existing.resume_at_seconds,
        session_count: isNewSession
          ? (existing.session_count ?? 1) + 1
          : existing.session_count,
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("video_views").insert({
      user_id: user.id,
      content_id: contentId,
      watch_percent: clampedPercent,
      completed,
      resume_at_seconds: resumeAtSeconds ?? 0,
      started_at: now,
      last_seen_at: now,
      session_count: 1,
    });
  }
}

/**
 * Returns the resume position (in seconds) for a given content item.
 * Returns 0 if no prior view exists.
 */
export async function getVideoResumePosition({
  contentId,
}: {
  contentId?: string | null;
}): Promise<number> {
  if (!contentId) return 0;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return 0;

  const { data } = await supabase
    .from("video_views")
    .select("resume_at_seconds")
    .match({ user_id: user.id, content_id: contentId })
    .maybeSingle();

  return data?.resume_at_seconds ?? 0;
}
