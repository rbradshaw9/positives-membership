"use client";

import { useState } from "react";
import Link from "next/link";
import type { CourseFull, CourseLesson, CourseModule, CourseSession } from "@/lib/queries/get-courses";

/**
 * components/courses/CourseOutline.tsx
 *
 * Accordion-style course outline: Module → Lesson → Session (if present).
 * Progress icons: ✓ completed, ▶ next up (first incomplete), ○ not started.
 */

function formatDuration(seconds: number | null): string {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m} min`;
}

function ProgressIcon({ completed, isNext }: { completed?: boolean; isNext?: boolean }) {
  if (completed) {
    return (
      <span
        className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center"
        style={{ background: "var(--color-primary)", color: "#fff" }}
        aria-label="Completed"
      >
        <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
          <path d="M10 3L5 8.5 2 5.5l-1 1 4 4 6-7-1-1z" />
        </svg>
      </span>
    );
  }
  if (isNext) {
    return (
      <span
        className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center border-2"
        style={{ borderColor: "var(--color-primary)", color: "var(--color-primary)" }}
        aria-label="Next up"
      >
        <svg width="8" height="8" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
          <polygon points="3,1 11,6 3,11" />
        </svg>
      </span>
    );
  }
  return (
    <span
      className="w-5 h-5 rounded-full flex-shrink-0 border-2"
      style={{ borderColor: "var(--color-border)" }}
      aria-label="Not started"
    />
  );
}

interface SessionRowProps {
  session: CourseSession;
  courseSlug: string;
}

function SessionRow({ session }: SessionRowProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 rounded-lg text-sm text-muted-foreground">
      <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: "var(--color-border)" }} />
      <span className="flex-1 line-clamp-1">{session.title}</span>
      {session.duration_seconds && (
        <span className="text-xs tabular-nums">{formatDuration(session.duration_seconds)}</span>
      )}
      {session.completed && (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" style={{ color: "var(--color-primary)", flexShrink: 0 }} aria-label="Complete">
          <path d="M10 3L5 8.5 2 5.5l-1 1 4 4 6-7-1-1z" />
        </svg>
      )}
    </div>
  );
}

interface LessonRowProps {
  lesson: CourseLesson;
  courseSlug: string;
  isNext: boolean;
}

function LessonRow({ lesson, courseSlug, isNext }: LessonRowProps) {
  const [open, setOpen] = useState(false);
  const hasSessions = lesson.sessions.length > 0;

  const href = `/library/courses/${courseSlug}/${lesson.id}`;

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-3">
        <Link
          href={href}
          className="flex items-center gap-3 flex-1 min-w-0 px-4 py-3 rounded-xl transition-colors hover:bg-surface-tint group"
          style={isNext ? { background: "color-mix(in srgb, var(--color-primary) 6%, transparent)" } : {}}
        >
          <ProgressIcon completed={lesson.completed} isNext={isNext} />
          <span
            className="flex-1 text-sm font-medium line-clamp-1 group-hover:text-primary transition-colors"
            style={lesson.completed ? { color: "var(--color-muted-foreground)" } : {}}
          >
            {lesson.title}
          </span>
          {lesson.duration_seconds && (
            <span className="text-xs text-muted-foreground tabular-nums flex-shrink-0">
              {formatDuration(lesson.duration_seconds)}
            </span>
          )}
        </Link>

        {hasSessions && (
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
            aria-expanded={open}
            aria-label={open ? "Collapse sessions" : "Expand sessions"}
          >
            <svg
              width="14" height="14" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2"
              className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
              aria-hidden="true"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        )}
      </div>

      {hasSessions && open && (
        <div className="ml-12 flex flex-col gap-0.5 mb-1">
          {lesson.sessions.map((s) => (
            <SessionRow key={s.id} session={s} courseSlug={courseSlug} />
          ))}
        </div>
      )}
    </div>
  );
}

interface CourseOutlineProps {
  course: CourseFull;
  courseSlug: string;
}

export function CourseOutline({ course, courseSlug }: CourseOutlineProps) {
  const [openModules, setOpenModules] = useState<Set<string>>(
    () => new Set([course.modules[0]?.id ?? ""])
  );

  function toggleModule(id: string) {
    setOpenModules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  // Find the first incomplete lesson across all modules
  let nextLessonId: string | null = null;
  outer: for (const mod of course.modules) {
    for (const lesson of mod.lessons) {
      if (!lesson.completed) {
        nextLessonId = lesson.id;
        break outer;
      }
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {course.modules.map((mod: CourseModule) => {
        const isOpen = openModules.has(mod.id);
        const moduleComplete = mod.lessons.every((l) => l.completed);

        return (
          <div
            key={mod.id}
            className="rounded-2xl border overflow-hidden"
            style={{ borderColor: "var(--color-border)" }}
          >
            {/* Module header */}
            <button
              type="button"
              onClick={() => toggleModule(mod.id)}
              className="w-full flex items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-surface-tint"
              style={{ background: "var(--color-surface, #fff)" }}
              aria-expanded={isOpen}
            >
              {moduleComplete && (
                <span
                  className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center"
                  style={{ background: "var(--color-primary)", color: "#fff" }}
                  aria-hidden="true"
                >
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor">
                    <path d="M10 3L5 8.5 2 5.5l-1 1 4 4 6-7-1-1z" />
                  </svg>
                </span>
              )}
              <span className="flex-1 font-heading font-semibold text-sm text-foreground">
                {mod.title}
              </span>
              <span className="text-xs text-muted-foreground flex-shrink-0">
                {mod.lessons.length} lesson{mod.lessons.length !== 1 ? "s" : ""}
              </span>
              <svg
                width="16" height="16" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2"
                className={`flex-shrink-0 transition-transform duration-200 text-muted-foreground ${isOpen ? "rotate-180" : ""}`}
                aria-hidden="true"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {/* Lessons */}
            {isOpen && (
              <div
                className="flex flex-col gap-0.5 px-2 pb-3 pt-1"
                style={{ borderTop: "1px solid var(--color-border)", background: "var(--color-surface, #fff)" }}
              >
                {mod.lessons.map((lesson: CourseLesson) => (
                  <LessonRow
                    key={lesson.id}
                    lesson={lesson}
                    courseSlug={courseSlug}
                    isNext={lesson.id === nextLessonId}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
