"use client";

import { useState } from "react";
import { NoteSheet } from "@/components/notes/NoteSheet";

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
  initialNoteCount?: number;
}

export function LibraryReflectSection({
  contentId,
  contentTitle,
  reflectionPrompt,
  initialNoteCount = 0,
}: LibraryReflectSectionProps) {
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteCount, setNoteCount] = useState(initialNoteCount);

  function handleOpenNote() {
    setNoteOpen(true);
  }

  function handleNoteSaved(result: { isNew: boolean }) {
    setNoteCount((prev) => prev + (result.isNew ? 1 : 0));
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
        className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full text-sm font-semibold transition-all"
        style={{
          background: noteCount > 0
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
          {noteCount > 0 ? "Add another reflection" : "Reflect on this"}
        </span>
        {noteCount > 0 && (
          <span
            className="w-2 h-2 rounded-full bg-secondary/70 inline-block"
            aria-label="Reflection exists"
          />
        )}
      </button>
      <p className="mt-3 text-sm text-muted-foreground">
        {noteCount > 0
          ? `${noteCount} reflection${noteCount === 1 ? "" : "s"} already saved for this practice. Add another when something new stands out.`
          : "A few sentences is enough. This stays private to you."}
      </p>

      <NoteSheet
        isOpen={noteOpen}
        onClose={() => setNoteOpen(false)}
        contentId={contentId}
        contentTitle={contentTitle}
        existingReflectionCount={noteCount}
        onSaved={handleNoteSaved}
      />
    </>
  );
}
