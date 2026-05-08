"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { POINT_VALUES, awardMemberPoints } from "@/lib/points/award";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";

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

async function awardLessonAndCoursePoints({
  supabase,
  memberId,
  courseId,
  lessonId,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  memberId: string;
  courseId: string;
  lessonId: string;
}) {
  const looseSupabase = asLooseSupabaseClient(supabase);
  const { data: activityEvent } = await looseSupabase
    .from("activity_event")
    .insert({
      member_id: memberId,
      event_type: "course_lesson_completed",
      metadata: { course_id: courseId, lesson_id: lessonId },
    })
    .select<{ id: string }>("id")
    .single();

  await awardMemberPoints({
    memberId,
    delta: POINT_VALUES.courseLessonComplete,
    reason: "course_lesson_complete",
    description: "Course lesson completed",
    courseId,
    activityEventId: activityEvent?.id ?? null,
    idempotencyKey: `course_lesson_complete:${memberId}:${lessonId}`,
    metadata: { lesson_id: lessonId },
  });

  const { data: lessons } = await looseSupabase
    .from("course_lesson")
    .select<{ id: string }[]>("id, course_module!inner(course_id)")
    .eq("course_module.course_id", courseId);

  const lessonIds = (lessons ?? []).map((lesson: { id: string }) => lesson.id);
  if (lessonIds.length === 0) return;

  const { data: progress } = await supabase
    .from("course_progress")
    .select("course_lesson_id")
    .eq("member_id", memberId)
    .eq("course_id", courseId)
    .eq("completed", true)
    .in("course_lesson_id", lessonIds);

  const completedIds = new Set((progress ?? []).map((row) => row.course_lesson_id));
  if (lessonIds.every((id: string) => completedIds.has(id))) {
    await looseSupabase.from("activity_event").insert({
      member_id: memberId,
      event_type: "course_completed",
      metadata: { course_id: courseId },
    });

    await awardMemberPoints({
      memberId,
      delta: POINT_VALUES.courseComplete,
      reason: "course_complete",
      description: "Course completed",
      courseId,
      idempotencyKey: `course_complete:${memberId}:${courseId}`,
    });
  }
}

// ─── Mark lesson complete ──────────────────────────────────────────────────────

export async function markLessonComplete(lessonId: string, courseId: string) {
  const { supabase, member } = await getMemberAndCourse(courseId);
  const looseSupabase = asLooseSupabaseClient(supabase);

  await looseSupabase.from("course_progress").upsert(
    {
      member_id: member.id,
      course_id: courseId,
      course_lesson_id: lessonId,
      status: "completed",
      started_at: new Date().toISOString(),
      last_viewed_at: new Date().toISOString(),
      completed: true,
      completed_at: new Date().toISOString(),
    },
    { onConflict: "member_id,course_lesson_id" }
  );

  await awardLessonAndCoursePoints({
    supabase,
    memberId: member.id,
    courseId,
    lessonId,
  });

  await updateEnrollmentProgress(supabase, member.id, courseId, lessonId);

  revalidatePath(`/library`);
  revalidatePath(`/my-courses`);
  revalidatePath(`/library/courses/[slug]`, "page");
  revalidatePath(`/my-courses/[slug]`, "page");
}

// ─── Mark lesson incomplete (undo) ────────────────────────────────────────────

export async function markLessonIncomplete(lessonId: string, courseId: string) {
  const { supabase, member } = await getMemberAndCourse(courseId);
  const looseSupabase = asLooseSupabaseClient(supabase);

  await looseSupabase
    .from("course_progress")
    .update({ completed: false, completed_at: null, auto_completed: false, status: "in_progress" })
    .eq("member_id", member.id)
    .eq("course_lesson_id", lessonId);

  await updateEnrollmentProgress(supabase, member.id, courseId, lessonId);

  revalidatePath(`/library`);
  revalidatePath(`/my-courses`);
  revalidatePath(`/library/courses/[slug]`, "page");
  revalidatePath(`/my-courses/[slug]`, "page");
}

// ─── Update progress from video milestone (auto-mark at 95%) ──────────────────

