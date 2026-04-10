import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCourseBySlug } from "@/lib/queries/get-courses";
import { getLastWatchedLesson } from "@/app/(member)/today/video-actions";
import { CourseOutline } from "@/components/courses/CourseOutline";
import Link from "next/link";
import type { Metadata } from "next";
import { hasActiveMemberAccess } from "@/lib/subscription/access";

/**
 * app/(member)/library/courses/[slug]/page.tsx
 *
 * Course detail page — shows description, progress, and the full
 * Module → Lesson → Session outline.
 */

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await params;
  return {
    title: `Course — Positives`,
    description: `View course lessons and track your progress.`,
  };
}

const TIER_ORDER: Record<string, number> = {
  level_1: 1, level_2: 2, level_3: 3, level_4: 4,
};

export default async function CourseDetailPage({ params }: Props) {
  const { slug } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: member } = await supabase
    .from("member")
    .select("id, subscription_tier, subscription_status")
    .eq("id", user.id)
    .single();

  if (!member || !hasActiveMemberAccess(member.subscription_status)) redirect("/account");

  const course = await getCourseBySlug(slug, member.id);

  if (!course) notFound();

  // Tier access check
  const memberLevel = TIER_ORDER[member.subscription_tier ?? "level_1"] ?? 1;
  const requiredLevel = TIER_ORDER[course.tier_min ?? "level_1"] ?? 1;

  if (memberLevel < requiredLevel) {
    redirect("/library?upgrade=true");
  }

  const progressPct =
    course.lesson_count > 0
      ? Math.round((course.completed_count / course.lesson_count) * 100)
      : 0;
  const isComplete = course.lesson_count > 0 && course.completed_count >= course.lesson_count;

  // Fetch the last watched lesson for the "Continue Learning" card
  const lastWatched = await getLastWatchedLesson(course.id);

  // Find the first incomplete lesson for the "Continue" CTA
  let nextLessonId: string | null = null;
  outer: for (const mod of course.modules) {
    for (const lesson of mod.lessons) {
      if (!lesson.completed) {
        nextLessonId = lesson.id;
        break outer;
      }
    }
  }
  // If all complete, use the first lesson
  const startLessonId =
    nextLessonId ?? course.modules[0]?.lessons[0]?.id ?? null;

  return (
    <main className="member-container py-8 md:py-12">
      {/* ── Back ─────────────────────────────────────────────────────────── */}
      <Link
        href="/library"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Library
      </Link>

      <div className="flex flex-col gap-8">
        {/* ── Course header ─────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row gap-6">
          {/* Cover */}
          {course.cover_image_url && (
            <div className="flex-shrink-0 w-full md:w-48 rounded-2xl overflow-hidden border border-border" style={{ aspectRatio: "16/9" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={course.cover_image_url} alt="" className="w-full h-full object-cover" />
            </div>
          )}

          <div className="flex flex-col gap-3 flex-1">
            {course.tier_min && (
              <span
                className="self-start text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full"
                style={{
                  background: "color-mix(in srgb, var(--color-primary) 12%, transparent)",
                  color: "var(--color-primary)",
                }}
              >
                {course.tier_min.replace("_", " ")}
              </span>
            )}
            <h1 className="heading-balance font-heading font-bold text-2xl md:text-3xl text-foreground tracking-tight">
              {course.title}
            </h1>
            {course.description && (
              <p className="text-foreground/70 leading-relaxed">{course.description}</p>
            )}

            {/* Stats */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
              <span>{course.modules.length} module{course.modules.length !== 1 ? "s" : ""}</span>
              <span>·</span>
              <span>{course.lesson_count} lesson{course.lesson_count !== 1 ? "s" : ""}</span>
              {course.lesson_count > 0 && (
                <>
                  <span>·</span>
                  <span style={{ color: isComplete ? "var(--color-primary)" : undefined }}>
                    {isComplete ? "Complete ✓" : `${course.completed_count} of ${course.lesson_count} done`}
                  </span>
                </>
              )}
            </div>

            {/* Progress bar */}
            {course.lesson_count > 0 && (
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--color-border)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${progressPct}%`,
                      background: isComplete
                        ? "var(--color-primary)"
                        : "linear-gradient(90deg, var(--color-primary), color-mix(in srgb, var(--color-primary) 70%, var(--color-accent)))",
                    }}
                  />
                </div>
                <span className="text-xs font-medium text-muted-foreground w-8 text-right">{progressPct}%</span>
              </div>
            )}

            {/* CTA */}
            {startLessonId && (
              <div className="mt-1">
                <Link
                  href={`/library/courses/${slug}/${startLessonId}`}
                  className="btn-primary inline-flex items-center gap-2"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <polygon points="5,3 19,12 5,21" />
                  </svg>
                  {isComplete ? "Review from start" : course.completed_count > 0 ? "Continue" : "Start course"}
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* ── Continue Learning card ───────────────────────────────────── */}
        {lastWatched && lastWatched.watchPercent < 95 && (
          <Link
            href={`/library/courses/${slug}/${lastWatched.lessonId}`}
            className="group flex items-center gap-4 p-4 md:p-5 rounded-2xl border transition-all duration-200 hover:shadow-md"
            style={{
              borderColor: "color-mix(in srgb, var(--color-primary) 25%, var(--color-border))",
              background: "color-mix(in srgb, var(--color-primary) 4%, var(--color-surface, #fff))",
            }}
          >
            <div
              className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: "var(--color-primary)", color: "#fff" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <polygon points="5,3 19,12 5,21" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider mb-0.5" style={{ color: "var(--color-primary)" }}>
                Continue Learning
              </p>
              <p className="text-sm font-medium text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                {lastWatched.lessonTitle}
              </p>
              <p className="text-xs text-muted-foreground">
                {lastWatched.moduleTitle} · {Math.round(lastWatched.watchPercent)}% watched
              </p>
            </div>
            <svg
              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              className="flex-shrink-0 text-muted-foreground group-hover:text-primary transition-colors" aria-hidden="true"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        )}

        {/* ── Outline ──────────────────────────────────────────────────── */}
        {course.modules.length > 0 ? (
          <div>
            <h2 className="font-heading font-semibold text-lg text-foreground mb-4">
              Course Content
            </h2>
            <CourseOutline course={course} courseSlug={slug} />
          </div>
        ) : (
          <div
            className="py-12 flex items-center justify-center rounded-2xl border border-dashed text-center"
            style={{ borderColor: "var(--color-border)" }}
          >
            <p className="text-muted-foreground text-sm">Course content is being prepared.</p>
          </div>
        )}
      </div>
    </main>
  );
}
