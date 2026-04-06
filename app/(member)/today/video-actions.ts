"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * app/(member)/today/video-actions.ts
 *
 * Tracks per-user video watch progress for gamification, reporting,
 * and resume-from-last-position.
 *
 * Supports two tracking modes:
 *   1. Content-based:  one row per (user_id, content_id) — daily/weekly/monthly videos
 *   2. Lesson-based:   one row per (user_id, course_lesson_id) — course lesson videos
 *
 * Called from VideoEmbed:
 *   - On play start (watchPercent=0, resumeAtSeconds=current position)
 *   - At 25/50/75/95% milestones
 *   - On pause (to capture exact resume position)
 *   - On ended (watchPercent=100)
 */
export async function recordVideoProgress({
  contentId,
  courseLessonId,
  watchPercent,
  resumeAtSeconds,
}: {
  contentId?: string | null;
  courseLessonId?: string | null;
  watchPercent: number;
  resumeAtSeconds?: number;
}) {
  // Must have at least one tracking key
  if (!contentId && !courseLessonId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const clampedPercent = Math.min(100, Math.max(0, Math.round(watchPercent)));
  const completed = clampedPercent >= 80;
  const now = new Date().toISOString();
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  // Build the match filter — either content_id or course_lesson_id
  const matchFilter: Record<string, string> = { user_id: user.id };
  if (courseLessonId) {
    matchFilter.course_lesson_id = courseLessonId;
  } else {
    matchFilter.content_id = contentId!;
  }

  const { data: existing } = await supabase
    .from("video_views")
    .select("id, last_seen_at, watch_percent, session_count, resume_at_seconds")
    .match(matchFilter)
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
      content_id: contentId || null,
      course_lesson_id: courseLessonId || null,
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
 * Returns the resume position (in seconds) for a given content or lesson.
 * Returns 0 if no prior view exists.
 */
export async function getVideoResumePosition({
  contentId,
  courseLessonId,
}: {
  contentId?: string | null;
  courseLessonId?: string | null;
}): Promise<number> {
  if (!contentId && !courseLessonId) return 0;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return 0;

  const matchFilter: Record<string, string> = { user_id: user.id };
  if (courseLessonId) {
    matchFilter.course_lesson_id = courseLessonId;
  } else {
    matchFilter.content_id = contentId!;
  }

  const { data } = await supabase
    .from("video_views")
    .select("resume_at_seconds")
    .match(matchFilter)
    .maybeSingle();

  return data?.resume_at_seconds ?? 0;
}

/**
 * Returns the last course lesson the user was watching for a given course.
 * Used for the "Continue Learning" resume card on the course detail page.
 */
export async function getLastWatchedLesson(courseId: string): Promise<{
  lessonId: string;
  lessonTitle: string;
  moduleTitle: string;
  resumeAtSeconds: number;
  watchPercent: number;
} | null> {
  if (!courseId) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Get all lessons for this course, then find which one the user last watched
  const { data } = await supabase
    .from("video_views")
    .select(`
      course_lesson_id,
      resume_at_seconds,
      watch_percent,
      last_seen_at,
      course_lesson!inner (
        id,
        title,
        course_module!inner (
          title,
          course_id
        )
      )
    `)
    .eq("user_id", user.id)
    .not("course_lesson_id", "is", null)
    .order("last_seen_at", { ascending: false })
    .limit(20);

  if (!data || data.length === 0) return null;

  // Filter to just this course's lessons
  const match = data.find((row: Record<string, unknown>) => {
    const lesson = row.course_lesson as Record<string, unknown> | null;
    const mod = lesson?.course_module as Record<string, unknown> | null;
    return mod?.course_id === courseId;
  });

  if (!match) return null;

  const lesson = match.course_lesson as Record<string, unknown>;
  const mod = lesson.course_module as Record<string, unknown>;

  return {
    lessonId: lesson.id as string,
    lessonTitle: lesson.title as string,
    moduleTitle: mod.title as string,
    resumeAtSeconds: match.resume_at_seconds ?? 0,
    watchPercent: match.watch_percent ?? 0,
  };
}
