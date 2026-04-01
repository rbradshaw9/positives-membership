"use client";

import { useState } from "react";
import Link from "next/link";
import { NoteSheet } from "@/components/notes/NoteSheet";
import { ResourceLinks } from "@/components/media/ResourceLinks";
import { getNoteForContent } from "@/app/(member)/notes/actions";
import { TypeBadge } from "@/components/member/TypeBadge";
import type { Json } from "@/types/supabase";

/**
 * components/library/LibraryList.tsx
 * Sprint 6: adds ResourceLinks rendering per item (download_url + resource_links).
 *
 * Client component so it can open NoteSheet inline when member
 * taps "View note" or "Reflect" on a library item.
 */

type EnrichedLibraryItem = {
  id: string;
  type: string;
  title: string;
  excerpt: string | null;
  description: string | null;
  download_url: string | null;
  resource_links: Json | null;
  duration_seconds: number | null;
  typeLabel: string;
  dateContext: string | null;
  hasNote: boolean;
};

interface LibraryListProps {
  items: EnrichedLibraryItem[];
}

export function LibraryList({ items }: LibraryListProps) {
  const [activeNote, setActiveNote] = useState<{
    contentId: string;
    contentTitle: string;
    initialText: string;
  } | null>(null);
  const [noteHasMap, setNoteHasMap] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    items.forEach((i) => { map[i.id] = i.hasNote; });
    return map;
  });

  async function openNote(item: EnrichedLibraryItem) {
    const existing = await getNoteForContent(item.id);
    setActiveNote({
      contentId: item.id,
      contentTitle: item.title,
      initialText: existing?.entry_text ?? "",
    });
  }

  function handleNoteSaved(contentId: string) {
    setNoteHasMap((prev) => ({ ...prev, [contentId]: true }));
    setActiveNote(null);
  }

  // Accent color per content type for ResourceLinks
  function accentClassForType(type: string): string {
    if (type === "weekly_principle") return "text-secondary hover:text-secondary-hover";
    if (type === "monthly_theme") return "text-accent hover:text-accent-hover";
    return "text-primary hover:text-primary-hover";
  }

  return (
    <>
      <ul className="flex flex-col gap-3" role="list">
        {items.map((item) => (
          <li key={item.id}>
            <article className="bg-card rounded-xl border border-border shadow-soft p-5">
              {/* Type + date row */}
              <div className="flex items-center justify-between mb-2">
                <TypeBadge type={item.type} />
                {item.dateContext && (
                  <span className="text-xs text-muted-foreground">
                    {item.dateContext}
                  </span>
                )}
              </div>

              {/* Title — links to detail page */}
              <h2 className="font-heading font-semibold text-base text-foreground leading-heading tracking-[-0.02em] mb-1">
                <Link
                  href={`/library/${item.id}`}
                  className="hover:text-primary transition-colors"
                >
                  {item.title}
                </Link>
              </h2>

              {/* Excerpt */}
              {(item.excerpt ?? item.description) && (
                <p className="text-sm text-muted-foreground leading-body line-clamp-2 mb-3">
                  {item.excerpt ?? item.description}
                </p>
              )}

              {/* Duration chip — only for audio */}
              {item.type === "daily_audio" && item.duration_seconds && (
                <p className="text-xs text-muted-foreground mb-3">
                  {Math.floor(item.duration_seconds / 60)} min
                </p>
              )}

              {/* Resource links */}
              {(item.download_url || item.resource_links) && (
                <div className="mb-3">
                  <ResourceLinks
                    downloadUrl={item.download_url}
                    resourceLinks={item.resource_links}
                    accentClass={accentClassForType(item.type)}
                  />
                </div>
              )}

              {/* Note action + detail link */}
              <div className="pt-3 border-t border-border flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => openNote(item)}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all"
                  style={{
                    background: noteHasMap[item.id]
                      ? "color-mix(in srgb, var(--color-secondary) 12%, transparent)"
                      : "color-mix(in srgb, var(--color-secondary) 8%, transparent)",
                    color: "var(--color-secondary)",
                    border: "1px solid color-mix(in srgb, var(--color-secondary) 20%, transparent)",
                  }}
                >
                  <svg
                    width="11"
                    height="11"
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
                    {noteHasMap[item.id] ? "View note" : "Reflect"}
                  </span>
                  {noteHasMap[item.id] && (
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary/70 inline-block" aria-label="Note exists" />
                  )}
                </button>

                <Link
                  href={`/library/${item.id}`}
                  className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span>Read more</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </Link>
              </div>
            </article>
          </li>
        ))}
      </ul>

      {activeNote && (
        <NoteSheet
          isOpen={true}
          onClose={() => setActiveNote(null)}
          contentId={activeNote.contentId}
          contentTitle={activeNote.contentTitle}
          initialText={activeNote.initialText}
          onSaved={() => handleNoteSaved(activeNote.contentId)}
        />
      )}
    </>
  );
}

