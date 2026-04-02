"use client";

import { useState } from "react";
import Link from "next/link";
import type { MonthGroup } from "@/lib/queries/get-monthly-daily-audios";

/**
 * components/today/MonthlyAudioArchive.tsx
 *
 * Collapsible archive of past daily audio practices, grouped by month.
 * - Current month's past days appear first (e.g. "April 2026 — 1 practice")
 * - Prior complete months appear below (e.g. "March 2026 — 31 practices")
 * - Each month group collapses independently
 * - Each row links to the library detail page for that content
 */

interface MonthlyAudioArchiveProps {
  monthGroups: MonthGroup[];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(d);
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = String(seconds % 60).padStart(2, "0");
  return `${m}:${s}`;
}

const PREVIEW_COUNT = 3;

function MonthSection({ group, defaultOpen }: { group: MonthGroup; defaultOpen: boolean }) {
  const [expanded, setExpanded] = useState(defaultOpen);
  const [showAll, setShowAll] = useState(false);

  const visible = showAll ? group.audios : group.audios.slice(0, PREVIEW_COUNT);
  const hasMore = group.audios.length > PREVIEW_COUNT;

  return (
    <div
      className="rounded-[1.4rem] border border-border overflow-hidden"
      style={{ backgroundColor: "var(--color-card)" }}
    >
      {/* ── Month header / toggle ─────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors hover:bg-accent/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
      >
        <div className="flex items-center gap-3">
          {/* Month badge */}
          <span
            className="inline-flex items-center text-[9px] font-bold uppercase tracking-[0.18em] px-2.5 py-1 rounded-full shrink-0"
            style={{
              color: "var(--color-accent)",
              background: "color-mix(in srgb, var(--color-accent) 10%, transparent)",
              border: "1px solid color-mix(in srgb, var(--color-accent) 18%, transparent)",
            }}
          >
            {group.monthName.split(" ")[0]}
          </span>
          <div>
            <span className="text-sm font-semibold text-foreground">
              {group.monthName}
            </span>
            <span className="ml-2 text-xs text-muted-foreground">
              {group.audios.length} practice{group.audios.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Chevron */}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--color-muted-fg)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 200ms ease",
          }}
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* ── Expanded list ─────────────────────────────────────────── */}
      {expanded && (
        <>
          {visible.map((audio, i) => (
            <Link
              key={audio.id}
              href={`/library/${audio.id}`}
              className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-accent/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              style={{
                borderTop: "1px solid var(--color-border)",
              }}
            >
              {/* Play icon */}
              <span
                className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full transition-all group-hover:scale-105"
                style={{
                  background: "color-mix(in srgb, var(--color-accent) 12%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--color-accent) 22%, transparent)",
                }}
                aria-hidden="true"
              >
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="var(--color-accent)"
                  stroke="none"
                >
                  <polygon points="5,3 19,12 5,21" />
                </svg>
              </span>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate group-hover:text-accent transition-colors">
                  {audio.title}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {audio.publish_date ? formatDate(audio.publish_date) : ""}
                </p>
              </div>

              {/* Duration + chevron */}
              <div className="shrink-0 flex items-center gap-3">
                {audio.duration_seconds ? (
                  <span
                    className="text-[11px] font-mono tabular-nums px-2 py-0.5 rounded-full"
                    style={{
                      color: "var(--color-muted-fg)",
                      background: "var(--color-muted)",
                    }}
                  >
                    {formatDuration(audio.duration_seconds)}
                  </span>
                ) : null}
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--color-muted-fg)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </div>
            </Link>
          ))}

          {/* Show all / show less */}
          {hasMore && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="w-full flex items-center justify-center gap-2 px-5 py-3.5 text-xs font-semibold transition-all hover:bg-accent/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              style={{
                color: "var(--color-accent)",
                borderTop: "1px solid var(--color-border)",
              }}
            >
              {showAll ? (
                <>
                  Show less
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: "rotate(180deg)" }} aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
                </>
              ) : (
                <>
                  Show all {group.audios.length} practices
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
                </>
              )}
            </button>
          )}
        </>
      )}
    </div>
  );
}

export function MonthlyAudioArchive({ monthGroups }: MonthlyAudioArchiveProps) {
  if (monthGroups.length === 0) return null;

  return (
    <section aria-labelledby="month-archive-heading">
      <div className="mb-4">
        <h2
          id="month-archive-heading"
          className="font-heading font-semibold text-base text-foreground tracking-[-0.02em]"
        >
          Your Practice Archive
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          All past practices — come back to any of them whenever you need.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {monthGroups.map((group, i) => (
          <MonthSection
            key={group.monthYear}
            group={group}
            defaultOpen={i === 0} // current (most recent) month open by default
          />
        ))}
      </div>
    </section>
  );
}
