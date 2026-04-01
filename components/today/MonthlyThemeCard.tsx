"use client";

import { useState } from "react";
import type { MonthlyContent } from "@/lib/queries/get-monthly-content";
import { NoteSheet } from "@/components/notes/NoteSheet";
import { VideoEmbed } from "@/components/media/VideoEmbed";
import { ResourceLinks } from "@/components/media/ResourceLinks";
import { getNoteForContent } from "@/app/(member)/notes/actions";

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

  async function handleOpenNote() {
    if (!content) return;
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
  const bodyText = content?.body || content?.description || "";

  return (
    <>
      <article className="bg-surface-tint rounded-xl border border-border shadow-soft overflow-hidden border-l-4 border-l-accent">
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="p-5 pb-0">
          <span className="text-xs font-semibold uppercase tracking-widest text-accent mb-3 block">
            This Month
          </span>

          {content ? (
            <>
              <h2 className="font-heading font-bold text-xl text-foreground leading-heading tracking-[-0.02em] mb-2">
                {content.title}
              </h2>
              {content.excerpt && (
                <p className="text-sm text-foreground/70 leading-body">
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
          <div className="px-5 pt-4">
            <VideoEmbed
              vimeoId={content.vimeo_video_id}
              youtubeId={content.youtube_video_id}
              title={content.title}
            />
          </div>
        )}

        {/* ── Body text (ambient — capped, no expand) ─────────────────── */}
        {content && hasBody && (
          <div className="px-5 pt-3">
            <p className="text-sm text-foreground/55 leading-relaxed line-clamp-4 whitespace-pre-line">
              {bodyText}
            </p>
          </div>
        )}

        {/* ── Resources ───────────────────────────────────────────────── */}
        {content && (content.download_url || content.resource_links) && (
          <div className="px-5 pt-3">
            <ResourceLinks
              downloadUrl={content.download_url}
              resourceLinks={content.resource_links}
              accentClass="text-accent hover:text-accent-hover"
            />
          </div>
        )}

        {/* ── Reflection + note ───────────────────────────────────────── */}
        {content && (
          <div className="p-5 pt-4">
            {content.reflection_prompt && (
              <p className="text-xs text-foreground/50 italic leading-relaxed mb-3">
                &ldquo;{content.reflection_prompt}&rdquo;
              </p>
            )}
            <div className="pt-3 border-t border-border/60">
              <button
                type="button"
                onClick={handleOpenNote}
                disabled={loadingNote}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
              >
                <svg
                  width="12"
                  height="12"
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
                    className="w-1.5 h-1.5 rounded-full bg-accent/60 inline-block"
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
