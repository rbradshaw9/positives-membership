import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getAccessibleCourses } from "@/lib/queries/get-courses";
import { getMonthlyArchive } from "@/lib/queries/get-monthly-archive";
import { CourseCard } from "@/components/courses/CourseCard";
import { MonthCard } from "@/components/library/MonthCard";

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

  if (!member || member.subscription_status !== "active") {
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
            <div
              className="flex flex-col items-center justify-center py-14 rounded-2xl border border-dashed text-center"
              style={{ borderColor: "var(--color-border)" }}
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
                style={{ background: "color-mix(in srgb, var(--color-primary) 10%, transparent)" }}
              >
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
              </div>
              <p className="font-semibold text-foreground mb-1">No courses yet</p>
              <p className="text-sm text-muted-foreground max-w-xs">
                Courses included with your membership will appear here as they're published.
              </p>
            </div>
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
            <div
              className="flex flex-col items-center justify-center py-14 rounded-2xl border border-dashed text-center"
              style={{ borderColor: "var(--color-border)" }}
            >
              <p className="font-semibold text-foreground mb-1">No archive yet</p>
              <p className="text-sm text-muted-foreground">Past monthly content will appear here as it's published.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
