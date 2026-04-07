"use client";

import { useState } from "react";
import type { TodayContent } from "@/lib/queries/get-today-content";
import { AudioPlayer } from "@/components/today/AudioPlayer";
import { NoteSheet } from "@/components/notes/NoteSheet";
import { getNoteForContent } from "@/app/(member)/notes/actions";

/**
 * components/today/DailyPracticeCard.tsx
 * Primary card on the Today page — dominant visual weight.
 *
 * Sprint 5 updates:
 *   - "Listened today" completion chip when hasListened is true
 *   - reflection prompt shown above the Reflect button
 *   - improved empty state copy
 *   - better audio player spacing
 */

interface DailyPracticeCardProps {
  content: TodayContent | null;
  audioUrl: string | null;
  initialHasNote?: boolean;
  /** Whether the member has already listened today (server-derived) */
  hasListened?: boolean;
  /**
   * Human-readable date label computed server-side from getEffectiveDate()
   * (canonical Eastern time). Prevents browser-local vs Eastern TZ mismatch.
   */
  todayLabel: string;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function DailyPracticeCard({
  content,
  audioUrl,
  initialHasNote = false,
  hasListened = false,
  todayLabel,
}: DailyPracticeCardProps) {
  const [noteOpen, setNoteOpen] = useState(false);
  const [existingNote, setExistingNote] = useState("");
  const [noteExists, setNoteExists] = useState(initialHasNote);
  const [loadingNote, setLoadingNote] = useState(false);
  const [listened, setListened] = useState(hasListened);

  const hasContent = content !== null;
  const duration = hasContent ? formatDuration(content.duration_seconds) : "—";

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

  return (
    <>
      <article
        aria-labelledby={hasContent ? "today-practice-title" : "today-practice-empty-title"}
        role="region"
        className="rounded-[1.75rem] p-6 md:p-8 shadow-large relative overflow-hidden bg-[linear-gradient(180deg,#121418_0%,#0A0A0A_100%)]"
        style={{
          color: "white",
          // Override the global --color-foreground (#09090B) so all heading/p
          // rules in globals.css render white inside this dark card.
          ["--color-foreground" as string]: "#ffffff",
          ["--color-muted-foreground" as string]: "rgba(255,255,255,0.55)",
        }}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-25"
          style={{
            background:
              "radial-gradient(ellipse at 25% 70%, #2F6FED 0%, transparent 65%), radial-gradient(ellipse at 80% 20%, rgba(78,140,120,0.3) 0%, transparent 60%)",
          }}
        />

        <div className="relative z-10">
          {/* ── Header row: chip + listened state ──────────────────── */}
          <div className="flex items-center justify-between mb-5">
            <span
              className="inline-flex items-center text-[9px] font-bold uppercase tracking-[0.18em] px-2.5 py-1 rounded-full"
              style={{
                color: "rgba(255,255,255,0.9)",
                background: "rgba(47,111,237,0.45)",
                border: "1px solid rgba(47,111,237,0.6)",
              }}
            >
              Daily Practice
            </span>

            {listened ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium"
                style={{ color: "rgba(255,255,255,0.65)" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5"
                  strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Listened today
              </span>
            ) : (
              <span className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
                {todayLabel}
              </span>
            )}
          </div>

          {!hasContent ? (
            <>
              <h2 className="font-heading font-bold text-2xl md:text-3xl leading-heading tracking-[-0.03em] mb-2"
                id="today-practice-empty-title"
                style={{ color: "rgba(255,255,255,0.5)" }}>
                Your practice is coming
              </h2>
              <p className="text-sm leading-body" style={{ color: "rgba(255,255,255,0.38)" }}>
                Dr. Paul&apos;s practice for today will be here when you return. ☁️
              </p>
            </>
          ) : (
            <>
              {/* Title — full white, dominant */}
              <h2
                id="today-practice-title"
                className="heading-balance font-heading font-bold text-2xl md:text-3xl leading-heading tracking-[-0.03em] mb-2"
                style={{ color: "#ffffff" }}
              >
                {content.title}
              </h2>

              {/* Excerpt — readable but secondary */}
              {(content.excerpt ?? content.description) && (
                <p className="max-w-3xl text-sm leading-[1.75] mb-6"
                  style={{ color: "rgba(255,255,255,0.62)" }}>
                  {content.excerpt ?? content.description}
                </p>
              )}

              {/* Audio player */}
              {audioUrl ? (
                <div className="mt-2 mb-1">
                  <AudioPlayer
                    trackId={content.id}
                    src={audioUrl}
                    title={content.title}
                    subtitle="Today's Practice"
                    duration={duration}
                    onCompleteContentId={content.id}
                    onMarkedComplete={() => setListened(true)}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-3 mt-2">
                  <div className="w-11 h-11 rounded-full bg-white/8 flex items-center justify-center shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="1.5" aria-hidden="true"
                      style={{ color: "rgba(255,255,255,0.35)" }}>
                      <path d="M9 18V5l12-2v13" />
                      <circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                    </svg>
                  </div>
                  <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
                    Audio arriving soon
                  </p>
                </div>
              )}

              {/* Reflection prompt + Reflect button */}
              <div className="mt-5 pt-4 border-t border-white/10">
                {content.reflection_prompt && (
                  <p className="text-sm italic leading-relaxed mb-3"
                    style={{ color: "rgba(255,255,255,0.52)" }}>
                    &ldquo;{content.reflection_prompt}&rdquo;
                  </p>
                )}
                <button
                  type="button"
                  onClick={handleOpenNote}
                  disabled={loadingNote}
                  className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold transition-all disabled:opacity-40 hover:bg-white/12"
                  style={{
                    color: noteExists ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.7)",
                    background: noteExists ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.14)",
                  }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                  {loadingNote ? "Loading…" : noteExists ? "View reflection" : "Reflect"}
                  {noteExists && (
                    <span className="w-1.5 h-1.5 rounded-full inline-block"
                      style={{ background: "rgba(255,255,255,0.5)" }}
                      aria-label="Note exists" />
                  )}
                </button>
              </div>
            </>
          )}
        </div>
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
