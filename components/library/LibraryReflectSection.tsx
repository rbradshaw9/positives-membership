"use client";

import { useState } from "react";
import { NoteSheet } from "@/components/notes/NoteSheet";
import { getNoteForContent } from "@/app/(member)/notes/actions";

/**
 * components/library/LibraryReflectSection.tsx
 * Sprint 11b: Client component for the Reflect action on /library/[id].
 *
 * Isolated as a client component so the detail page can remain a Server Component.
 * Accepts the contentId and contentTitle; manages NoteSheet open state.
 */

interface LibraryReflectSectionProps {
  contentId: string;
  contentTitle: string;
  reflectionPrompt?: string | null;
  initialHasNote?: boolean;
}

export function LibraryReflectSection({
  contentId,
  contentTitle,
  reflectionPrompt,
  initialHasNote = false,
}: LibraryReflectSectionProps) {
  const [noteOpen, setNoteOpen] = useState(false);
  const [existingNote, setExistingNote] = useState("");
  const [noteExists, setNoteExists] = useState(initialHasNote);
  const [loadingNote, setLoadingNote] = useState(false);

  async function handleOpenNote() {
    setLoadingNote(true);
    const existing = await getNoteForContent(contentId);
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
      {/* Reflection prompt */}
      {reflectionPrompt && (
        <div
          className="rounded-xl px-4 py-4 mb-4"
          style={{
            background: "var(--color-surface-tint)",
            border: "1px solid var(--color-border)",
          }}
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
            Reflection
          </p>
          <p className="text-sm text-foreground/70 leading-relaxed italic">
            &ldquo;{reflectionPrompt}&rdquo;
          </p>
        </div>
      )}

      {/* Reflect CTA */}
      <button
        type="button"
        onClick={handleOpenNote}
        disabled={loadingNote}
        className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full text-sm font-semibold transition-all disabled:opacity-40"
        style={{
          background: noteExists
            ? "color-mix(in srgb, var(--color-secondary) 14%, transparent)"
            : "linear-gradient(135deg, color-mix(in srgb, var(--color-secondary) 16%, transparent) 0%, color-mix(in srgb, var(--color-secondary) 10%, transparent) 100%)",
          color: "var(--color-secondary)",
          border: "1.5px solid color-mix(in srgb, var(--color-secondary) 28%, transparent)",
          boxShadow: "0 2px 8px color-mix(in srgb, var(--color-secondary) 10%, transparent)",
        }}
      >
        <svg
          width="14"
          height="14"
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
          {loadingNote ? "Loading…" : noteExists ? "View or edit note" : "Reflect on this"}
        </span>
        {noteExists && (
          <span
            className="w-2 h-2 rounded-full bg-secondary/70 inline-block"
            aria-label="Note exists"
          />
        )}
      </button>

      <NoteSheet
        isOpen={noteOpen}
        onClose={() => setNoteOpen(false)}
        contentId={contentId}
        contentTitle={contentTitle}
        initialText={existingNote}
        onSaved={handleNoteSaved}
      />
    </>
  );
}
