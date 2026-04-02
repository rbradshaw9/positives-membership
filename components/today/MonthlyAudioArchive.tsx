"use client";

import { useState } from "react";
import Link from "next/link";
import type { MonthlyDailyAudio } from "@/lib/queries/get-monthly-daily-audios";

/**
 * components/today/MonthlyAudioArchive.tsx
 *
 * Collapsible list of past daily audio practices for the current month.
 * Shown below the monthly/weekly grid on the Today page.
 *
 * - Displays 3 items by default, "Show all" expands to full list
 * - Each row links to the library detail page for that content
 * - Clean, compact row style — not full cards
 */

interface MonthlyAudioArchiveProps {
  audios: MonthlyDailyAudio[];
  monthName: string;
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

export function MonthlyAudioArchive({
  audios,
  monthName,
}: MonthlyAudioArchiveProps) {
  const [expanded, setExpanded] = useState(false);

  if (audios.length === 0) return null;

  const visible = expanded ? audios : audios.slice(0, PREVIEW_COUNT);
  const hasMore = audios.length > PREVIEW_COUNT;

  return (
    <section aria-labelledby="month-archive-heading">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2
            id="month-archive-heading"
            className="font-heading font-semibold text-base text-foreground tracking-[-0.02em]"
          >
            Earlier This Month
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {audios.length} practice{audios.length !== 1 ? "s" : ""} from{" "}
            {monthName}
          </p>
        </div>

        {/* Month badge */}
        <span
          className="inline-flex items-center text-[9px] font-bold uppercase tracking-[0.18em] px-2.5 py-1 rounded-full"
          style={{
            color: "var(--color-accent)",
            background:
              "color-mix(in srgb, var(--color-accent) 10%, transparent)",
            border:
              "1px solid color-mix(in srgb, var(--color-accent) 18%, transparent)",
          }}
        >
          {monthName}
        </span>
      </div>

      {/* ── List ───────────────────────────────────────────────────── */}
      <div
        className="rounded-[1.4rem] border border-border overflow-hidden"
        style={{ backgroundColor: "var(--color-card)" }}
      >
        {visible.map((audio, i) => (
          <Link
            key={audio.id}
            href={`/library/${audio.id}`}
            className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-accent/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            style={{
              borderBottom:
                i < visible.length - 1
                  ? "1px solid var(--color-border)"
                  : "none",
            }}
          >
            {/* Play icon */}
            <span
              className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full transition-all group-hover:scale-105"
              style={{
                background:
                  "color-mix(in srgb, var(--color-accent) 12%, transparent)",
                border:
                  "1px solid color-mix(in srgb, var(--color-accent) 22%, transparent)",
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

        {/* ── Expand / collapse trigger ─────────────────────────────── */}
        {hasMore && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="w-full flex items-center justify-center gap-2 px-5 py-3.5 text-xs font-semibold transition-all hover:bg-accent/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            style={{
              color: "var(--color-accent)",
              borderTop: "1px solid var(--color-border)",
            }}
          >
            {expanded ? (
              <>
                Show less
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-transform"
                  style={{ transform: "rotate(180deg)" }}
                  aria-hidden="true"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </>
            ) : (
              <>
                Show all {audios.length} practices
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </>
            )}
          </button>
        )}
      </div>
    </section>
  );
}
