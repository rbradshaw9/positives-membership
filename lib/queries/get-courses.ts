import { createClient } from "@/lib/supabase/server";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";

const TIER_ORDER: Record<string, number> = {
  level_1: 1,
  level_2: 2,
  level_3: 3,
  level_4: 4,
};

function tierLevel(tier: string | null): number {
  return TIER_ORDER[tier ?? "level_1"] ?? 1;
}

export type CourseResource = {
  id: string;
  course_id: string;
  module_id: string | null;
  lesson_id: string | null;
  media_asset_id?: string | null;
  scope: "course" | "module" | "lesson";
  label: string;
  description: string | null;
  url: string;
  s3_key: string | null;
  source_url: string | null;
  source_system: string | null;
  file_type: string;
  content_type: string | null;
  size_bytes: number | null;
  sort_order: number;
  import_status: "copied" | "external" | "failed" | "manual";
};

export type CourseWithProgress = {
  id: string;
  title: string;
  slug: string | null;
  description: string | null;
  short_description?: string | null;
  full_description?: string | null;
  cover_image_url: string | null;
  promo_video_url?: string | null;
  tier_min: string | null;
  sort_order: number;
  price_cents?: number | null;
  stripe_price_id?: string | null;
  is_standalone_purchasable?: boolean;
  points_price?: number | null;
  points_unlock_enabled?: boolean;
  access_type?: string | null;
  estimated_duration_seconds?: number | null;
  lesson_count: number;
  completed_count: number;
  progress_percent?: number;
  last_accessed_lesson_id?: string | null;
  access_source?: "subscription" | "entitlement";
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
  slug: string | null;
  title: string;
  description: string | null;
  body?: string | null;
  video_url: string | null;
  audio_url?: string | null;
  duration_seconds: number | null;
  resources?: string | null;
  course_resources?: CourseResource[];
  sort_order: number;
  status?: string;
  is_preview?: boolean;
  sessions: CourseSession[];
  completed?: boolean;
};

export type CourseSession = {
  id: string;
  title: string;
  description: string | null;
  body?: string | null;
  video_url: string | null;
  duration_seconds: number | null;
  resources?: string | null;
  sort_order: number;
  completed?: boolean;
};

export type CourseFull = {
  id: string;
  title: string;
  slug: string | null;
  description: string | null;
  short_description?: string | null;
  full_description?: string | null;
  cover_image_url: string | null;
  promo_video_url?: string | null;
  tier_min: string | null;
  price_cents?: number | null;
  stripe_price_id?: string | null;
  is_standalone_purchasable?: boolean;
  access_type?: string | null;
  estimated_duration_seconds?: number | null;
  what_you_get?: unknown;
  faq?: unknown;
  modules: CourseModule[];
  resources?: CourseResource[];
  lesson_count: number;
  completed_count: number;
  progress_percent?: number;
  last_accessed_lesson_id?: string | null;
};

export type LessonWithContext = CourseLesson & {
  course_id: string;
  course_title: string;
  course_slug: string | null;
  module_title: string;
  course_tier_min: string | null;
  course_access_type?: string | null;
  course_is_standalone_purchasable?: boolean | null;
  course_stripe_price_id?: string | null;
  course_price_cents?: number | null;
  prev_lesson_id: string | null;
  next_lesson_id: string | null;
  prev_lesson_slug: string | null;
  next_lesson_slug: string | null;
  has_access?: boolean;
};

type EntitlementRow = {
  course_id: string;
  last_accessed_lesson_id?: string | null;
  progress_percent?: number | null;
  expires_at?: string | null;
};

type CourseAccessShape = {
  access_type?: string | null;
  is_standalone_purchasable?: boolean | null;
  stripe_price_id?: string | null;
  price_cents?: number | null;
};

function isActiveEntitlement(row: EntitlementRow) {
  if (!row.expires_at) return true;
  return new Date(row.expires_at).getTime() > Date.now();
}

export function courseAllowsSubscriptionAccess(course: CourseAccessShape) {
  if (course.access_type === "paid" || course.access_type === "manual" || course.access_type === "purchase_only") {
    return false;
  }
  if (
    course.access_type === "free" ||
    course.access_type === "membership_included" ||
    course.access_type === "membership_only" ||
    course.access_type === "membership_or_purchase"
  ) {
    return true;
  }

  return !(
    course.is_standalone_purchasable &&
    course.stripe_price_id &&
    typeof course.price_cents === "number" &&
    course.price_cents > 0
  );
}

