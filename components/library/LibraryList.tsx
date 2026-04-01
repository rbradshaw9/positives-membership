"use client";

import { useState } from "react";
import { NoteSheet } from "@/components/notes/NoteSheet";
import { ResourceLinks } from "@/components/media/ResourceLinks";
import { getNoteForContent } from "@/app/(member)/notes/actions";
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
                <TypeBadge type={item.type} label={item.typeLabel} />
                {item.dateContext && (
                  <span className="text-xs text-muted-foreground">
                    {item.dateContext}
                  </span>
                )}
              </div>

              {/* Title */}
              <h2 className="font-heading font-semibold text-base text-foreground leading-heading tracking-[-0.02em] mb-1">
                {item.title}
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

              {/* Note action */}
              <div className="pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => openNote(item)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
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
                    {noteHasMap[item.id] ? "View note" : "Reflect"}
                  </span>
                  {noteHasMap[item.id] && (
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary inline-block ml-0.5" aria-label="Note exists" />
                  )}
                </button>
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

function TypeBadge({ type, label }: { type: string; label: string }) {
  const colorMap: Record<string, string> = {
    daily_audio: "text-primary bg-primary/10",
    weekly_principle: "text-secondary bg-secondary/10",
    monthly_theme: "text-accent bg-accent/10",
  };
  const cls = colorMap[type] ?? "text-muted-foreground bg-muted";

  return (
    <span className={`text-[10px] font-medium uppercase tracking-widest px-2 py-0.5 rounded-full ${cls}`}>
      {label}
    </span>
  );
}
