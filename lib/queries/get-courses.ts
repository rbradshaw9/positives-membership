import { createClient } from "@/lib/supabase/server";

/**
 * lib/queries/get-courses.ts
 *
 * Fetches course data for the member Library dashboard and detail pages.
 * All functions enforce tier access — only courses where tier_min ≤ member tier
 * are returned from getAccessibleCourses().
 */

const TIER_ORDER: Record<string, number> = {
  level_1: 1,
  level_2: 2,
  level_3: 3,
  level_4: 4,
};

function tierLevel(tier: string | null): number {
  return TIER_ORDER[tier ?? "level_1"] ?? 1;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type CourseWithProgress = {
  id: string;
  title: string;
  slug: string | null;
  description: string | null;
  cover_image_url: string | null;
  tier_min: string | null;
  sort_order: number;
  /** Total published lessons across all modules */
  lesson_count: number;
  /** Lessons the member has marked complete */
  completed_count: number;
};

export type CourseModule = {
  id: string;
  title: string;
  description: string | null;
  sort_order: number;
  lessons: CourseLesson[];
};

export type CourseLesson = {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  duration_seconds: number | null;
  sort_order: number;
  sessions: CourseSession[];
  /** Injected from progress query */
  completed?: boolean;
};

export type CourseSession = {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  duration_seconds: number | null;
  sort_order: number;
  /** Injected from progress query */
  completed?: boolean;
};

export type CourseFull = {
  id: string;
  title: string;
  slug: string | null;
  description: string | null;
  cover_image_url: string | null;
  tier_min: string | null;
  modules: CourseModule[];
  lesson_count: number;
  completed_count: number;
};

export type LessonWithContext = CourseLesson & {
  course_id: string;
  course_title: string;
  course_slug: string | null;
  module_title: string;
  prev_lesson_id: string | null;
  next_lesson_id: string | null;
};

// ─── Accessible courses (library dashboard) ───────────────────────────────────

export async function getAccessibleCourses(
  memberTier: string | null,
  memberId: string
): Promise<CourseWithProgress[]> {
  const supabase = await createClient();
  const memberLevel = tierLevel(memberTier);

  const { data: courses, error: courseError } = await supabase
    .from("course")
    .select("id, title, slug, description, cover_image_url, tier_min, sort_order")
    .eq("status", "published")
    .order("sort_order", { ascending: true });

  if (courseError || !courses) return [];

  // Filter to tiers the member can access
  const accessible = courses.filter(
    (c) => tierLevel(c.tier_min) <= memberLevel
  );

  if (accessible.length === 0) return [];

  const courseIds = accessible.map((c) => c.id);

  // Count lessons per course
  const { data: lessonCounts } = await supabase
    .from("course_lesson")
    .select("id, module_id, course_module!inner(course_id)")
    .in("course_module.course_id", courseIds);

  // Count completions per course for this member
  const { data: progressData } = await supabase
    .from("course_progress")
    .select("course_id, course_lesson_id, completed")
    .eq("member_id", memberId)
    .eq("completed", true)
    .in("course_id", courseIds)
    .not("course_lesson_id", "is", null);

  const lessonsByCourse = new Map<string, number>();
  const completedByCourse = new Map<string, number>();

  for (const lesson of lessonCounts ?? []) {
    const courseId: string = (lesson.course_module as unknown as { course_id: string })?.course_id;
    if (!courseId) continue;
    lessonsByCourse.set(courseId, (lessonsByCourse.get(courseId) ?? 0) + 1);
  }

  for (const p of progressData ?? []) {
    completedByCourse.set(p.course_id, (completedByCourse.get(p.course_id) ?? 0) + 1);
  }

  return accessible.map((c) => ({
    ...c,
    lesson_count: lessonsByCourse.get(c.id) ?? 0,
    completed_count: completedByCourse.get(c.id) ?? 0,
  }));
}

// ─── Full course with hierarchy (course detail page) ──────────────────────────

export async function getCourseBySlug(
  slug: string,
  memberId: string
): Promise<CourseFull | null> {
  const supabase = await createClient();

  const { data: course, error } = await supabase
    .from("course")
    .select("id, title, slug, description, cover_image_url, tier_min, status")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error || !course) return null;

  // Fetch modules → lessons → sessions
  const { data: modules } = await supabase
    .from("course_module")
    .select("id, title, description, sort_order")
    .eq("course_id", course.id)
    .order("sort_order", { ascending: true });

  if (!modules || modules.length === 0) {
    return { ...course, modules: [], lesson_count: 0, completed_count: 0 };
  }

  const moduleIds = modules.map((m) => m.id);

  const { data: lessons } = await supabase
    .from("course_lesson")
    .select("id, module_id, title, description, video_url, duration_seconds, sort_order")
    .in("module_id", moduleIds)
    .order("sort_order", { ascending: true });

  const lessonIds = (lessons ?? []).map((l) => l.id);

  const { data: sessions } = await supabase
    .from("course_session")
    .select("id, lesson_id, title, description, video_url, duration_seconds, sort_order")
    .in("lesson_id", lessonIds)
    .order("sort_order", { ascending: true });

  // Fetch member progress
  const { data: progressData } = await supabase
    .from("course_progress")
    .select("course_lesson_id, course_session_id, completed")
    .eq("member_id", memberId)
    .eq("course_id", course.id)
    .eq("completed", true);

  const completedLessons = new Set(
    (progressData ?? [])
      .filter((p) => p.course_lesson_id)
      .map((p) => p.course_lesson_id!)
  );
  const completedSessions = new Set(
    (progressData ?? [])
      .filter((p) => p.course_session_id)
      .map((p) => p.course_session_id!)
  );

  // Build hierarchy
  const sessionsByLesson = new Map<string, CourseSession[]>();
  for (const s of sessions ?? []) {
    if (!s.lesson_id) continue;
    const list = sessionsByLesson.get(s.lesson_id) ?? [];
    list.push({ ...s, completed: completedSessions.has(s.id) });
    sessionsByLesson.set(s.lesson_id, list);
  }

  let lessonCount = 0;
  let completedCount = 0;

  const builtModules: CourseModule[] = modules.map((m) => {
    const moduleLesson = (lessons ?? []).filter((l) => l.module_id === m.id);
    const builtLessons: CourseLesson[] = moduleLesson.map((l) => {
      lessonCount++;
      if (completedLessons.has(l.id)) completedCount++;
      return {
        ...l,
        sessions: sessionsByLesson.get(l.id) ?? [],
        completed: completedLessons.has(l.id),
      };
    });
    return { ...m, lessons: builtLessons };
  });

  return { ...course, modules: builtModules, lesson_count: lessonCount, completed_count: completedCount };
}