async function getActiveEntitlements(memberId: string): Promise<Map<string, EntitlementRow>> {
  const supabase = asLooseSupabaseClient(await createClient());
  let { data, error } = await supabase
    .from("course_entitlement")
    .select<EntitlementRow[]>("course_id, last_accessed_lesson_id, progress_percent, expires_at")
    .eq("member_id", memberId)
    .eq("status", "active");

  if (error?.code === "42703") {
    const fallback = await supabase
      .from("course_entitlement")
      .select<{ course_id: string }[]>("course_id")
      .eq("member_id", memberId)
      .eq("status", "active");
    data = fallback.data?.map((row) => ({ course_id: row.course_id })) ?? null;
    error = fallback.error;
  }

  if (error) {
    console.error("[get-courses] entitlement lookup error:", error.message);
    return new Map();
  }

  return new Map(
    (data ?? [])
      .filter(isActiveEntitlement)
      .map((row: EntitlementRow) => [row.course_id, row])
  );
}

async function getActiveEntitledCourseIds(memberId: string): Promise<Set<string>> {
  return new Set((await getActiveEntitlements(memberId)).keys());
}

export async function memberHasCourseEntitlement(
  memberId: string,
  courseId: string
): Promise<boolean> {
  const entitledIds = await getActiveEntitledCourseIds(memberId);
  return entitledIds.has(courseId);
}

export async function memberCanAccessCourse(params: {
  memberId: string;
  memberTier: string | null;
  hasSubscriptionAccess: boolean;
  courseId: string;
  courseTierMin: string | null;
  courseAccessType?: string | null;
  courseIsStandalonePurchasable?: boolean | null;
  courseStripePriceId?: string | null;
  coursePriceCents?: number | null;
}): Promise<boolean> {
  const subscriptionAllowed = courseAllowsSubscriptionAccess({
    access_type: params.courseAccessType,
    is_standalone_purchasable: params.courseIsStandalonePurchasable,
    stripe_price_id: params.courseStripePriceId,
    price_cents: params.coursePriceCents,
  });

  if (
    subscriptionAllowed &&
    params.hasSubscriptionAccess &&
    tierLevel(params.courseTierMin) <= tierLevel(params.memberTier)
  ) {
    return true;
  }

  return memberHasCourseEntitlement(params.memberId, params.courseId);
}

export const canUserAccessCourse = memberCanAccessCourse;

export async function canUserAccessLesson(params: {
  memberId?: string | null;
  memberTier?: string | null;
  hasSubscriptionAccess?: boolean;
  courseId: string;
  courseTierMin: string | null;
  courseAccessType?: string | null;
  courseIsStandalonePurchasable?: boolean | null;
  courseStripePriceId?: string | null;
  coursePriceCents?: number | null;
  isPreview?: boolean | null;
}): Promise<boolean> {
  if (params.isPreview) return true;
  if (!params.memberId) return false;
  return memberCanAccessCourse({
    memberId: params.memberId,
    memberTier: params.memberTier ?? null,
    hasSubscriptionAccess: Boolean(params.hasSubscriptionAccess),
    courseId: params.courseId,
    courseTierMin: params.courseTierMin,
    courseAccessType: params.courseAccessType,
    courseIsStandalonePurchasable: params.courseIsStandalonePurchasable,
    courseStripePriceId: params.courseStripePriceId,
    coursePriceCents: params.coursePriceCents,
  });
}

function courseDescription<T extends { short_description?: string | null; description?: string | null }>(course: T) {
  return course.short_description ?? course.description ?? null;
}

async function getLessonCounts(courseIds: string[]) {
  const supabase = asLooseSupabaseClient(await createClient());
  const { data } = await supabase
    .from("course_lesson")
    .select<{ id: string; course_module: { course_id: string } }[]>(
      "id, course_module!inner(course_id)"
    )
    .in("course_module.course_id", courseIds)
    .eq("status", "published");

  const counts = new Map<string, number>();
  for (const lesson of data ?? []) {
    const courseId = (lesson.course_module as unknown as { course_id: string })?.course_id;
    if (!courseId) continue;
    counts.set(courseId, (counts.get(courseId) ?? 0) + 1);
  }
  return counts;
}

