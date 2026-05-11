import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  courseAllowsSubscriptionAccess,
  getPublicCourseBySlug,
  memberCanAccessCourse,
  memberHasCourseEntitlement,
} from "@/lib/queries/get-courses";
import { hasActiveMemberAccess } from "@/lib/subscription/access";
import { SafeImage } from "@/components/media/SafeImage";
import { CourseCheckoutButton } from "../CourseCheckoutButton";

type Props = {
  params: Promise<{ slug: string }>;
};

function formatUsd(cents?: number | null) {
  if (!cents) return "Price coming soon";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function asStringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value
        .map((item) => (typeof item === "string" ? item : typeof item === "object" && item && "text" in item ? String((item as { text?: unknown }).text ?? "") : ""))
        .filter(Boolean)
    : [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const course = await getPublicCourseBySlug(slug);

  return {
    title: course ? `${course.title} — Positives` : "Course — Positives",
    description: course?.description ?? "Explore this Positives course.",
  };
}

export default async function PublicCourseDetailPage({ params }: Props) {
  const { slug } = await params;
  const course = await getPublicCourseBySlug(slug);
  if (!course) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: member } = user
    ? await supabase
        .from("member")
        .select("id, subscription_tier, subscription_status")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  const owned = member ? await memberHasCourseEntitlement(member.id, course.id) : false;
  const included = member && courseAllowsSubscriptionAccess(course)
    ? await memberCanAccessCourse({
        memberId: member.id,
        memberTier: member.subscription_tier,
        hasSubscriptionAccess: hasActiveMemberAccess(member.subscription_status),
        courseId: course.id,
        courseTierMin: course.tier_min,
        courseAccessType: course.access_type,
        courseIsStandalonePurchasable: course.is_standalone_purchasable,
        courseStripePriceId: course.stripe_price_id,
        coursePriceCents: course.price_cents,
      })
    : false;
  const hasAccess = owned || included;
  const hasPrice = Boolean(course.stripe_price_id && course.price_cents);
  const whatYouGet = asStringList(course.what_you_get);

  return (
    <main className="min-h-dvh bg-[#FAFAF8]">
      <section className="mx-auto max-w-6xl px-5 py-8 md:py-12">
        <Link href="/courses" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Courses
        </Link>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <section className="rounded-2xl border border-border bg-card p-5 md:p-7">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">
              Positives Course
            </p>
            <h1 className="heading-balance font-heading text-4xl font-bold leading-tight tracking-tight text-foreground md:text-5xl">
              {course.title}
            </h1>
            {course.description ? (
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
                {course.description}
              </p>
            ) : null}
            <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-muted-foreground">
              <span className="rounded-full border border-border bg-background px-3 py-1">
                {course.modules.length} module{course.modules.length === 1 ? "" : "s"}
              </span>
              <span className="rounded-full border border-border bg-background px-3 py-1">
                {course.lesson_count} lesson{course.lesson_count === 1 ? "" : "s"}
              </span>
              {course.estimated_duration_seconds ? (
                <span className="rounded-full border border-border bg-background px-3 py-1">
                  {Math.round(course.estimated_duration_seconds / 3600)} hr
                </span>
              ) : null}
            </div>

            <div className="relative mt-6 aspect-video overflow-hidden rounded-2xl border border-border bg-surface-tint">
              {course.cover_image_url ? (
                <SafeImage
                  src={course.cover_image_url}
                  alt=""
                  fill
                  sizes="(max-width: 1024px) 100vw, 760px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full items-end bg-[linear-gradient(135deg,#2EC4B6,#2F6FED)] p-6">
                  <span className="font-heading text-3xl font-bold text-white">
                    {course.title}
                  </span>
                </div>
              )}
            </div>
          </section>

          <aside className="lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="font-heading text-3xl font-bold text-foreground">
                {course.price_cents ? formatUsd(course.price_cents) : hasAccess ? "Included" : "Price coming soon"}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Keep access in your Positives course library.
              </p>
              <div className="mt-5">
                {hasAccess ? (
                  <Link href={`/my-courses/${course.slug ?? course.id}`} className="btn-primary inline-flex w-full justify-center">
                    Open in My Courses
                  </Link>
                ) : (
                  <CourseCheckoutButton
                    courseId={course.id}
                    disabled={!hasPrice}
                    signedIn={Boolean(user)}
                    priceLabel={formatUsd(course.price_cents)}
                    sourcePath={`/courses/${course.slug}`}
                  />
                )}
              </div>
            </div>
          </aside>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <section className="rounded-2xl border border-border bg-card p-5 md:p-7">
            <h2 className="heading-balance font-heading text-2xl font-bold text-foreground">
              What you’ll get
            </h2>
            {whatYouGet.length > 0 ? (
              <ul className="mt-4 grid gap-3 text-sm leading-relaxed text-muted-foreground">
                {whatYouGet.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Focused lessons, practical resources, and a course space you can return to at your own pace.
              </p>
            )}

            {course.full_description ? (
              <div
                className="prose prose-sm mt-6 max-w-none text-foreground/80"
                dangerouslySetInnerHTML={{ __html: course.full_description }}
              />
            ) : null}
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-heading text-xl font-bold text-foreground">
              Curriculum Preview
            </h2>
            <div className="mt-4 grid gap-3">
              {course.modules.map((module) => (
                <div key={module.id} className="rounded-xl border border-border bg-background p-4">
                  <h3 className="font-heading text-sm font-semibold text-foreground">{module.title}</h3>
                  <ol className="mt-3 grid gap-2 text-sm text-muted-foreground">
                    {module.lessons.map((lesson) => (
                      <li key={lesson.id} className="flex items-center justify-between gap-3">
                        <span>{lesson.title}</span>
                        {lesson.is_preview && lesson.slug ? (
                          <Link href={`/courses/${slug}/lessons/${lesson.slug}`} className="text-xs font-semibold text-primary">
                            Preview
                          </Link>
                        ) : (
                          <span className="text-xs">Locked</span>
                        )}
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
