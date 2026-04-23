"use client";

import { useState, useTransition } from "react";
import { VideoEmbed } from "@/components/media/VideoEmbed";
import { markLessonComplete, markLessonIncomplete } from "@/app/(member)/library/courses/actions";
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

type CourseResource = {
  label: string;
  url: string;
  type?: string;
};

function parseResources(raw?: string | null): CourseResource[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const resources = parsed
      .map((item): CourseResource | null => {
        if (!item || typeof item !== "object") return null;
        const resource = item as Record<string, unknown>;
        if (typeof resource.url !== "string") return null;
        return {
          label: typeof resource.label === "string" && resource.label.trim()
            ? resource.label
            : "Resource",
          url: resource.url,
          type: typeof resource.type === "string" ? resource.type : undefined,
        };
      })
      .filter((item): item is CourseResource => Boolean(item));

    return resources;
  } catch {
    return [];
  }
}

function getVideoSource(videoUrl?: string | null) {
  if (!videoUrl) {
    return {
      vimeoId: null as string | null,
      youtubeId: null as string | null,
      directVideoUrl: null as string | null,
    };
  }

  const vimeoMatch = videoUrl.match(/(?:vimeo\.com\/(?:video\/)?|player\.vimeo\.com\/video\/)(\d+)/i);
  if (vimeoMatch?.[1]) {
    return { vimeoId: vimeoMatch[1], youtubeId: null as string | null, directVideoUrl: null as string | null };
  }

  if (/^\d+$/.test(videoUrl)) {
    return { vimeoId: videoUrl, youtubeId: null as string | null, directVideoUrl: null as string | null };
  }

  const youtubeMatch = videoUrl.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/i
  );
  if (youtubeMatch?.[1]) {
    return { vimeoId: null as string | null, youtubeId: youtubeMatch[1], directVideoUrl: null as string | null };
  }

  if (/^https?:\/\//i.test(videoUrl) && /\.(mp4|mov|m4v|webm)(?:\?|#|$)/i.test(videoUrl)) {
    return { vimeoId: null as string | null, youtubeId: null as string | null, directVideoUrl: videoUrl };
  }

  return { vimeoId: null as string | null, youtubeId: null as string | null, directVideoUrl: null as string | null };
}

function DirectVideoPlayer({ src, title }: { src: string; title: string }) {
  return (
    <video
      controls
      preload="metadata"
      className="block aspect-video w-full bg-black"
      aria-label={title}
    >
      <source src={src} />
      <a href={src} target="_blank" rel="noopener noreferrer">
        Open video
      </a>
    </video>
  );
}

function ResourceList({ resources }: { resources: CourseResource[] }) {
  if (resources.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-surface-tint/40 p-4">
      <h2 className="mb-3 font-heading text-sm font-semibold text-foreground">
        Resources
      </h2>
      <div className="flex flex-wrap gap-2">
        {resources.map((resource) => (
          <a
            key={`${resource.url}-${resource.label}`}
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            <span aria-hidden="true">{resource.type === "pdf" ? "PDF" : "↗"}</span>
            {resource.label}
          </a>
        ))}
      </div>
    </div>
  );
}

export function LessonViewer({ lesson, memberId }: LessonViewerProps) {
  void memberId;
  const [completed, setCompleted] = useState(lesson.completed ?? false);
  const [isPending, startTransition] = useTransition();
  const lessonResources = parseResources(lesson.resources);

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

  const lessonVideo = getVideoSource(lesson.video_url);
  const hasVideo = !!lessonVideo.vimeoId || !!lessonVideo.youtubeId || !!lessonVideo.directVideoUrl;

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
          {lessonVideo.directVideoUrl ? (
            <DirectVideoPlayer src={lessonVideo.directVideoUrl} title={lesson.title} />
          ) : (
            <VideoEmbed
              vimeoId={lessonVideo.vimeoId}
              youtubeId={lessonVideo.youtubeId}
              courseLessonId={lesson.id}
              title={lesson.title}
            />
          )}
        </div>
      )}

      {/* ── Mark complete button ──────────────────────────────────────── */}
      <button
        type="button"
        onClick={handleToggleComplete}
        disabled={isPending}
        className="group inline-flex items-center gap-2 py-2 px-4 rounded-full text-sm font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-60 hover:scale-[1.02] active:scale-[0.98]"
        style={{
          background: completed
            ? "linear-gradient(135deg, #059669, #10B981)"
            : "color-mix(in srgb, var(--color-primary) 12%, transparent)",
          color: completed ? "#ffffff" : "var(--color-primary, #2EC4B6)",
          border: completed
            ? "none"
            : "1px solid color-mix(in srgb, var(--color-primary) 25%, transparent)",
          transform: isPending ? "scale(0.97)" : undefined,
        }}
        aria-label={completed ? "Mark lesson as incomplete" : "Mark lesson as complete"}
      >
        {isPending ? (
          <div
            className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin"
            aria-label="Saving…"
          />
        ) : completed ? (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Completed — tap to undo
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <polyline points="16 10 11 15 8 12" opacity="0.5" />
            </svg>
            Mark as Complete
          </>
        )}
      </button>

      {/* ── Body content ──────────────────────────────────────────────────── */}
      {(lesson as LessonWithContext & { body?: string | null }).body && (
        <div
          className="prose prose-sm max-w-none text-foreground/80 leading-relaxed"
          dangerouslySetInnerHTML={{
            __html: (lesson as LessonWithContext & { body?: string | null }).body!,
          }}
        />
      )}
      {!(lesson as LessonWithContext & { body?: string | null }).body && lesson.description && (
        <p className="text-foreground/70 leading-relaxed">{lesson.description}</p>
      )}

      <ResourceList resources={lessonResources} />

      {/* ── Sessions (4th tier, if present) ──────────────────────────────── */}
      {lesson.sessions.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="font-heading font-semibold text-base text-foreground">
            Sessions
          </h2>
          <div className="flex flex-col gap-2">
            {lesson.sessions.map((session) => {
              const sessionVideo = getVideoSource(session.video_url);
              const sessionResources = parseResources(session.resources);
              const hasSessionVideo = !!sessionVideo.vimeoId || !!sessionVideo.youtubeId || !!sessionVideo.directVideoUrl;

              return (
                <details
                  key={session.id}
                  className="rounded-xl border bg-background"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  <summary className="flex cursor-pointer list-none items-center gap-3 p-4">
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
                  </summary>
                  {(hasSessionVideo || session.body || session.description || sessionResources.length > 0) && (
                    <div className="flex flex-col gap-4 border-t border-border p-4">
                      {hasSessionVideo && (
                        <div className="overflow-hidden rounded-xl border border-border">
                          {sessionVideo.directVideoUrl ? (
                            <DirectVideoPlayer src={sessionVideo.directVideoUrl} title={session.title} />
                          ) : (
                            <VideoEmbed
                              vimeoId={sessionVideo.vimeoId}
                              youtubeId={sessionVideo.youtubeId}
                              title={session.title}
                            />
                          )}
                        </div>
                      )}
                      {session.body ? (
                        <div
                          className="prose prose-sm max-w-none text-foreground/80 leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: session.body }}
                        />
                      ) : session.description ? (
                        <p className="text-sm leading-relaxed text-foreground/70">{session.description}</p>
                      ) : null}
                      <ResourceList resources={sessionResources} />
                    </div>
                  )}
                </details>
              );
            })}
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