async function getCompletedCounts(memberId: string, courseIds: string[]) {
  const supabase = asLooseSupabaseClient(await createClient());
  const { data } = await supabase
    .from("course_progress")
    .select<{ course_id: string; course_lesson_id: string | null }[]>("course_id, course_lesson_id")
    .eq("member_id", memberId)
    .eq("completed", true)
    .in("course_id", courseIds)
    .not("course_lesson_id", "is", null);

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    counts.set(row.course_id, (counts.get(row.course_id) ?? 0) + 1);
  }
  return counts;
}

export async function getAccessibleCourses(
  memberTier: string | null,
  memberId: string,
  hasSubscriptionAccess = true
): Promise<CourseWithProgress[]> {
  const supabase = asLooseSupabaseClient(await createClient());
  const memberLevel = tierLevel(memberTier);
  const entitlements = await getActiveEntitlements(memberId);

  let { data: courses, error } = await supabase
    .from("course")
    .select<CourseWithProgress[]>(
      "id, title, slug, description, short_description, full_description, cover_image_url, promo_video_url, tier_min, sort_order, price_cents, stripe_price_id, is_standalone_purchasable, points_price, points_unlock_enabled, access_type, estimated_duration_seconds"
    )
    .eq("status", "published")
    .order("sort_order", { ascending: true });

  if (error?.code === "42703") {
    const fallback = await supabase
      .from("course")
      .select<CourseWithProgress[]>(
        "id, title, slug, description, cover_image_url, tier_min, sort_order, price_cents, stripe_price_id, is_standalone_purchasable, points_price, points_unlock_enabled"
      )
      .eq("status", "published")
      .order("sort_order", { ascending: true });
    courses = fallback.data;
    error = fallback.error;
  }

  if (error || !courses) return [];

  const accessible = courses.filter(
    (course) =>
      (courseAllowsSubscriptionAccess(course) &&
        hasSubscriptionAccess &&
        tierLevel(course.tier_min) <= memberLevel) ||
      entitlements.has(course.id)
  );

  if (accessible.length === 0) return [];

  const courseIds = accessible.map((course) => course.id);
  const [lessonCounts, completedCounts] = await Promise.all([
    getLessonCounts(courseIds),
    getCompletedCounts(memberId, courseIds),
  ]);

  return accessible.map((course) => {
    const lessonCount = lessonCounts.get(course.id) ?? 0;
    const completedCount = completedCounts.get(course.id) ?? 0;
    const entitlement = entitlements.get(course.id);
    return {
      ...course,
      description: courseDescription(course),
      lesson_count: lessonCount,
      completed_count: completedCount,
      progress_percent:
        entitlement?.progress_percent ?? (lessonCount > 0 ? Math.round((completedCount / lessonCount) * 100) : 0),
      last_accessed_lesson_id: entitlement?.last_accessed_lesson_id ?? null,
      access_source:
        entitlements.has(course.id) &&
        !(
          courseAllowsSubscriptionAccess(course) &&
          hasSubscriptionAccess &&
          tierLevel(course.tier_min) <= memberLevel
        )
          ? "entitlement"
          : "subscription",
    };
  });
}

export async function getMyCourses(
  memberTier: string | null,
  memberId: string,
  hasSubscriptionAccess = true
) {
  return getAccessibleCourses(memberTier, memberId, hasSubscriptionAccess);
}

export async function getPublicCourseCatalog(memberId?: string | null) {
  const supabase = asLooseSupabaseClient(await createClient());
  const entitlements = memberId ? await getActiveEntitlements(memberId) : new Map<string, EntitlementRow>();

  let { data: courses, error } = await supabase
    .from("course")
    .select<CourseWithProgress[]>(
      "id, title, slug, description, short_description, cover_image_url, tier_min, sort_order, price_cents, stripe_price_id, is_standalone_purchasable, points_price, points_unlock_enabled, access_type, estimated_duration_seconds"
    )
    .eq("status", "published")
    .or("visibility.is.null,visibility.neq.hidden")
    .order("sort_order", { ascending: true });

  if (error?.code === "42703") {
    const fallback = await supabase
      .from("course")
      .select<CourseWithProgress[]>(
        "id, title, slug, description, cover_image_url, tier_min, sort_order, price_cents, stripe_price_id, is_standalone_purchasable, points_price, points_unlock_enabled"
      )
      .eq("status", "published")
      .order("sort_order", { ascending: true });
    courses = fallback.data;
    error = fallback.error;
  }

  if (error || !courses?.length) return [];

  const courseIds = courses.map((course) => course.id);
  const [lessonCounts, completedCounts] = await Promise.all([
    getLessonCounts(courseIds),
    memberId ? getCompletedCounts(memberId, courseIds) : Promise.resolve(new Map<string, number>()),
  ]);

  return courses.map((course) => {
    const lessonCount = lessonCounts.get(course.id) ?? 0;
    const completedCount = completedCounts.get(course.id) ?? 0;
    const entitlement = entitlements.get(course.id);
    return {
      ...course,
      description: courseDescription(course),
      lesson_count: lessonCount,
      completed_count: completedCount,
      progress_percent:
        entitlement?.progress_percent ?? (lessonCount > 0 ? Math.round((completedCount / lessonCount) * 100) : 0),
      last_accessed_lesson_id: entitlement?.last_accessed_lesson_id ?? null,
      access_source: entitlements.has(course.id) ? "entitlement" : undefined,
    } satisfies CourseWithProgress;
  });
}

