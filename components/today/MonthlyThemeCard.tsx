"use client";

import { useState, useRef } from "react";
import type { MonthlyContent } from "@/lib/queries/get-monthly-content";
import { NoteSheet } from "@/components/notes/NoteSheet";
import { VideoEmbed } from "@/components/media/VideoEmbed";
import { ResourceLinks } from "@/components/media/ResourceLinks";
import { MarkdownBody } from "@/components/content/MarkdownBody";
import { getNoteForContent } from "@/app/(member)/notes/actions";
import { trackMonthlyViewed } from "@/app/(member)/today/engagement-actions";
import { stripCmsPreamble } from "@/lib/content/strip-cms-preamble";

/**
 * components/today/MonthlyThemeCard.tsx
 * Sprint 6 update:
 *   - VideoEmbed replaces MediaStub (inline player, lazy-loads iframe on click)
 *   - ResourceLinks handles download_url + resource_links array
 *   - Monthly stays ambient — no AudioPlayer (themes are not episodic audio)
 *   - body text is capped at 4 lines (ambient, not medium)
 */

interface MonthlyThemeCardProps {
  content: MonthlyContent | null;
  initialHasNote?: boolean;
  viewerUserId?: string | null;
}

function currentMonthName(): string {
  return new Intl.DateTimeFormat("en-US", { month: "long" }).format(new Date());
}

export function MonthlyThemeCard({
  content,
  initialHasNote = false,
}: MonthlyThemeCardProps) {
  const [noteOpen, setNoteOpen] = useState(false);
  const [existingNote, setExistingNote] = useState("");
  const [noteExists, setNoteExists] = useState(initialHasNote);
  const [loadingNote, setLoadingNote] = useState(false);
  const trackFired = useRef(false);

  function fireTrack() {
    if (trackFired.current || !content) return;
    trackFired.current = true;
    void trackMonthlyViewed(content.id);
  }

  async function handleOpenNote() {
    if (!content) return;
    fireTrack();
    setLoadingNote(true);
    const existing = await getNoteForContent(content.id);
    setExistingNote(existing?.entry_text ?? "");
    setLoadingNote(false);
    setNoteOpen(true);
  }

  function handleNoteSaved(_isNew: boolean, savedText: string) {
    setNoteExists(true);
    setExistingNote(savedText);
  }

  const hasVideo = !!(content?.vimeo_video_id || content?.youtube_video_id);
  const hasBody = !!(content?.body || content?.description);
  const rawBodyText = content?.body || content?.description || "";
  // Strip title + excerpt if the CMS baked them into the top of the body field
  const bodyText = stripCmsPreamble(rawBodyText, content?.title, content?.description);
  const isLongBody = bodyText.replace(/\\n/g, "\n").length > 320;
  const [bodyExpanded, setBodyExpanded] = useState(false);

  return (
    <>
      <article className="surface-card--editorial bg-surface-tint rounded-[1.6rem] border border-border shadow-medium overflow-hidden border-l-4 border-l-accent">
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="p-5 md:p-6 pb-0">
          {/* MONTHLY chip */}
          <span
            className="inline-flex items-center text-[9px] font-bold uppercase tracking-[0.18em] px-2.5 py-1 rounded-full mb-3"
            style={{
              color: "var(--color-accent)",
              background: "color-mix(in srgb, var(--color-accent) 12%, transparent)",
              border: "1px solid color-mix(in srgb, var(--color-accent) 22%, transparent)",
            }}
          >
            Monthly
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
                {currentMonthName()}&apos;s theme
              </h2>
              <p className="text-sm text-muted-foreground leading-body">
                {currentMonthName()}&apos;s theme arrives at the start of the month.
              </p>
            </>
          )}
        </div>

        {/* ── Inline video ────────────────────────────────────────────── */}
        {content && hasVideo && (
          <div
            className="px-5 md:px-6 pt-4 pb-4"
            style={{
              background: "linear-gradient(to bottom, color-mix(in srgb, var(--color-accent) 5%, transparent), transparent)",
            }}
          >
            <VideoEmbed
              vimeoId={content.vimeo_video_id}
              youtubeId={content.youtube_video_id}
              contentId={content.id}
              title={content.title}
            />
          </div>
        )}

        {/* ── Body text ─────────────────────────────────────────────── */}
        {content && hasBody && (
          <div className="px-5 md:px-6 pt-3 pb-1">
            <div
              className="overflow-hidden transition-all"
              style={{
                maxHeight: bodyExpanded ? "none" : "9rem",
                maskImage: bodyExpanded
                  ? "none"
                  : "linear-gradient(to bottom, black 60%, transparent 100%)",
                WebkitMaskImage: bodyExpanded
                  ? "none"
                  : "linear-gradient(to bottom, black 60%, transparent 100%)",
              }}
            >
              <MarkdownBody content={bodyText} />
            </div>
            {isLongBody && (
              <button
                type="button"
                onClick={() => setBodyExpanded((v) => !v)}
                className="mt-2 text-xs font-semibold transition-colors"
                style={{ color: "var(--color-accent)" }}
              >
                {bodyExpanded ? "Show less" : "Read more"}
              </button>
            )}
          </div>
        )}

        {/* ── Resources ───────────────────────────────────────────────── */}
        {content && (content.download_url || content.resource_links) && (
          <div className="px-5 md:px-6 pt-3">
            <ResourceLinks
              downloadUrl={content.download_url}
              resourceLinks={content.resource_links}
              accentClass="text-accent hover:text-accent-hover"
            />
          </div>
        )}

        {/* ── Reflection + note ───────────────────────────────────────── */}
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
                disabled={loadingNote}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all disabled:opacity-40"
                style={{
                  background: noteExists
                    ? "color-mix(in srgb, var(--color-accent) 12%, transparent)"
                    : "color-mix(in srgb, var(--color-accent) 10%, transparent)",
                  color: "var(--color-accent)",
                  border: "1px solid color-mix(in srgb, var(--color-accent) 22%, transparent)",
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
                <span>
                  {loadingNote ? "Loading…" : noteExists ? "View note" : "Reflect"}
                </span>
                {noteExists && (
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-accent/70 inline-block"
                    aria-label="Note exists"
                  />
                )}
              </button>
            </div>
          </div>
        )}
      </article>

      <NoteSheet
        isOpen={noteOpen}
        onClose={() => setNoteOpen(false)}
        contentId={content?.id ?? null}
        contentTitle={content?.title}
        initialText={existingNote}
        onSaved={handleNoteSaved}
      />
    </>
  );
}
