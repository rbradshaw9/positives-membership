"use client";

import { useState } from "react";
import type { MonthWeeklyContent } from "@/lib/queries/get-month-weekly-content";
import { useMemberAudio } from "@/components/member/audio/MemberAudioProvider";

/**
 * components/today/WeeklyArchive.tsx
 *
 * Collapsible accordion of past weekly reflections for the current (or archived)
 * month. Each card shows title, excerpt, reflection prompt, and an inline play
 * button if audio is available.
 *
 * In live mode (Today page): currentWeekStart is passed to exclude the active
 * week (already shown in the "This Week" zone above).
 * In archive mode (library/months/[monthYear]): no exclusion — all weeks shown.
 */

interface WeeklyArchiveProps {
  weeks: MonthWeeklyContent[];
  /** If provided, this week_start value is excluded (it's shown above as current week) */
  currentWeekStart?: string | null;
}

function formatWeekLabel(weekStart: string | null): string {
  if (!weekStart) return "This Week";
  const d = new Date(weekStart + "T12:00:00");
  return new Intl.DateTimeFormat("en-US", {
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

function WeekCard({ week }: { week: MonthWeeklyContent }) {
  const [expanded, setExpanded] = useState(false);
  const { playTrack, isCurrentTrack, isPlaying, togglePlayback } = useMemberAudio();

  const hasAudio = !!(week.castos_episode_url || week.s3_audio_key);
  const hasVideo = !!(week.vimeo_video_id || week.youtube_video_id);
  const playing = isCurrentTrack(week.id) && isPlaying;
  const loaded = isCurrentTrack(week.id);

  function handlePlayClick() {
    if (loaded) {
      togglePlayback();
    } else {
      const src = week.castos_episode_url ?? "";
      if (!src) return;
      playTrack({
        id: week.id,
        title: week.title,
        subtitle: `Weekly Reflection · Week of ${formatWeekLabel(week.week_start)}`,
        src,
        durationLabel: formatDuration(week.duration_seconds),
      });
    }
  }

  return (
    <div
      className="rounded-[1.4rem] border overflow-hidden transition-all"
      style={{
        backgroundColor: loaded
          ? "color-mix(in srgb, var(--color-secondary) 5%, var(--color-card))"
          : "var(--color-card)",
        borderColor: loaded
          ? "color-mix(in srgb, var(--color-secondary) 25%, transparent)"
          : "var(--color-border)",
      }}
    >
      {/* ── Card header / toggle ─────────────────────────── */}
      <div className="flex items-start gap-3 px-5 py-4">
        {/* Play button (if audio) */}
        {hasAudio && (
          <button
            type="button"
            onClick={handlePlayClick}
            aria-label={playing ? "Pause" : `Play ${week.title}`}
            className="shrink-0 flex items-center justify-center w-9 h-9 rounded-full mt-0.5 transition-all hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40"
            style={{
              background: loaded
                ? "color-mix(in srgb, var(--color-secondary) 18%, transparent)"
                : "color-mix(in srgb, var(--color-secondary) 10%, transparent)",
              border: `1px solid color-mix(in srgb, var(--color-secondary) ${loaded ? "35" : "20"}%, transparent)`,
            }}
          >
            {playing ? (
              /* Animated bars when playing */
              <span className="flex items-end gap-[2px] h-3.5">
                {[1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className="w-[3px] rounded-full"
                    style={{
                      background: "var(--color-secondary)",
                      height: i === 2 ? "14px" : "8px",
                      animation: `equalizerBar${i} 0.8s ease-in-out infinite alternate`,
                    }}
                  />
                ))}
              </span>
            ) : (
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="var(--color-secondary)"
                stroke="none"
                aria-hidden="true"
              >
                <polygon points="5,3 19,12 5,21" />
              </svg>
            )}
          </button>
        )}

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex-1 min-w-0 flex items-start gap-3 text-left transition-colors hover:bg-accent/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 rounded-xl -mx-2 px-2 py-1"
          aria-expanded={expanded}
        >
          {/* Text content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-[9px] font-bold uppercase tracking-[0.16em]"
                style={{ color: "var(--color-secondary)" }}
              >
                Week of {formatWeekLabel(week.week_start)}
              </span>
              {hasVideo && (
                <span
                  className="text-[9px] font-bold uppercase tracking-[0.12em] px-1.5 py-0.5 rounded-full"
                  style={{
                    color: "var(--color-accent)",
                    background: "color-mix(in srgb, var(--color-accent) 10%, transparent)",
                  }}
                >
                  Video
                </span>
              )}
              {week.duration_seconds && (
                <span className="text-[10px] font-mono text-muted-foreground">
                  {formatDuration(week.duration_seconds)}
                </span>
              )}
            </div>
            <p className="text-sm font-semibold text-foreground leading-snug">
              {week.title}
            </p>
            {week.excerpt && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                {week.excerpt}
              </p>
            )}
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
            className="shrink-0 mt-1"
            style={{
              transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 200ms ease",
            }}
            aria-hidden="true"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>

      {/* ── Expanded: reflection prompt + body ──────────── */}
      {expanded && (week.reflection_prompt || week.body || week.description) && (
        <div
          className="px-5 pb-5 pt-0 flex flex-col gap-3"
          style={{ borderTop: "1px solid var(--color-border)" }}
        >
          {week.reflection_prompt && (
            <div
              className="rounded-xl px-4 py-3 mt-2"
              style={{
                background: "color-mix(in srgb, var(--color-secondary) 6%, transparent)",
                border: "1px solid color-mix(in srgb, var(--color-secondary) 14%, transparent)",
              }}
            >
              <p
                className="text-[10px] font-bold uppercase tracking-[0.14em] mb-1"
                style={{ color: "var(--color-secondary)" }}
              >
                Reflect
              </p>
              <p className="text-sm text-foreground/80 leading-relaxed italic">
                {week.reflection_prompt}
              </p>
            </div>
          )}
          {(week.body || week.description) && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {week.body || week.description}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function WeeklyArchive({ weeks, currentWeekStart }: WeeklyArchiveProps) {
  const pastWeeks = currentWeekStart
    ? weeks.filter((w) => w.week_start !== currentWeekStart)
    : weeks;

  if (pastWeeks.length === 0) return null;

  return (
    <section aria-labelledby="weekly-archive-heading">
      <style>{`
        @keyframes equalizerBar1 { from { height: 4px; } to { height: 14px; } }
        @keyframes equalizerBar2 { from { height: 10px; } to { height: 4px; } }
        @keyframes equalizerBar3 { from { height: 6px; } to { height: 12px; } }
      `}</style>

      <div className="mb-4">
        <h2
          id="weekly-archive-heading"
          className="font-heading font-semibold text-base text-foreground tracking-[-0.02em]"
        >
          Weekly Reflections
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Past weeks in this month — expand any to revisit the reflection.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {pastWeeks.map((week) => (
          <WeekCard key={week.id} week={week} />
        ))}
      </div>
    </section>
  );
}
