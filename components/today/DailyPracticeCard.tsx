"use client";

import { useState, useTransition } from "react";
import type { TodayContent } from "@/lib/queries/get-today-content";
import { AudioPlayer } from "@/components/today/AudioPlayer";
import { NoteSheet } from "@/components/notes/NoteSheet";
import { markListened } from "@/app/(member)/today/actions";
import { getNoteForContent } from "@/app/(member)/notes/actions";

/**
 * components/today/DailyPracticeCard.tsx
 * Primary card on the Today page.
 *
 * Sprint 3: accepts initialHasNote from server so the "Reflect" / "View note"
 * affordance is immediately correct without a loading state.
 */

interface DailyPracticeCardProps {
  content: TodayContent | null;
  audioUrl: string | null;
  initialHasNote?: boolean;
  /**
   * Human-readable date label computed server-side from getEffectiveDate()
   * (canonical Eastern time). Prevents browser-local vs Eastern TZ mismatch.
   * Example: "Tuesday, April 1"
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
  todayLabel,
}: DailyPracticeCardProps) {
  const [, startTransition] = useTransition();
  const [noteOpen, setNoteOpen] = useState(false);
  const [existingNote, setExistingNote] = useState("");
  const [noteExists, setNoteExists] = useState(initialHasNote);
  const [loadingNote, setLoadingNote] = useState(false);

  const hasContent = content !== null;
  const duration = hasContent ? formatDuration(content.duration_seconds) : "—";

  function handleComplete() {
    if (!content) return;
    startTransition(async () => {
      await markListened(content.id);
    });
  }

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
      <article className="bg-surface-dark rounded-xl p-6 shadow-large text-white relative overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-20"
          style={{
            background:
              "radial-gradient(ellipse at 30% 60%, #2F6FED 0%, transparent 70%)",
          }}
        />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-5">
            <span className="text-xs font-medium uppercase tracking-widest text-white/60">
              Today&apos;s Practice
            </span>
            <span className="text-xs text-white/50">{todayLabel}</span>
          </div>

          {!hasContent ? (
            <>
              <h2 className="font-heading font-bold text-2xl leading-heading tracking-[-0.03em] mb-2 text-white/50">
                Your practice is coming
              </h2>
              <p className="text-white/40 text-sm leading-body">
                Today&apos;s practice is being prepared. Check back shortly.
              </p>
            </>
          ) : (
            <>
              <h2 className="font-heading font-bold text-2xl leading-heading tracking-[-0.03em] mb-2">
                {content.title}
              </h2>
              {(content.excerpt ?? content.description) && (
                <p className="text-white/70 text-sm leading-body mb-6">
                  {content.excerpt ?? content.description}
                </p>
              )}

              {audioUrl ? (
                <AudioPlayer
                  src={audioUrl}
                  title={content.title}
                  duration={duration}
                  onComplete={handleComplete}
                />
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

              {/* Note affordance */}
              <div className="mt-5 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={handleOpenNote}
                  disabled={loadingNote}
                  className="flex items-center gap-2 text-xs text-white/50 hover:text-white/80 transition-colors disabled:opacity-40"
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
