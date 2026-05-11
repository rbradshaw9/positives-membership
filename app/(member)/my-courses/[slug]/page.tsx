import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getCourseBySlug, memberCanAccessCourse } from "@/lib/queries/get-courses";
import { hasActiveMemberAccess } from "@/lib/subscription/access";
import { CourseOutline } from "@/components/courses/CourseOutline";
import { SafeImage } from "@/components/media/SafeImage";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await params;
  return {
    title: "Course — Positives",
    description: "View course lessons and continue your progress.",
  };
}

export default async function MyCourseDetailPage({ params }: Props) {
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

  if (!member) redirect("/account");

  const course = await getCourseBySlug(slug, member.id);
  if (!course) notFound();

  const hasSubscriptionAccess = hasActiveMemberAccess(member.subscription_status);
  const canAccess = await memberCanAccessCourse({
    memberId: member.id,
    memberTier: member.subscription_tier,
    hasSubscriptionAccess,
    courseId: course.id,
    courseTierMin: course.tier_min,
    courseAccessType: course.access_type,
    courseIsStandalonePurchasable: course.is_standalone_purchasable,
    courseStripePriceId: course.stripe_price_id,
    coursePriceCents: course.price_cents,
  });

  if (!canAccess) redirect("/library?upgrade=true");

  const progressPct =
    course.lesson_count > 0 ? Math.round((course.completed_count / course.lesson_count) * 100) : 0;
  const isComplete = course.lesson_count > 0 && course.completed_count >= course.lesson_count;
  const firstIncomplete =
    course.modules.flatMap((module) => module.lessons).find((lesson) => !lesson.completed) ??
    course.modules[0]?.lessons[0] ??
    null;

  return (
    <main className="member-container py-8 md:py-12">
      <Link href="/my-courses" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        My Courses
      </Link>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section>
          <div className="flex flex-col gap-5 md:flex-row">
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-border bg-surface-tint md:w-56 md:flex-shrink-0">
              {course.cover_image_url ? (
                <SafeImage
                  src={course.cover_image_url}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 100vw, 224px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full items-end bg-[linear-gradient(135deg,#2EC4B6,#2F6FED)] p-5">
                  <span className="font-heading text-lg font-bold leading-tight text-white">
                    {course.title}
                  </span>
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="heading-balance font-heading text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                {course.title}
              </h1>
              {course.description ? (
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  {course.description}
                </p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-3 text-sm text-muted-foreground">
                <span>{course.modules.length} module{course.modules.length === 1 ? "" : "s"}</span>
                <span>{course.lesson_count} lesson{course.lesson_count === 1 ? "" : "s"}</span>
                <span>{isComplete ? "Complete" : `${course.completed_count} done`}</span>
              </div>
            </div>
          </div>

          {course.resources && course.resources.length > 0 ? (
            <section className="mt-8 rounded-2xl border border-border bg-surface-tint/40 p-5">
              <h2 className="font-heading text-base font-semibold text-foreground">
                Course Resources
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {course.resources.map((resource) => (
                  <a
                    key={resource.id}
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {resource.file_type === "pdf" ? "PDF" : "Open"} {resource.label}
                  </a>
                ))}
              </div>
            </section>
          ) : null}

          <section className="mt-8">
            <h2 className="mb-4 font-heading text-xl font-bold text-foreground">
              Course Content
            </h2>
            {course.modules.length > 0 ? (
              <CourseOutline course={course} courseSlug={slug} />
            ) : (
              <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                Course content is being prepared.
              </div>
            )}
          </section>
        </section>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              Progress
            </p>
            <div className="mt-3 flex items-end justify-between gap-3">
              <span className="font-heading text-4xl font-bold text-foreground">{progressPct}%</span>
              <span className="pb-1 text-sm text-muted-foreground">
                {course.completed_count}/{course.lesson_count || 0}
              </span>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-border">
              <div className="h-full rounded-full bg-primary" style={{ width: `${progressPct}%` }} />
            </div>
            {firstIncomplete ? (
              <Link
                href={`/my-courses/${slug}/lessons/${firstIncomplete.slug ?? firstIncomplete.id}`}
                className="btn-primary mt-5 inline-flex w-full items-center justify-center"
              >
                {course.completed_count > 0 ? "Continue" : "Start course"}
              </Link>
            ) : null}
          </div>
        </aside>
      </div>
    </main>
  );
}
