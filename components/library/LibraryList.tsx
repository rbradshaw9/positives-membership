"use client";

import { useState } from "react";
import Link from "next/link";
import { NoteSheet } from "@/components/notes/NoteSheet";
import { ResourceLinks } from "@/components/media/ResourceLinks";
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
  vimeo_video_id: string | null;
  youtube_video_id: string | null;
  castos_episode_url: string | null;
  s3_audio_key: string | null;
  duration_seconds: number | null;
  typeLabel: string;
  dateContext: string | null;
  noteCount: number;
};

interface LibraryListProps {
  items: EnrichedLibraryItem[];
}

function thumbClasses(type: string): string {
  if (type === "weekly_principle") return "bg-[linear-gradient(160deg,#16364B_0%,#0B1E29_100%)]";
  if (type === "monthly_theme") return "bg-[linear-gradient(160deg,#3B2A12_0%,#171108_100%)]";
  if (type === "coaching_call") return "bg-[linear-gradient(160deg,#1A1B2A_0%,#0F1018_100%)]";
  return "bg-[linear-gradient(160deg,#14312D_0%,#0A1715_100%)]";
}

function youtubeThumbnailUrl(item: EnrichedLibraryItem): string | null {
  if (!item.youtube_video_id) return null;
  return `https://img.youtube.com/vi/${item.youtube_video_id}/hqdefault.jpg`;
}

function mediaBadges(item: EnrichedLibraryItem): string[] {
  const badges: string[] = [];
  if (item.castos_episode_url || item.s3_audio_key) badges.push("Audio");
  if (item.vimeo_video_id || item.youtube_video_id) badges.push("Video");
  if (item.download_url) badges.push("Download");
  if (badges.length === 0) badges.push(item.typeLabel);
  return badges;
}

export function LibraryList({ items }: LibraryListProps) {
  const [activeNote, setActiveNote] = useState<{
    contentId: string;
    contentTitle: string;
    existingReflectionCount: number;
  } | null>(null);
  const [noteCountMap, setNoteCountMap] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    items.forEach((i) => { map[i.id] = i.noteCount; });
    return map;
  });

  function openNote(item: EnrichedLibraryItem) {
    setActiveNote({
      contentId: item.id,
      contentTitle: item.title,
      existingReflectionCount: noteCountMap[item.id] ?? 0,
    });
  }

  function handleNoteSaved(contentId: string, result: { isNew: boolean }) {
    if (result.isNew) {
      setNoteCountMap((prev) => ({ ...prev, [contentId]: (prev[contentId] ?? 0) + 1 }));
    }
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
      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" role="list">
        {items.map((item) => (
          <li key={item.id}>
            <article className="surface-card surface-card--editorial group flex h-full flex-col overflow-hidden transition-transform duration-200 hover:-translate-y-1 hover:shadow-large focus-within:-translate-y-1 focus-within:shadow-large">
              <div className={`relative aspect-[16/10] ${thumbClasses(item.type)}`}>
                {youtubeThumbnailUrl(item) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={youtubeThumbnailUrl(item)!}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover opacity-35 transition-opacity duration-200 group-hover:opacity-50"
                  />
                ) : null}
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.08) 1px, transparent 0)",
                    backgroundSize: "20px 20px",
                  }}
                />
                <div className="absolute inset-0 flex flex-col justify-between p-4">
                  <div className="flex items-start justify-between gap-3">
                    <span className="rounded-full bg-black/38 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/82">
                      {item.typeLabel}
                    </span>
                    {item.dateContext && (
                      <span className="rounded-full bg-black/35 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/80">
                        {item.dateContext}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {mediaBadges(item).map((badge) => (
                      <span
                        key={badge}
                        className="rounded-full bg-black/40 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/78"
                      >
                        {badge}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex h-full flex-col p-5">
                <div className="mb-3 flex items-center gap-2">
                  <TypeBadge type={item.type} size="xs" />
                  {item.duration_seconds ? (
                    <span className="text-xs font-medium text-muted-foreground">
                      {Math.max(1, Math.round(item.duration_seconds / 60))} min
                    </span>
                  ) : null}
                </div>

                <h2 className="mb-2 font-heading text-2xl font-semibold leading-heading tracking-[-0.03em] text-foreground">
                  <Link
                    href={`/library/${item.id}`}
                    className="heading-balance rounded-sm transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
                  >
                    {item.title}
                  </Link>
                </h2>

                {(item.excerpt ?? item.description) && (
                  <p className="mb-4 line-clamp-3 text-sm leading-[1.7] text-muted-foreground">
                    {item.excerpt ?? item.description}
                  </p>
                )}

                {(item.download_url || item.resource_links) && (
                  <div className="mb-4">
                    <ResourceLinks
                      downloadUrl={item.download_url}
                      resourceLinks={item.resource_links}
                      accentClass={accentClassForType(item.type)}
                    />
                  </div>
                )}

                <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-4">
                  <button
                    type="button"
                    onClick={() => openNote(item)}
                    className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-3.5 py-1.5 text-xs font-semibold text-primary transition-all hover:border-primary/30 hover:bg-primary/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
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
                      {(noteCountMap[item.id] ?? 0) > 0 ? "Add reflection" : "Reflect"}
                    </span>
                    {(noteCountMap[item.id] ?? 0) > 0 && (
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary/80" />
                    )}
                  </button>

                  <Link
                    href={`/library/${item.id}`}
                    className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-primary/25 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                  >
                    <span>Open</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </Link>
                </div>
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
          existingReflectionCount={activeNote.existingReflectionCount}
          onSaved={(result) => handleNoteSaved(activeNote.contentId, result)}
        />
      )}
    </>
  );
}
