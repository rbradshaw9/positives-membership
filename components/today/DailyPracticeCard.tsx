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
      <article className="rounded-[1.75rem] p-6 md:p-8 shadow-large text-white relative overflow-hidden bg-[linear-gradient(180deg,#121418_0%,#0A0A0A_100%)]">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-25"
          style={{
            background:
              "radial-gradient(ellipse at 25% 70%, #2F6FED 0%, transparent 65%), radial-gradient(ellipse at 80% 20%, rgba(78,140,120,0.3) 0%, transparent 60%)",
          }}
        />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">
                Today&apos;s Practice
              </p>
              <span
                className="inline-flex items-center text-[9px] font-bold uppercase tracking-[0.18em] px-2.5 py-1 rounded-full"
                style={{
                  color: "rgba(255,255,255,0.9)",
                  background: "rgba(47,111,237,0.45)",
                  border: "1px solid rgba(47,111,237,0.6)",
                }}
              >
                Daily
              </span>
            </div>
            {listened ? (
              <span className="inline-flex items-center gap-1 text-xs text-white/70 font-medium">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className="text-secondary"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Listened today
              </span>
            ) : (
              <span className="text-xs text-white/50">{todayLabel}</span>
            )}
          </div>

          {!hasContent ? (
            <>
              <h2 className="font-heading font-bold text-2xl md:text-3xl leading-heading tracking-[-0.03em] mb-2 text-white/50">
                Your practice is coming
              </h2>
              <p className="text-white/40 text-sm leading-body">
                Dr. Paul&apos;s practice for today will be here when you return. ☁️
              </p>
            </>
          ) : (
            <>
              <h2 className="heading-balance font-heading font-bold text-2xl md:text-3xl leading-heading tracking-[-0.03em] mb-2">
                {content.title}
              </h2>
              {(content.excerpt ?? content.description) && (
                <p className="max-w-3xl text-white/70 text-sm leading-[1.7] mb-6">
                  {content.excerpt ?? content.description}
                </p>
              )}

              {audioUrl ? (
                <div className="mt-2 mb-1">
                  <AudioPlayer
                    trackId={content.id}
                    src={audioUrl}
                    title={content.title}
                    subtitle="Today’s Practice"
                    duration={duration}
                    onCompleteContentId={content.id}
                    onMarkedComplete={() => setListened(true)}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-3 mt-2">
                  <div className="w-12 h-12 rounded-pill bg-white/10 flex items-center justify-center flex-shrink-0">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      aria-hidden="true"
                      className="text-white/40"
                    >
                      <path d="M9 18V5l12-2v13" />
                      <circle cx="6" cy="18" r="3" />
                      <circle cx="18" cy="16" r="3" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white/50 text-sm">Audio arriving soon</p>
                    {content.duration_seconds && (
                      <p className="text-white/30 text-xs mt-0.5">
                        {duration} · check back shortly
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Reflection prompt + note affordance */}
              <div className="mt-5 pt-4 border-t border-white/10">
                {content.reflection_prompt && (
                  <p className="text-xs text-white/40 italic leading-relaxed mb-3">
                    &ldquo;{content.reflection_prompt}&rdquo;
                  </p>
                )}
                <button
                  type="button"
                  onClick={handleOpenNote}
                  disabled={loadingNote}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs text-white/58 hover:bg-white/8 hover:text-white transition-colors disabled:opacity-40"
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
                      className="w-1.5 h-1.5 rounded-full bg-white/40 inline-block"
                      aria-label="Note exists"
                    />
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
