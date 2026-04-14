"use client";

import { useState, useRef } from "react";
import type { WeeklyContent } from "@/lib/queries/get-weekly-content";
import { NoteSheet } from "@/components/notes/NoteSheet";
import { AudioPlayer } from "@/components/today/AudioPlayer";
import { ResourceLinks } from "@/components/media/ResourceLinks";
import { MarkdownBody } from "@/components/content/MarkdownBody";
import { trackWeeklyViewed } from "@/app/(member)/today/engagement-actions";
import { stripCmsPreamble } from "@/lib/content/strip-cms-preamble";

/**
 * components/today/WeeklyPrincipleCard.tsx
 * Sprint 6 update:
 *   - VideoEmbed replaces MediaStub (inline player, lazy-loads iframe on click)
 *   - AudioPlayer replaces link-out stub for weekly audio
 *   - ResourceLinks handles download_url + resource_links array
 *   - expandable body text
 */

interface WeeklyPrincipleCardProps {
  content: WeeklyContent | null;
  audioUrl: string | null;
  initialNoteCount?: number;
}

export function WeeklyPrincipleCard({
  content,
  audioUrl,
  initialNoteCount = 0,
}: WeeklyPrincipleCardProps) {
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteCount, setNoteCount] = useState(initialNoteCount);
  const trackFired = useRef(false);

  function fireTrack() {
    if (trackFired.current || !content) return;
    trackFired.current = true;
    void trackWeeklyViewed(content.id);
  }

  function handleOpenNote() {
    if (!content) return;
    fireTrack();
    setNoteOpen(true);
  }

  function handleNoteSaved(result: { isNew: boolean }) {
    setNoteCount((prev) => prev + (result.isNew ? 1 : 0));
  }

  // Weekly card is reflection-first: no video. Monthly owns the video.
  const hasAudio = !!audioUrl;
  const hasBody = !!(content?.body || content?.description);
  const rawBodyText = content?.body || content?.description || "";
  // Strip title + excerpt if the CMS baked them into the top of the body field
  const bodyText = stripCmsPreamble(rawBodyText, content?.title, content?.excerpt);
  // Scroll long prose; short content renders naturally
  const useScroll = bodyText.replace(/\\n/g, "\n").length > 420;

  return (
    <>
      <article
        className="surface-card--editorial rounded-[1.6rem] border border-border shadow-medium overflow-hidden"
        style={{ backgroundColor: "var(--color-surface-tint)" }}
      >
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="p-5 md:p-6 pb-0">
          {/* WEEKLY chip */}
          <span
            className="inline-flex items-center text-[9px] font-bold uppercase tracking-[0.18em] px-2.5 py-1 rounded-full mb-3"
            style={{
              color: "var(--color-secondary)",
              background: "color-mix(in srgb, var(--color-secondary) 12%, transparent)",
              border: "1px solid color-mix(in srgb, var(--color-secondary) 20%, transparent)",
            }}
          >
            Weekly
          </span>

          {content ? (
            <>
              <h2 className="heading-balance font-heading font-bold text-2xl text-foreground leading-heading tracking-[-0.03em] mb-2">
                {content.title}
              </h2>
              {content.excerpt && (
                <p className="max-w-3xl text-sm text-foreground/70 leading-[1.7]">
                  {content.excerpt}
                </p>
              )}
            </>
          ) : (
            <>
              <h2 className="font-heading font-bold text-xl text-foreground/40 leading-heading tracking-[-0.02em] mb-2">
                This week&apos;s principle
              </h2>
              <p className="text-sm text-muted-foreground leading-body">
                This week&apos;s principle will appear on Monday.
              </p>
            </>
          )}
        </div>



        {/* ── Audio player for Weekly audio content ───────────────────── */}
        {content && hasAudio && (
          <div
            className="px-5 md:px-6 pt-4 pb-2"
            style={{
              background: "linear-gradient(to bottom, color-mix(in srgb, var(--color-secondary) 6%, transparent), transparent)",
            }}
          >
            <div className="rounded-2xl border border-white/8 bg-surface-dark/80 px-4 py-4">
              <AudioPlayer
                trackId={content.id}
                src={audioUrl!}
                title={content.title}
                subtitle="This Week"
                duration={
                  content.duration_seconds
                    ? `${Math.floor(content.duration_seconds / 60)}:${String(content.duration_seconds % 60).padStart(2, "0")}`
                    : "—"
                }
                tone="light"
              />
            </div>
          </div>
        )}

        {/* ── Body / supporting text ──────────────────────────────────── */}
        {content && hasBody && (
          <div className="px-5 md:px-6 pt-4">
            {useScroll ? (
              <div
                className="overflow-y-auto"
                style={{
                  maxHeight: "11rem",
                  maskImage: "linear-gradient(to bottom, black 80%, transparent 100%)",
                  WebkitMaskImage: "linear-gradient(to bottom, black 80%, transparent 100%)",
                  paddingBottom: "1.25rem",
                }}
              >
                <MarkdownBody content={bodyText} />
              </div>
            ) : (
              <MarkdownBody content={bodyText} />
            )}
          </div>
        )}

        {/* ── Resources (download + resource_links) ───────────────────── */}
        {content && (content.download_url || content.resource_links) && (
          <div className="px-5 md:px-6 pt-3">
            <ResourceLinks
              downloadUrl={content.download_url}
              resourceLinks={content.resource_links}
              accentClass="text-secondary hover:text-secondary-hover"
            />
          </div>
        )}

        {/* ── Reflection prompt + note affordance ─────────────────────── */}
        {content && (
          <div className="p-5 md:p-6 pt-4">
            {content.reflection_prompt && (
              <p className="text-xs text-foreground/50 italic leading-relaxed mb-3">
                &ldquo;{content.reflection_prompt}&rdquo;
              </p>
            )}
            <div className="pt-3 border-t border-border/60 flex items-center justify-between">
              <button
                type="button"
                onClick={handleOpenNote}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all"
                style={{
                  background: noteCount > 0
                    ? "color-mix(in srgb, var(--color-secondary) 12%, transparent)"
                    : "color-mix(in srgb, var(--color-secondary) 10%, transparent)",
                  color: "var(--color-secondary)",
                  border: "1px solid color-mix(in srgb, var(--color-secondary) 22%, transparent)",
                }}
              >
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
                <span>{noteCount > 0 ? "Add another reflection" : "Reflect on this"}</span>
                {noteCount > 0 && (
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-secondary/70 inline-block"
                    aria-label="Reflection exists"
                  />
                )}
              </button>
              <p className="text-xs text-foreground/45">
                {noteCount > 0
                  ? `${noteCount} reflection${noteCount === 1 ? "" : "s"} saved for this week`
                  : "Capture a private thought while this week's principle is fresh."}
              </p>
            </div>
          </div>
        )}
      </article>

      <NoteSheet
        isOpen={noteOpen}
        onClose={() => setNoteOpen(false)}
        contentId={content?.id ?? null}
        contentTitle={content?.title}
        existingReflectionCount={noteCount}
        onSaved={handleNoteSaved}
      />
    </>
  );
}
