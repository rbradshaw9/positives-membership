"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { MemberNote } from "@/lib/queries/get-member-notes";
import { NoteSheet } from "@/components/notes/NoteSheet";
import { TypeBadge } from "@/components/member/TypeBadge";

/**
 * components/journal/JournalList.tsx
 * Sprint 8: month grouping, TypeBadge, clean date labels.
 * Sprint 11: visual upgrade —
 *   - shadow-soft → shadow-medium on note cards
 *   - content-type left accent border (primary/secondary/accent by type)
 *   - month divider text-[10px] → text-xs, full opacity
 *   - rounded-xl → rounded-2xl for consistency
 */

interface JournalListProps {
  notes: MemberNote[];
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

function getMonthKey(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(d);
}

function truncate(text: string, chars = 160): string {
  if (text.length <= chars) return text;
  return text.slice(0, chars).trimEnd() + "…";
}

/**
 * Returns the Tailwind class for the left accent border based on content type.
 * Semantic mapping: blue = daily, green = weekly, amber = monthly, none = free-form.
 */
function leftBorderClass(contentType: string | null | undefined): string {
  if (contentType === "daily_audio") return "border-l-[3px] border-l-primary";
  if (contentType === "weekly_principle") return "border-l-[3px] border-l-secondary";
  if (contentType === "monthly_theme") return "border-l-[3px] border-l-accent";
  return "";
}

export function JournalList({ notes }: JournalListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeNote, setActiveNote] = useState<MemberNote | null>(null);
  const [localEdits, setLocalEdits] = useState<Record<string, string>>({});

  function handleOpen(note: MemberNote) {
    setActiveNote(note);
  }

  function handleSaved(_isNew: boolean, savedText: string) {
    if (!activeNote) return;
    setLocalEdits((prev) => ({ ...prev, [activeNote.id]: savedText }));
    setActiveNote(null);
    startTransition(() => {
      router.refresh();
    });
  }

  // Group notes by month (notes are already sorted newest-first)
  const groups: Array<{ monthLabel: string; notes: MemberNote[] }> = [];
  let currentMonth = "";
  for (const note of notes) {
    const key = getMonthKey(note.updated_at);
    if (key !== currentMonth) {
      currentMonth = key;
      groups.push({ monthLabel: key, notes: [] });
    }
    groups[groups.length - 1].notes.push(note);
  }

  return (
    <>
      <div
        className={`flex flex-col gap-6 transition-opacity duration-300 ${
          isPending ? "opacity-60" : "opacity-100"
        }`}
      >
        {groups.map(({ monthLabel, notes: groupNotes }) => (
          <section key={monthLabel}>
            {/* Month divider — text-xs (up from 10px) at full muted opacity */}
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground whitespace-nowrap">
                {monthLabel}
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <ul className="flex flex-col gap-3" role="list">
              {groupNotes.map((note) => {
                const displayText = localEdits[note.id] ?? note.entry_text;
                const accentClass = leftBorderClass(note.content_type);

                return (
                  <li key={note.id}>
                    <button
                      type="button"
                      onClick={() => handleOpen(note)}
                      className={[
                        "w-full text-left bg-card rounded-2xl border border-border p-5",
                        "hover:border-primary/30 transition-colors group",
                        accentClass,
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      style={{ boxShadow: "var(--shadow-medium)" }}
                    >
                      {/* Content context (if tied to content) */}
                      {note.content_title && (
                        <div className="flex items-center gap-2 mb-2.5">
                          {note.content_type && (
                            <TypeBadge type={note.content_type} size="xs" />
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
          </section>
        ))}
      </div>

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