async function getResourcesForCourse(courseId: string): Promise<CourseResource[]> {
  const supabase = asLooseSupabaseClient(await createClient());
  const { data, error } = await supabase
    .from("course_resource")
    .select<CourseResource[]>(
      "id, course_id, module_id, lesson_id, media_asset_id, scope, label, description, url, s3_key, source_url, source_system, file_type, content_type, size_bytes, sort_order, import_status"
    )
    .eq("course_id", courseId)
    .eq("status", "active")
    .order("sort_order", { ascending: true });

  if (error) {
    if (error.code === "42P01" || error.code === "PGRST205") return [];
    console.error("[get-courses] resource lookup failed:", error.message);
    return [];
  }

  return (data ?? []) as CourseResource[];
}

export async function getCourseBySlug(
  slug: string,
  memberId: string
): Promise<CourseFull | null> {
  const supabase = asLooseSupabaseClient(await createClient());

  let { data: course, error } = await supabase
    .from("course")
    .select<CourseFull>(
      "id, title, slug, description, short_description, full_description, cover_image_url, promo_video_url, tier_min, price_cents, stripe_price_id, is_standalone_purchasable, access_type, estimated_duration_seconds, what_you_get, faq"
    )
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error?.code === "42703") {
    const fallback = await supabase
      .from("course")
      .select<CourseFull>(
        "id, title, slug, description, cover_image_url, tier_min, price_cents, stripe_price_id, is_standalone_purchasable"
      )
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();
    course = fallback.data;
    error = fallback.error;
  }

  if (error || !course) return null;

  const { data: modules } = await supabase
    .from("course_module")
    .select<CourseModule[]>("id, title, description, sort_order")
    .eq("course_id", course.id)
    .order("sort_order", { ascending: true });

  const moduleIds = (modules ?? []).map((module) => module.id);
  if (moduleIds.length === 0) {
    return { ...course, description: courseDescription(course), modules: [], resources: [], lesson_count: 0, completed_count: 0 };
  }

  let lessonResult = await supabase
      .from("course_lesson")
      .select<CourseLesson[]>(
        "id, slug, module_id, title, description, video_url, audio_url, duration_seconds, resources, sort_order, status, is_preview"
      )
      .in("module_id", moduleIds)
      .eq("status", "published")
      .order("sort_order", { ascending: true });

  if (lessonResult.error?.code === "42703") {
    lessonResult = await supabase
      .from("course_lesson")
      .select<CourseLesson[]>("id, module_id, title, description, video_url, duration_seconds, resources, sort_order")
      .in("module_id", moduleIds)
      .order("sort_order", { ascending: true });
  }

  const [{ data: progressData }, resources] = await Promise.all([
    supabase
      .from("course_progress")
      .select<{ course_lesson_id: string | null; completed: boolean }[]>("course_lesson_id, completed")
      .eq("member_id", memberId)
      .eq("course_id", course.id)
      .eq("completed", true),
    getResourcesForCourse(course.id),
  ]);
  const lessons = lessonResult.data;

  const completedLessons = new Set(
    (progressData ?? [])
      .filter((progress) => progress.course_lesson_id)
      .map((progress) => progress.course_lesson_id!)
  );
  const resourcesByLesson = new Map<string, CourseResource[]>();
  const courseResources = resources.filter((resource) => resource.scope === "course");
  for (const resource of resources) {
    if (!resource.lesson_id) continue;
    const list = resourcesByLesson.get(resource.lesson_id) ?? [];
    list.push(resource);
    resourcesByLesson.set(resource.lesson_id, list);
  }

  let lessonCount = 0;
  let completedCount = 0;
  const builtModules = (modules ?? []).map((module) => {
    const moduleLessons = ((lessons ?? []) as Array<CourseLesson & { module_id?: string }>)
      .filter((lesson) => lesson.module_id === module.id)
      .map((lesson) => {
        lessonCount++;
        const completed = completedLessons.has(lesson.id);
        if (completed) completedCount++;
        return {
          ...lesson,
          sessions: [],
          completed,
          course_resources: resourcesByLesson.get(lesson.id) ?? [],
        };
      });
    return { ...module, lessons: moduleLessons };
  });

  return {
    ...course,
    description: courseDescription(course),
    modules: builtModules,
    resources: courseResources,
    lesson_count: lessonCount,
    completed_count: completedCount,
    progress_percent: lessonCount > 0 ? Math.round((completedCount / lessonCount) * 100) : 0,
  };
}

