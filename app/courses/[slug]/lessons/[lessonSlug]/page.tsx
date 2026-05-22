import Link from "next/link";
import { notFound } from "next/navigation";
import { sanitizeEventHtml } from "@/lib/content/sanitize-event-html";
import { getPublicCourseLesson } from "@/lib/queries/get-courses";

type Props = {
  params: Promise<{ slug: string; lessonSlug: string }>;
};

export const metadata = {
  title: "Course Preview — Positives",
};

export default async function PublicCourseLessonPage({ params }: Props) {
  const { slug, lessonSlug } = await params;
  const lesson = await getPublicCourseLesson(slug, lessonSlug);
  if (!lesson) notFound();
  const lessonBody = sanitizeEventHtml(lesson.body);

  return (
    <main className="min-h-dvh bg-[#FAFAF8]">
      <section className="mx-auto max-w-3xl px-5 py-8 md:py-12">
        <Link href={`/courses/${slug}`} className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to course
        </Link>

        <article className="rounded-2xl border border-border bg-card p-5 md:p-7">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">
            {lesson.locked ? "Locked Lesson" : "Preview Lesson"}
          </p>
          <h1 className="heading-balance font-heading text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            {lesson.title}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{lesson.module_title}</p>

          {lesson.locked ? (
            <div className="mt-6 rounded-2xl border border-primary/20 bg-primary/5 p-5">
              <h2 className="font-heading text-xl font-bold text-foreground">
                This lesson is inside the full course.
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Purchase or open the course from your account to continue.
              </p>
              <Link href={`/courses/${slug}`} className="btn-primary mt-4 inline-flex">
                View Course
              </Link>
            </div>
          ) : (
            <div className="mt-6">
              {lessonBody ? (
                <div
                  className="prose prose-sm max-w-none text-foreground/80"
                  dangerouslySetInnerHTML={{ __html: lessonBody }}
                />
              ) : lesson.description ? (
                <p className="text-sm leading-relaxed text-muted-foreground">{lesson.description}</p>
              ) : (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  This preview lesson is being prepared.
                </p>
              )}
            </div>
          )}
        </article>
      </section>
    </main>
  );
}
