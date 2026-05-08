import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { courseAllowsSubscriptionAccess, getPublicCourseCatalog } from "@/lib/queries/get-courses";
import { hasActiveMemberAccess } from "@/lib/subscription/access";
import { SafeImage } from "@/components/media/SafeImage";

export const metadata = {
  title: "Courses — Positives",
  description: "Standalone and member-included Positives courses.",
};

function formatUsd(cents?: number | null) {
  if (!cents) return "Price coming soon";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export default async function CoursesPage() {
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

  const courses = await getPublicCourseCatalog(member?.id ?? null);
  const hasSubscriptionAccess = hasActiveMemberAccess(member?.subscription_status ?? null);
  const tierOrder: Record<string, number> = { level_1: 1, level_2: 2, level_3: 3, level_4: 4 };

  return (
    <main className="min-h-dvh bg-[#FAFAF8]">
      <section className="mx-auto max-w-6xl px-5 py-10 md:py-16">
        <div className="mb-8 max-w-3xl">
          <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.14em] text-primary">
            Positives Courses
          </p>
          <h1 className="heading-balance font-heading text-4xl font-bold leading-tight tracking-tight text-foreground md:text-6xl">
            Focused support you can keep.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
            Courses are here when you want a deeper dive. Your daily practice still stays at the center.
          </p>
        </div>

        {member ? (
          <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Your owned and membership-included courses also live in My Courses.
            </p>
            <Link href="/my-courses" className="btn-secondary inline-flex items-center justify-center">
              Open My Courses
            </Link>
          </div>
        ) : null}

        {courses.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course, index) => {
              const owned = course.access_source === "entitlement";
              const included =
                courseAllowsSubscriptionAccess(course) &&
                hasSubscriptionAccess &&
                course.tier_min &&
                member?.subscription_tier &&
                (tierOrder[course.tier_min] ?? 1) <= (tierOrder[member.subscription_tier] ?? 1);
              const progress = course.progress_percent ?? 0;
              const href = course.slug ? `/courses/${course.slug}` : "/courses";
              const gradient = [
                "linear-gradient(135deg, #2EC4B6, #2F6FED)",
                "linear-gradient(135deg, #10B981, #2563EB)",
                "linear-gradient(135deg, #F59E0B, #DB2777)",
              ][index % 3];

              return (
                <article key={course.id} className="flex min-h-full flex-col overflow-hidden rounded-2xl border border-border bg-card">
                  <Link
                    href={href}
                    aria-label={`View ${course.title}`}
                    className="relative block aspect-video overflow-hidden bg-surface-tint"
                  >
                    {course.cover_image_url ? (
                      <SafeImage
                        src={course.cover_image_url}
                        alt=""
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="object-cover transition-transform duration-300 hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="flex h-full items-end p-5" style={{ background: gradient }}>
                        <span className="font-heading text-xl font-bold leading-tight text-white">
                          {course.title}
                        </span>
                      </div>
                    )}
                  </Link>
                  <div className="flex flex-1 flex-col gap-3 p-5">
                    <div>
                      <Link href={href} className="font-heading text-xl font-bold leading-tight text-foreground transition-colors hover:text-primary">
                        {course.title}
                      </Link>
                      {course.description ? (
                        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                          {course.description}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs font-semibold text-muted-foreground">
                      <span>{course.lesson_count} lesson{course.lesson_count === 1 ? "" : "s"}</span>
                      {course.estimated_duration_seconds ? (
                        <span>{Math.round(course.estimated_duration_seconds / 3600)} hr</span>
                      ) : null}
                      <span>{course.price_cents ? formatUsd(course.price_cents) : included ? "Included" : "Access varies"}</span>
                    </div>

                    {(owned || included) && course.lesson_count > 0 ? (
                      <div className="mt-auto">
                        <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                          <span>{progress > 0 ? `${progress}% complete` : "Ready to start"}</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-border">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                    ) : null}

                    <Link
                      href={owned || included ? `/my-courses/${course.slug ?? course.id}` : href}
                      className={owned || included ? "btn-primary mt-auto inline-flex justify-center" : "btn-secondary mt-auto inline-flex justify-center"}
                    >
                      {owned || included
                        ? progress >= 100
                          ? "Review Course"
                          : progress > 0
                            ? "Continue Course"
                            : "Start Course"
                        : "View Course"}
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <h2 className="heading-balance font-heading text-2xl font-bold text-foreground">
              Courses are being prepared.
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
              When a course is published, it will appear here.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