// ─── Single lesson with prev/next (lesson viewer) ─────────────────────────────

export async function getCourseLesson(
  lessonId: string,
  memberId: string
): Promise<LessonWithContext | null> {
  const supabase = await createClient();

  const { data: lesson, error } = await supabase
    .from("course_lesson")
    .select(
      "id, title, description, body, video_url, duration_seconds, resources, sort_order, module_id, course_module!inner(id, title, course_id, course!inner(id, title, slug))"
    )
    .eq("id", lessonId)
    .maybeSingle();

  if (error || !lesson) return null;

  const courseModule = lesson.course_module;
  const course = (courseModule as unknown as { course?: { id: string; title: string; slug: string | null } })?.course;

  const moduleId: string = courseModule?.id ?? "";
  const courseId: string = course?.id ?? "";

  // Get all lessons in this module for prev/next
  const { data: allLessons } = await supabase
    .from("course_lesson")
    .select("id, sort_order")
    .eq("module_id", moduleId)
    .order("sort_order", { ascending: true });

  const idx = (allLessons ?? []).findIndex((l) => l.id === lessonId);
  const prev_lesson_id = idx > 0 ? (allLessons![idx - 1]?.id ?? null) : null;
  const next_lesson_id =
    idx < (allLessons ?? []).length - 1 ? (allLessons![idx + 1]?.id ?? null) : null;

  // Sessions for this lesson
  const { data: sessions } = await supabase
    .from("course_session")
    .select("id, title, description, video_url, duration_seconds, sort_order")
    .eq("lesson_id", lessonId)
    .order("sort_order", { ascending: true });

  // Progress
  const { data: progress } = await supabase
    .from("course_progress")
    .select("course_lesson_id, course_session_id, completed")
    .eq("member_id", memberId)
    .eq("course_id", courseId)
    .eq("completed", true);

  const completedSessions = new Set(
    (progress ?? []).filter((p) => p.course_session_id).map((p) => p.course_session_id!)
  );
  const lessonCompleted = (progress ?? []).some((p) => p.course_lesson_id === lessonId);

  return {
    id: lesson.id,
    title: lesson.title,
    description: lesson.description,
    // @ts-expect-error — extra field from admin import
    body: (lesson as { body?: string | null }).body ?? null,
    video_url: lesson.video_url,
    duration_seconds: lesson.duration_seconds,
    sort_order: lesson.sort_order,
    sessions: (sessions ?? []).map((s) => ({
      ...s,
      completed: completedSessions.has(s.id),
    })),
    completed: lessonCompleted,
    course_id: courseId,
    course_title: course?.title ?? "",
    course_slug: course?.slug ?? null,
    module_title: courseModule?.title ?? "",
    prev_lesson_id,
    next_lesson_id,
  };
}
