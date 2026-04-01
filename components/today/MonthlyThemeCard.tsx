"use client";

import { useState } from "react";
import type { MonthlyContent } from "@/lib/queries/get-monthly-content";
import { NoteSheet } from "@/components/notes/NoteSheet";
import { getNoteForContent } from "@/app/(member)/notes/actions";

/**
 * components/today/MonthlyThemeCard.tsx
 * Sprint 3: accepts initialHasNote prop from Today page server component.
 */

interface MonthlyThemeCardProps {
  content: MonthlyContent | null;
  initialHasNote?: boolean;
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

  return (
    <>
      <article className="bg-surface-tint rounded-lg border border-border shadow-soft p-5">
        <span className="text-xs font-medium uppercase tracking-widest text-accent mb-3 block">
          This Month
        </span>

        {content ? (
          <>
            <h2 className="font-heading font-semibold text-lg text-foreground leading-heading tracking-[-0.02em] mb-2">
              {content.title}
            </h2>
            {(content.excerpt ?? content.description) && (
              <p className="text-sm text-muted-foreground leading-body">
                {content.excerpt ?? content.description}
              </p>
            )}

            <div className="mt-4 pt-3 border-t border-border">
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
          </>
        ) : (
          <>
            <h2 className="font-heading font-semibold text-lg text-foreground/40 leading-heading tracking-[-0.02em] mb-2">
              This month&apos;s theme
            </h2>
            <p className="text-sm text-muted-foreground leading-body">
              This month&apos;s theme will be here soon.
            </p>
          </>
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
