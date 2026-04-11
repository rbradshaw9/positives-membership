import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getAccessibleCourses } from "@/lib/queries/get-courses";
import { getMonthlyArchive } from "@/lib/queries/get-monthly-archive";
import { EmptyState } from "@/components/member/EmptyState";
import { CourseCard } from "@/components/courses/CourseCard";
import { MonthCard } from "@/components/library/MonthCard";
import { hasActiveMemberAccess } from "@/lib/subscription/access";

/**
 * app/(member)/library/page.tsx
 *
 * Member Library — Content Dashboard.
 * Two sections:
 *   1. Your Courses — tier-gated courses with progress bars
 *   2. Monthly Archive — rolling 12-month window of past content
 */

export const metadata = {
  title: "Library — Positives",
  description: "Access your courses and monthly archive of Positives content.",
};

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
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

  if (!member || !hasActiveMemberAccess(member.subscription_status)) {
    redirect("/account");
  }

  const [courses, archive] = await Promise.all([
    getAccessibleCourses(member.subscription_tier, member.id),
    getMonthlyArchive(12),
  ]);

  return (
    <main className="member-container py-8 md:py-12">
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="mb-10">
        <h1 className="heading-balance font-heading font-bold text-3xl md:text-4xl text-foreground tracking-tight mb-2">
          Library
        </h1>
        <p className="text-muted-foreground text-base">
          Your courses and past practice, all in one place.
        </p>
      </div>

      <div className="flex flex-col gap-14">
        {/* ── YOUR COURSES ─────────────────────────────────────────────────── */}
        <section aria-labelledby="courses-heading">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--color-primary)" }}>
                Your Courses
              </p>
              <h2 id="courses-heading" className="font-heading font-bold text-xl text-foreground">
                {courses.length > 0
                  ? `${courses.length} Course${courses.length !== 1 ? "s" : ""}`
                  : "Courses"}
              </h2>
            </div>
          </div>

          {courses.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
              {courses.map((course, i) => (
                <CourseCard key={course.id} course={course} index={i} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={
                <svg
                  width="24" height="24" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="1.5"
                  style={{ color: "var(--color-primary)" }}
                  aria-hidden="true"
                >
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              }
              title="No courses yet"
              subtitle="Courses included with your membership will appear here as they are published."
            />
          )}
        </section>

        {/* ── MONTHLY ARCHIVE ──────────────────────────────────────────────── */}
        <section aria-labelledby="archive-heading">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--color-primary)" }}>
              Monthly Archive
            </p>
            <h2 id="archive-heading" className="font-heading font-bold text-xl text-foreground">
              Past Practice
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              The last 12 months of daily practices, weekly principles, and monthly themes.
            </p>
          </div>

          {archive.length > 0 ? (
            <div className="flex flex-col gap-2">
              {archive.map((month) => (
                <MonthCard key={month.id} month={month} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={
                <svg
                  width="24" height="24" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="1.5"
                  style={{ color: "var(--color-primary)" }}
                  aria-hidden="true"
                >
                  <path d="M3 6h18" />
                  <path d="M8 6V4h8v2" />
                  <rect x="4" y="6" width="16" height="14" rx="2" />
                </svg>
              }
              title="No archive yet"
              subtitle="Past monthly content will appear here once a full month has been completed and archived."
              action={<a href="/today" className="btn-primary inline-flex items-center">Go to Today</a>}
            />
          )}
        </section>
      </div>
    </main>
  );
}