export async function updateCourseVideoProgress(
  lessonId: string,
  courseId: string,
  watchPercent: number
) {
  const { supabase, member } = await getMemberAndCourse(courseId);
  const looseSupabase = asLooseSupabaseClient(supabase);

  const isComplete = watchPercent >= 95;

  const { data: existing } = await supabase
    .from("course_progress")
    .select("id, video_watch_percent, completed")
    .match({ member_id: member.id, course_lesson_id: lessonId })
    .maybeSingle();

  if (existing) {
    const shouldAward = isComplete && !existing.completed;
    await looseSupabase
      .from("course_progress")
      .update({
        video_watch_percent: Math.max(existing.video_watch_percent, watchPercent),
        completed: existing.completed || isComplete,
        status: existing.completed || isComplete ? "completed" : "in_progress",
        started_at: new Date().toISOString(),
        last_viewed_at: new Date().toISOString(),
        auto_completed: isComplete && !existing.completed,
        completed_at: isComplete && !existing.completed ? new Date().toISOString() : undefined,
      })
      .eq("id", existing.id);

    if (shouldAward) {
      await awardLessonAndCoursePoints({
        supabase,
        memberId: member.id,
        courseId,
        lessonId,
      });
    }
  } else {
    await looseSupabase.from("course_progress").insert({
      member_id: member.id,
      course_id: courseId,
      course_lesson_id: lessonId,
      video_watch_percent: watchPercent,
      completed: isComplete,
      status: isComplete ? "completed" : "in_progress",
      started_at: new Date().toISOString(),
      last_viewed_at: new Date().toISOString(),
      auto_completed: isComplete,
      completed_at: isComplete ? new Date().toISOString() : undefined,
    });

    if (isComplete) {
      await awardLessonAndCoursePoints({
        supabase,
        memberId: member.id,
        courseId,
        lessonId,
      });
    }
  }

  if (isComplete) {
    await updateEnrollmentProgress(supabase, member.id, courseId, lessonId);
    revalidatePath(`/library`);
    revalidatePath(`/my-courses`);
    revalidatePath(`/library/courses/[slug]`, "page");
    revalidatePath(`/my-courses/[slug]`, "page");
  }
}

async function updateEnrollmentProgress(
  supabase: Awaited<ReturnType<typeof createClient>>,
  memberId: string,
  courseId: string,
  lessonId: string
) {
  const looseSupabase = asLooseSupabaseClient(supabase);
  const { data: lessons } = await looseSupabase
    .from("course_lesson")
    .select("id, course_module!inner(course_id)")
    .eq("course_module.course_id", courseId)
    .eq("status", "published");

  const lessonIds = ((lessons ?? []) as Array<{ id: string }>).map((lesson) => lesson.id);
  const { data: progress } = await looseSupabase
    .from("course_progress")
    .select("course_lesson_id")
    .eq("member_id", memberId)
    .eq("course_id", courseId)
    .eq("completed", true)
    .in("course_lesson_id", lessonIds.length > 0 ? lessonIds : ["00000000-0000-0000-0000-000000000000"]);

  const completedCount = ((progress ?? []) as Array<{ course_lesson_id: string | null }>).length;
  const progressPercent = lessonIds.length > 0 ? Math.round((completedCount / lessonIds.length) * 100) : 0;

  await looseSupabase
    .from("course_entitlement")
    .update({
      last_accessed_lesson_id: lessonId,
      last_accessed_at: new Date().toISOString(),
      progress_percent: progressPercent,
      completed_at: progressPercent >= 100 ? new Date().toISOString() : null,
    })
    .eq("member_id", memberId)
    .eq("course_id", courseId)
    .eq("status", "active");
}

export async function recordLessonViewed(lessonId: string, courseId: string) {
  const { supabase, member } = await getMemberAndCourse(courseId);
  const looseSupabase = asLooseSupabaseClient(supabase);
  await looseSupabase.from("course_progress").upsert(
    {
      member_id: member.id,
      course_id: courseId,
      course_lesson_id: lessonId,
      status: "in_progress",
      started_at: new Date().toISOString(),
      last_viewed_at: new Date().toISOString(),
    },
    { onConflict: "member_id,course_lesson_id" }
  );
  await updateEnrollmentProgress(supabase, member.id, courseId, lessonId);
}