export async function getPublicCourseBySlug(slug: string): Promise<CourseFull | null> {
  const supabase = asLooseSupabaseClient(await createClient());
  let { data: course, error } = await supabase
    .from("course")
    .select<CourseFull>(
      "id, title, slug, description, short_description, full_description, cover_image_url, promo_video_url, tier_min, price_cents, stripe_price_id, is_standalone_purchasable, access_type, estimated_duration_seconds, what_you_get, faq"
    )
    .eq("slug", slug)
    .eq("status", "published")
    .or("visibility.is.null,visibility.neq.hidden")
    .maybeSingle();

  if (error?.code === "42703") {
    const fallback = await supabase
      .from("course")
      .select<CourseFull>(
        "id, title, slug, description, cover_image_url, tier_min, price_cents, stripe_price_id, is_standalone_purchasable"
      )
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();
    course = fallback.data;
    error = fallback.error;
  }

  if (error || !course) return null;
  const outline = await getCourseOutline(course.id);
  return {
    ...course,
    description: courseDescription(course),
    modules: outline.modules,
    lesson_count: outline.lessonCount,
    completed_count: 0,
  };
}

async function getCourseOutline(courseId: string) {
  const supabase = asLooseSupabaseClient(await createClient());
  const { data: modules } = await supabase
    .from("course_module")
    .select<CourseModule[]>("id, title, description, sort_order")
    .eq("course_id", courseId)
    .order("sort_order", { ascending: true });

  const moduleIds = (modules ?? []).map((module) => module.id);
  if (moduleIds.length === 0) return { modules: [] as CourseModule[], lessonCount: 0 };

  const lessonResult = await supabase
    .from("course_lesson")
    .select<CourseLesson[]>("id, slug, module_id, title, description, video_url, audio_url, duration_seconds, resources, sort_order, status, is_preview")
    .in("module_id", moduleIds)
    .eq("status", "published")
    .order("sort_order", { ascending: true });
  let lessons = lessonResult.data;

  if (lessonResult.error?.code === "42703") {
    const fallback = await supabase
      .from("course_lesson")
      .select<CourseLesson[]>("id, module_id, title, description, video_url, duration_seconds, resources, sort_order")
      .in("module_id", moduleIds)
      .order("sort_order", { ascending: true });
    lessons = fallback.data;
  }

  let lessonCount = 0;
  const built = (modules ?? []).map((module) => {
    const moduleLessons = ((lessons ?? []) as Array<CourseLesson & { module_id?: string }>)
      .filter((lesson) => lesson.module_id === module.id)
      .map((lesson) => {
        lessonCount++;
        return { ...lesson, sessions: [] };
      });
    return { ...module, lessons: moduleLessons };
  });

  return { modules: built, lessonCount };
}

