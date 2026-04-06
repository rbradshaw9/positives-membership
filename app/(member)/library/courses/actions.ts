"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * app/(member)/library/courses/actions.ts
 *
 * Server actions for course progress tracking.
 * - markLessonComplete / markLessonIncomplete: manual toggle
 * - updateCourseVideoProgress: called by VideoEmbed at milestones; auto-marks at 95%
 */

async function getMemberAndCourse(courseId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { data: member } = await supabase
    .from("member")
    .select("id, subscription_tier")
    .eq("id", user.id)
    .single();

  if (!member) throw new Error("Member not found");

  const { data: course } = await supabase
    .from("course")
    .select("id, tier_min, slug")
    .eq("id", courseId)
    .single();

  if (!course) throw new Error("Course not found");

  return { supabase, member, course };
}

// ─── Mark lesson complete ──────────────────────────────────────────────────────

export async function markLessonComplete(lessonId: string, courseId: string) {
  const { supabase, member } = await getMemberAndCourse(courseId);

  await supabase.from("course_progress").upsert(
    {
      member_id: member.id,
      course_id: courseId,
      course_lesson_id: lessonId,
      completed: true,
      completed_at: new Date().toISOString(),
    },
    { onConflict: "member_id,course_lesson_id" }
  );

  revalidatePath(`/library`);
  revalidatePath(`/library/courses/[slug]`, "page");
}

// ─── Mark lesson incomplete (undo) ────────────────────────────────────────────

export async function markLessonIncomplete(lessonId: string, courseId: string) {
  const { supabase, member } = await getMemberAndCourse(courseId);

  await supabase
    .from("course_progress")
    .update({ completed: false, completed_at: null, auto_completed: false })
    .match({ member_id: member.id, course_lesson_id: lessonId });

  revalidatePath(`/library`);
  revalidatePath(`/library/courses/[slug]`, "page");
}

// ─── Update progress from video milestone (auto-mark at 95%) ──────────────────

export async function updateCourseVideoProgress(
  lessonId: string,
  courseId: string,
  watchPercent: number
) {
  const { supabase, member } = await getMemberAndCourse(courseId);

  const isComplete = watchPercent >= 95;

  const { data: existing } = await supabase
    .from("course_progress")
    .select("id, video_watch_percent, completed")
    .match({ member_id: member.id, course_lesson_id: lessonId })
    .maybeSingle();

  if (existing) {
    await supabase
      .from("course_progress")
      .update({
        video_watch_percent: Math.max(existing.video_watch_percent, watchPercent),
        completed: existing.completed || isComplete,
        auto_completed: isComplete && !existing.completed,
        completed_at: isComplete && !existing.completed ? new Date().toISOString() : undefined,
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("course_progress").insert({
      member_id: member.id,
      course_id: courseId,
      course_lesson_id: lessonId,
      video_watch_percent: watchPercent,
      completed: isComplete,
      auto_completed: isComplete,
      completed_at: isComplete ? new Date().toISOString() : undefined,
    });
  }

  if (isComplete) {
    revalidatePath(`/library`);
    revalidatePath(`/library/courses/[slug]`, "page");
  }
}
