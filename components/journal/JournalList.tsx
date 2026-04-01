"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { MemberNote } from "@/lib/queries/get-member-notes";
import { NoteSheet } from "@/components/notes/NoteSheet";

/**
 * components/journal/JournalList.tsx
 * Renders the member's full notes archive.
 *
 * Sprint 3 fix: after saving a note, updates the local preview immediately
 * via `localEdits` AND calls `router.refresh()` to re-sort the list by
 * updated_at (so an edited note floats to the top) — no jarring full reload.
 */

interface JournalListProps {
  notes: MemberNote[];
}

const TYPE_LABEL: Record<string, string> = {
  daily_audio: "Daily",
  weekly_principle: "Weekly",
  monthly_theme: "Monthly",
};

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

function truncate(text: string, chars = 160): string {
  if (text.length <= chars) return text;
  return text.slice(0, chars).trimEnd() + "…";
}

export function JournalList({ notes }: JournalListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeNote, setActiveNote] = useState<MemberNote | null>(null);
  // localEdits: captures the latest saved text per note ID so the preview
  // updates instantly before the router.refresh() re-render completes.
  const [localEdits, setLocalEdits] = useState<Record<string, string>>({});

  function handleOpen(note: MemberNote) {
    setActiveNote(note);
  }

  function handleSaved(_isNew: boolean, savedText: string) {
    if (!activeNote) return;

    // 1. Update local preview immediately
    setLocalEdits((prev) => ({ ...prev, [activeNote.id]: savedText }));

    // 2. Close the sheet
    setActiveNote(null);

    // 3. Refresh the server component so the list re-sort by updated_at is accurate
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <>
      <ul
        className={`flex flex-col gap-3 transition-opacity duration-300 ${isPending ? "opacity-60" : "opacity-100"}`}
        role="list"
      >
        {notes.map((note) => {
          const displayText = localEdits[note.id] ?? note.entry_text;

          return (
            <li key={note.id}>
              <button
                type="button"
                onClick={() => handleOpen(note)}
                className="w-full text-left bg-card rounded-xl border border-border shadow-soft p-5 hover:border-primary/30 transition-colors group"
              >
                {/* Content context (if tied to content) */}
                {note.content_title && (
                  <div className="flex items-center gap-2 mb-2">
                    {note.content_type && (
                      <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        {TYPE_LABEL[note.content_type] ?? note.content_type}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground truncate">
                      {note.content_title}
                    </span>
                  </div>
                )}

                {/* Note preview */}
                <p className="text-sm text-foreground leading-body group-hover:text-foreground/80 transition-colors">
                  {truncate(displayText)}
                </p>

                {/* Date */}
                <p className="text-xs text-muted-foreground mt-2">
                  {formatDate(note.updated_at)}
                </p>
              </button>
            </li>
          );
        })}
      </ul>

      {activeNote && (
        <NoteSheet
          isOpen={true}
          onClose={() => setActiveNote(null)}
          contentId={activeNote.content_id}
          contentTitle={activeNote.content_title ?? undefined}
          initialText={localEdits[activeNote.id] ?? activeNote.entry_text}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}