export async function getCourseLesson(
  lessonIdOrSlug: string,
  memberId: string
): Promise<LessonWithContext | null> {
  const supabase = asLooseSupabaseClient(await createClient());
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      lessonIdOrSlug
    );

  let lessonQuery = supabase
    .from("course_lesson")
    .select<
      CourseLesson & {
        module_id: string;
        course_module: {
          id: string;
          title: string;
          course_id: string;
          course: {
            id: string;
            title: string;
            slug: string | null;
            tier_min: string | null;
            access_type?: string | null;
            is_standalone_purchasable?: boolean | null;
            stripe_price_id?: string | null;
            price_cents?: number | null;
          };
        };
      }
    >(
      "id, slug, title, description, body, video_url, audio_url, duration_seconds, resources, sort_order, status, is_preview, module_id, course_module!inner(id, title, course_id, course!inner(id, title, slug, tier_min, access_type, is_standalone_purchasable, stripe_price_id, price_cents))"
    )
    .neq("status", "archived");

  lessonQuery = isUuid ? lessonQuery.eq("id", lessonIdOrSlug) : lessonQuery.eq("slug", lessonIdOrSlug);
  const { data: lesson, error } = await lessonQuery.maybeSingle();

  if (error || !lesson) return null;

  const courseModule = lesson.course_module;
  const course = courseModule.course;
  const courseId = course.id;

  const { data: allLessons } = await supabase
    .from("course_lesson")
    .select<{ id: string; slug: string | null; module_id: string; sort_order: number; course_module: { course_id: string } }[]>(
      "id, slug, module_id, sort_order, course_module!inner(course_id)"
    )
    .eq("course_module.course_id", courseId)
    .eq("status", "published")
    .order("sort_order", { ascending: true });

  const orderedLessons = allLessons ?? [];
  const idx = orderedLessons.findIndex((row) => row.id === lesson.id);
  const prev = idx > 0 ? orderedLessons[idx - 1] : null;
  const next = idx >= 0 && idx < orderedLessons.length - 1 ? orderedLessons[idx + 1] : null;

  const [{ data: progress }, resources] = await Promise.all([
    supabase
      .from("course_progress")
      .select<{ course_lesson_id: string | null; completed: boolean }[]>("course_lesson_id, completed")
      .eq("member_id", memberId)
      .eq("course_id", courseId)
      .eq("completed", true),
    getResourcesForCourse(courseId),
  ]);

  const lessonCompleted = (progress ?? []).some((row) => row.course_lesson_id === lesson.id);
  const lessonResources = resources.filter((resource) => resource.lesson_id === lesson.id);

  return {
    id: lesson.id,
    slug: lesson.slug,
    title: lesson.title,
    description: lesson.description,
    body: lesson.body,
    video_url: lesson.video_url,
    audio_url: lesson.audio_url,
    duration_seconds: lesson.duration_seconds,
    resources: lesson.resources,
    course_resources: lessonResources,
    sort_order: lesson.sort_order,
    status: lesson.status,
    is_preview: lesson.is_preview,
    sessions: [],
    completed: lessonCompleted,
    course_id: courseId,
    course_title: course.title,
    course_slug: course.slug,
    course_tier_min: course.tier_min,
    course_access_type: course.access_type,
    course_is_standalone_purchasable: course.is_standalone_purchasable,
    course_stripe_price_id: course.stripe_price_id,
    course_price_cents: course.price_cents,
    module_title: courseModule.title,
    prev_lesson_id: prev?.id ?? null,
    next_lesson_id: next?.id ?? null,
    prev_lesson_slug: prev?.slug ?? null,
    next_lesson_slug: next?.slug ?? null,
  };
}

export async function getPublicCourseLesson(
  courseSlug: string,
  lessonSlug: string
): Promise<(LessonWithContext & { locked: boolean }) | null> {
  const supabase = asLooseSupabaseClient(await createClient());
  const { data: courseRow } = await supabase
    .from("course")
    .select<{ id: string }>("id")
    .eq("slug", courseSlug)
    .eq("status", "published")
    .maybeSingle();

  if (!courseRow) return null;

  const { data: lesson, error } = await supabase
    .from("course_lesson")
    .select<
      CourseLesson & {
        module_id: string;
        course_module: { id: string; title: string; course_id: string; course: { id: string; title: string; slug: string | null; tier_min: string | null } };
      }
    >(
      "id, slug, title, description, body, video_url, audio_url, duration_seconds, resources, sort_order, status, is_preview, module_id, course_module!inner(id, title, course_id, course!inner(id, title, slug, tier_min))"
    )
    .eq("slug", lessonSlug)
    .eq("status", "published")
    .eq("course_module.course_id", courseRow.id)
    .maybeSingle();

  if (error || !lesson) return null;
  const course = lesson.course_module.course;
  return {
    ...lesson,
    sessions: [],
    completed: false,
    course_id: course.id,
    course_title: course.title,
    course_slug: course.slug,
    course_tier_min: course.tier_min,
    module_title: lesson.course_module.title,
    prev_lesson_id: null,
    next_lesson_id: null,
    prev_lesson_slug: null,
    next_lesson_slug: null,
    locked: !lesson.is_preview,
  };
}
