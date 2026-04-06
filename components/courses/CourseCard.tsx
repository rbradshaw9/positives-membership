import Link from "next/link";
import type { CourseWithProgress } from "@/lib/queries/get-courses";

/**
 * components/courses/CourseCard.tsx
 *
 * Library dashboard card for a single course.
 * Shows cover art (or branded gradient), title, lesson count, and progress bar.
 */

// Branded gradient pool — rotated by sort order
const GRADIENTS = [
  "linear-gradient(135deg, #2EC4B6 0%, #1a7a72 100%)",
  "linear-gradient(135deg, #1d8cf8 0%, #0d5fa3 100%)",
  "linear-gradient(135deg, #8B5CF6 0%, #5b21b6 100%)",
  "linear-gradient(135deg, #F59E0B 0%, #b45309 100%)",
  "linear-gradient(135deg, #EC4899 0%, #9d174d 100%)",
  "linear-gradient(135deg, #10B981 0%, #065f46 100%)",
];

const TIER_LABELS: Record<string, string> = {
  level_1: "All Members",
  level_2: "Level 2+",
  level_3: "Level 3+",
  level_4: "Level 4",
};

interface CourseCardProps {
  course: CourseWithProgress;
  index: number;
}

export function CourseCard({ course, index }: CourseCardProps) {
  const gradient = GRADIENTS[index % GRADIENTS.length];
  const progressPct =
    course.lesson_count > 0
      ? Math.round((course.completed_count / course.lesson_count) * 100)
      : 0;
  const isComplete = course.lesson_count > 0 && course.completed_count >= course.lesson_count;

  const href = `/library/courses/${course.slug ?? course.id}`;

  return (
    <Link
      href={href}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-transparent transition-all duration-200 hover:border-primary/30 hover:shadow-lg hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      style={{ background: "var(--color-surface, #ffffff)" }}
    >
      {/* Cover art */}
      <div
        className="relative w-full overflow-hidden"
        style={{ aspectRatio: "16/9" }}
      >
        {course.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={course.cover_image_url}
            alt={course.title}
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
          />
        ) : (
          <div
            className="w-full h-full flex items-end p-4"
            style={{ background: gradient }}
          >
            <span className="font-heading font-bold text-white/90 text-lg leading-tight line-clamp-2 drop-shadow-sm">
              {course.title}
            </span>
          </div>
        )}

        {/* Completion badge */}
        {isComplete && (
          <div
            className="absolute top-2.5 right-2.5 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold backdrop-blur-sm"
            style={{ background: "rgba(46,196,182,0.9)", color: "#fff" }}
          >
            <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
              <path d="M10 3L5 8.5 2 5.5l-1 1 4 4 6-7-1-1z" />
            </svg>
            Complete
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        {/* Title (only shown if no gradient — otherwise it's in the cover) */}
        {course.cover_image_url && (
          <h3 className="font-heading font-bold text-base leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-2">
            {course.title}
          </h3>
        )}
        {!course.cover_image_url && (
          <h3 className="font-heading font-bold text-base leading-snug text-foreground group-hover:text-primary transition-colors sr-only">
            {course.title}
          </h3>
        )}

        {/* Meta */}
        <div className="flex items-center gap-2 flex-wrap">
          {course.tier_min && (
            <span
              className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{
                background: "color-mix(in srgb, var(--color-primary) 12%, transparent)",
                color: "var(--color-primary)",
              }}
            >
              {TIER_LABELS[course.tier_min] ?? course.tier_min}
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            {course.lesson_count} lesson{course.lesson_count !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Progress */}
        {course.lesson_count > 0 && (
          <div className="mt-auto pt-2 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {isComplete
                  ? "Complete"
                  : course.completed_count > 0
                  ? `${course.completed_count} of ${course.lesson_count} done`
                  : "Not started"}
              </span>
              <span className="text-xs font-medium text-foreground">{progressPct}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "var(--color-border)" }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${progressPct}%`,
                  background: isComplete
                    ? "var(--color-primary)"
                    : "linear-gradient(90deg, var(--color-primary) 0%, color-mix(in srgb, var(--color-primary) 70%, var(--color-accent)) 100%)",
                }}
              />
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}
