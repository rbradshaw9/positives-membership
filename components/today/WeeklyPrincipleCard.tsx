"use client";

import { useState } from "react";
import type { WeeklyContent } from "@/lib/queries/get-weekly-content";
import { NoteSheet } from "@/components/notes/NoteSheet";
import { VideoEmbed } from "@/components/media/VideoEmbed";
import { AudioPlayer } from "@/components/today/AudioPlayer";
import { ResourceLinks } from "@/components/media/ResourceLinks";
import { getNoteForContent } from "@/app/(member)/notes/actions";

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
  initialHasNote?: boolean;
}

export function WeeklyPrincipleCard({
  content,
  audioUrl,
  initialHasNote = false,
}: WeeklyPrincipleCardProps) {
  const [noteOpen, setNoteOpen] = useState(false);
  const [existingNote, setExistingNote] = useState("");
  const [noteExists, setNoteExists] = useState(initialHasNote);
  const [loadingNote, setLoadingNote] = useState(false);
  const [bodyExpanded, setBodyExpanded] = useState(false);

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
  const hasAudio = !hasVideo && !!audioUrl;
  const hasBody = !!(content?.body || content?.description);
  const bodyText = content?.body || content?.description || "";
  const isLong = bodyText.length > 240;

  return (
    <>
      <article
        className="rounded-xl border border-border shadow-soft overflow-hidden"
        style={{ backgroundColor: "var(--color-surface-tint)" }}
      >
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="p-5 pb-0">
          <span className="text-xs font-semibold uppercase tracking-widest text-secondary mb-3 block">
            This Week
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
                This week&apos;s principle
              </h2>
              <p className="text-sm text-muted-foreground leading-body">
                This week&apos;s principle will appear on Monday.
              </p>
            </>
          )}
        </div>

        {/* ── Inline video (Vimeo / YouTube) ──────────────────────────── */}
        {content && hasVideo && (
          <div className="px-5 pt-4">
            <VideoEmbed
              vimeoId={content.vimeo_video_id}
              youtubeId={content.youtube_video_id}
              title={content.title}
            />
          </div>
        )}

        {/* ── Audio player for Weekly audio content ───────────────────── */}
        {content && hasAudio && (
          <div className="px-5 pt-4">
            <div className="bg-surface-dark rounded-lg px-4 py-4">
              <AudioPlayer
                src={audioUrl!}
                title={content.title}
                duration={
                  content.duration_seconds
                    ? `${Math.floor(content.duration_seconds / 60)}:${String(content.duration_seconds % 60).padStart(2, "0")}`
                    : "—"
                }
              />
            </div>
          </div>
        )}

        {/* ── Body / supporting text ──────────────────────────────────── */}
        {content && hasBody && (
          <div className="px-5 pt-4">
            <p
              className={`text-sm text-foreground/60 leading-relaxed whitespace-pre-line ${
                !bodyExpanded && isLong ? "line-clamp-3" : ""
              }`}
            >
              {bodyText}
            </p>
            {isLong && (
              <button
                type="button"
                onClick={() => setBodyExpanded(!bodyExpanded)}
                className="text-xs text-secondary hover:text-secondary-hover transition-colors mt-1.5"
              >
                {bodyExpanded ? "Show less" : "Read more"}
              </button>
            )}
          </div>
        )}

        {/* ── Resources (download + resource_links) ───────────────────── */}
        {content && (content.download_url || content.resource_links) && (
          <div className="px-5 pt-3">
            <ResourceLinks
              downloadUrl={content.download_url}
              resourceLinks={content.resource_links}
              accentClass="text-secondary hover:text-secondary-hover"
            />
          </div>
        )}

        {/* ── Reflection prompt + note affordance ─────────────────────── */}
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
                    className="w-1.5 h-1.5 rounded-full bg-secondary/60 inline-block"
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
