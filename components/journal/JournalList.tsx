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

function formatMeta(note: MemberNote): string {
  const created = formatDate(note.created_at);
  const updated = formatDate(note.updated_at);
  return created === updated ? `Created ${created}` : `Updated ${updated}`;
}

function contextLabel(note: MemberNote): string {
  if (note.is_freeform) return "Free-form note";
  if (note.content_type === "daily_audio") return "Daily practice reflection";
  if (note.content_type === "weekly_principle") return "Weekly reflection";
  if (note.content_type === "monthly_theme") return "Monthly reflection";
  return "Reflection";
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
  const [query, setQuery] = useState("");
  const [activeNote, setActiveNote] = useState<MemberNote | null>(null);

  function handleOpen(note: MemberNote) {
    setActiveNote(note);
  }

  function handleSaved() {
    setActiveNote(null);
    startTransition(() => {
      router.refresh();
    });
  }

  function handleDeleted() {
    setActiveNote(null);
    startTransition(() => {
      router.refresh();
    });
  }

  const normalizedQuery = query.trim().toLowerCase();
  const filteredNotes = !normalizedQuery
    ? notes
    : notes.filter((note) => {
        const haystack = [
          note.entry_text,
          note.content_title ?? "",
          contextLabel(note),
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(normalizedQuery);
      });

  // Group notes by month (notes are already sorted newest-first)
  const groups: Array<{ monthLabel: string; notes: MemberNote[] }> = [];
  let currentMonth = "";
  for (const note of filteredNotes) {
    const key = getMonthKey(note.updated_at);
    if (key !== currentMonth) {
      currentMonth = key;
      groups.push({ monthLabel: key, notes: [] });
    }
    groups[groups.length - 1].notes.push(note);
  }

  return (
    <>
      <div className="mb-6">
        <label className="sr-only" htmlFor="journal-search">
          Search notes
        </label>
        <div className="relative">
          <input
            id="journal-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes or practice titles"
            className="w-full rounded-2xl border border-border bg-card px-4 py-3.5 pr-12 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </div>
      </div>

      <div
        className={`flex flex-col gap-6 transition-opacity duration-300 ${
          isPending ? "opacity-60" : "opacity-100"
        }`}
      >
        {groups.length === 0 && (
          <div className="rounded-2xl border border-border bg-card px-5 py-6 text-center">
            <p className="font-medium text-foreground">No matches yet</p>
            <p className="mt-2 text-sm leading-body text-muted-foreground">
              Try a different word, or clear your search to see all of your notes.
            </p>
          </div>
        )}

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
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        {note.content_type ? (
                          <TypeBadge type={note.content_type} size="xs" />
                        ) : (
                          <span className="rounded-full border border-border bg-muted/50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                            Free-form
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {contextLabel(note)}
                        </span>
                        {note.content_title && (
                          <span className="text-xs text-muted-foreground truncate">
                            · {note.content_title}
                          </span>
                        )}
                      </div>

                      {/* Note preview */}
                      <p className="text-sm text-foreground leading-body group-hover:text-foreground/80 transition-colors">
                        {truncate(note.entry_text)}
                      </p>

                      <div className="mt-3 flex items-center justify-between gap-3">
                        <p className="text-xs text-muted-foreground">{formatMeta(note)}</p>
                        <span className="text-xs font-semibold text-primary transition-colors group-hover:text-primary-hover">
                          Continue writing
                        </span>
                      </div>
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
          noteId={activeNote.id}
          contentId={activeNote.content_id}
          contentTitle={activeNote.content_title ?? undefined}
          initialText={activeNote.entry_text}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}
    </>
  );
}
