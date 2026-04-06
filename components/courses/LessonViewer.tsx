"use client";

import { useState, useTransition } from "react";
import { VideoEmbed } from "@/components/media/VideoEmbed";
import { markLessonComplete, markLessonIncomplete, updateCourseVideoProgress } from "@/app/(member)/library/courses/actions";
import type { LessonWithContext } from "@/lib/queries/get-courses";
import Link from "next/link";

/**
 * components/courses/LessonViewer.tsx
 *
 * Full-page viewer for a course lesson.
 * - Branded Vimeo video player (via VideoEmbed with full feature parity)
 * - Auto-marks complete at 95% via VideoEmbed milestone callback
 * - Manual "Mark as Complete" checkbox
 * - Body content rendering
 * - Resources section
 * - Prev/Next lesson navigation
 */

interface LessonViewerProps {
  lesson: LessonWithContext;
  memberId: string;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  return `${m} min`;
}

export function LessonViewer({ lesson, memberId }: LessonViewerProps) {
  const [completed, setCompleted] = useState(lesson.completed ?? false);
  const [isPending, startTransition] = useTransition();

  // Called by VideoEmbed at each milestone — auto-marks at 95%
  async function handleVideoMilestone(watchPercent: number) {
    if (watchPercent >= 95 && !completed) {
      startTransition(async () => {
        await updateCourseVideoProgress(lesson.id, lesson.course_id, watchPercent);
        setCompleted(true);
      });
    }
  }

  function handleToggleComplete() {
    startTransition(async () => {
      if (completed) {
        await markLessonIncomplete(lesson.id, lesson.course_id);
        setCompleted(false);
      } else {
        await markLessonComplete(lesson.id, lesson.course_id);
        setCompleted(true);
      }
    });
  }

  // Extract Vimeo ID from video_url
  const vimeoId = lesson.video_url?.match(/vimeo\.com\/(\d+)/)?.[1] ?? lesson.video_url ?? null;
  const hasVideo = !!vimeoId;

  return (
    <div className="member-container py-8 md:py-10 flex flex-col gap-8">
      {/* ── Breadcrumb ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/library" className="hover:text-foreground transition-colors">Library</Link>
        <span aria-hidden="true">/</span>
        <Link
          href={`/library/courses/${lesson.course_slug ?? lesson.course_id}`}
          className="hover:text-foreground transition-colors"
        >
          {lesson.course_title}
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-foreground font-medium line-clamp-1">{lesson.title}</span>
      </div>

      {/* ── Lesson header ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {lesson.module_title}
        </p>
        <h1 className="heading-balance font-heading font-bold text-2xl md:text-3xl text-foreground leading-tight tracking-tight">
          {lesson.title}
        </h1>
        <div className="flex items-center gap-3 flex-wrap">
          {lesson.duration_seconds && (
            <span className="text-sm text-muted-foreground">
              {formatDuration(lesson.duration_seconds)}
            </span>
          )}
          {completed && (
            <span
              className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ background: "color-mix(in srgb, var(--color-primary) 12%, transparent)", color: "var(--color-primary)" }}
            >
              <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
                <path d="M10 3L5 8.5 2 5.5l-1 1 4 4 6-7-1-1z" />
              </svg>
              Complete
            </span>
          )}
        </div>
      </div>

      {/* ── Video ─────────────────────────────────────────────────────────── */}
      {hasVideo && (
        <div className="overflow-hidden rounded-2xl border border-border shadow-sm">
          <VideoEmbed
            vimeoId={vimeoId}
            courseLessonId={lesson.id}
            title={lesson.title}
          />
        </div>
      )}

      {/* ── Mark complete checkbox ─────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 p-4 rounded-xl border transition-colors"
        style={{
          borderColor: completed
            ? "color-mix(in srgb, var(--color-primary) 30%, var(--color-border))"
            : "var(--color-border)",
          background: completed
            ? "color-mix(in srgb, var(--color-primary) 5%, transparent)"
            : "transparent",
        }}
      >
        <button
          type="button"
          onClick={handleToggleComplete}
          disabled={isPending}
          className="relative w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          style={{
            borderColor: completed ? "var(--color-primary)" : "var(--color-border)",
            background: completed ? "var(--color-primary)" : "transparent",
          }}
          aria-checked={completed}
          role="checkbox"
          aria-label="Mark lesson as complete"
        >
          {completed && (
            <svg width="10" height="10" viewBox="0 0 12 12" fill="white" aria-hidden="true">
              <path d="M10 3L5 8.5 2 5.5l-1 1 4 4 6-7-1-1z" />
            </svg>
          )}
        </button>
        <span className="text-sm font-medium text-foreground">
          {completed ? "Marked as complete" : "Mark as complete"}
        </span>
        {isPending && (
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin ml-auto" />
        )}
      </div>

      {/* ── Body content ──────────────────────────────────────────────────── */}
      {(lesson as LessonWithContext & { body?: string | null }).body && (
        <div
          className="prose prose-sm max-w-none text-foreground/80 leading-relaxed"
          dangerouslySetInnerHTML={{
            __html: (lesson as LessonWithContext & { body?: string | null }).body!,
          }}
        />
      )}
      {!( lesson as LessonWithContext & { body?: string | null }).body && lesson.description && (
        <p className="text-foreground/70 leading-relaxed">{lesson.description}</p>
      )}

      {/* ── Sessions (4th tier, if present) ──────────────────────────────── */}
      {lesson.sessions.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="font-heading font-semibold text-base text-foreground">
            Sessions
          </h2>
          <div className="flex flex-col gap-2">
            {lesson.sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center gap-3 p-4 rounded-xl border"
                style={{ borderColor: "var(--color-border)" }}
              >
                {session.completed ? (
                  <span
                    className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center"
                    style={{ background: "var(--color-primary)", color: "#fff" }}
                  >
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
                      <path d="M10 3L5 8.5 2 5.5l-1 1 4 4 6-7-1-1z" />
                    </svg>
                  </span>
                ) : (
                  <span className="w-5 h-5 rounded-full flex-shrink-0 border-2" style={{ borderColor: "var(--color-border)" }} />
                )}
                <span className="flex-1 text-sm font-medium text-foreground">{session.title}</span>
                {session.duration_seconds && (
                  <span className="text-xs text-muted-foreground">{formatDuration(session.duration_seconds)}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Prev/Next navigation ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: "var(--color-border)" }}>
        {lesson.prev_lesson_id ? (
          <Link
            href={`/library/courses/${lesson.course_slug}/${lesson.prev_lesson_id}`}
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Previous
          </Link>
        ) : (
          <div />
        )}

        {lesson.next_lesson_id ? (
          <Link
            href={`/library/courses/${lesson.course_slug}/${lesson.next_lesson_id}`}
            className="flex items-center gap-2 text-sm font-semibold transition-colors hover:opacity-80"
            style={{ color: "var(--color-primary)" }}
          >
            Next
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        ) : (
          <Link
            href={`/library/courses/${lesson.course_slug}`}
            className="flex items-center gap-2 text-sm font-semibold transition-colors hover:opacity-80"
            style={{ color: "var(--color-primary)" }}
          >
            Back to course
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        )}
      </div>
    </div>
  );
}
