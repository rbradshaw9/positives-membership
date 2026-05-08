import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasActiveMemberAccess } from "@/lib/subscription/access";
import { getMyCourses } from "@/lib/queries/get-courses";
import { CourseCard } from "@/components/courses/CourseCard";
import { EmptyState } from "@/components/member/EmptyState";

export const metadata = {
  title: "My Courses — Positives",
  description: "Courses you own or can access through your Positives membership.",
};

export const dynamic = "force-dynamic";

export default async function MyCoursesPage() {
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

  const courses = await getMyCourses(
    member.subscription_tier,
    member.id,
    hasActiveMemberAccess(member.subscription_status)
  );

  const inProgress = courses.filter((course) => (course.completed_count ?? 0) > 0);

  return (
    <main className="member-container py-8 md:py-12">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">
            Courses
          </p>
          <h1 className="heading-balance font-heading text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            My Courses
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Pick up where you left off, or revisit a course whenever it feels useful.
          </p>
        </div>
        <Link href="/courses" className="btn-secondary inline-flex items-center justify-center">
          Browse courses
        </Link>
      </div>

      {inProgress.length > 0 ? (
        <section className="mb-10 rounded-2xl border border-primary/20 bg-primary/5 p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Continue
          </p>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {inProgress.slice(0, 3).map((course, index) => (
              <CourseCard key={course.id} course={course} index={index} />
            ))}
          </div>
        </section>
      ) : null}

      {courses.length > 0 ? (
        <section aria-labelledby="all-courses-heading">
          <div className="mb-5">
            <h2 id="all-courses-heading" className="font-heading text-xl font-bold text-foreground">
              All Courses
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {courses.length} available course{courses.length === 1 ? "" : "s"}.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course, index) => (
              <CourseCard key={course.id} course={course} index={index} />
            ))}
          </div>
        </section>
      ) : (
        <EmptyState
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: "var(--color-primary)" }} aria-hidden="true">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          }
          title="No courses yet"
          subtitle="Purchased, granted, and membership-included courses will appear here."
          action={<Link href="/courses" className="btn-primary inline-flex items-center">Browse courses</Link>}
        />
      )}
    </main>
  );
}
