"use client";

import { useState } from "react";
import { useMemberAudio } from "@/components/member/audio/MemberAudioProvider";
import type { MonthGroup } from "@/lib/queries/get-monthly-daily-audios";

/**
 * components/today/MonthlyAudioArchive.tsx
 *
 * Inline playlist of daily audio practices, grouped by month.
 * Rows play directly in the persistent bottom player — no navigation
 * to /library/[id]. The currently-playing row is highlighted.
 *
 * - Current month's past days appear first
 * - Prior complete months appear below, collapsed by default
 * - Each row fires playTrack() from the global audio context
 */

interface MonthlyAudioArchiveProps {
  monthGroups: MonthGroup[];
  /** e.g. "April" — used to render the section heading */
  currentMonthName: string;
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

const PREVIEW_COUNT = 5;

function AudioRow({
  audio,
}: {
  audio: MonthGroup["audios"][number];
}) {
  const {
    playTrack,
    isCurrentTrack,
    isPlaying,
    togglePlayback,
    currentTime,
    duration,
    progress,
    seekTo,
    seekBy,
    formatTime,
  } = useMemberAudio();

  const isThis = isCurrentTrack(audio.id);
  const playing = isThis && isPlaying;
  const src = audio.castos_episode_url ?? "";

  function handleClick() {
    if (!src) return;
    if (isThis) {
      togglePlayback();
    } else {
      playTrack({
        id: audio.id,
        title: audio.title,
        subtitle: audio.publish_date ? `Daily Practice · ${formatDate(audio.publish_date)}` : "Daily Practice",
        src,
        durationLabel: formatDuration(audio.duration_seconds),
        onCompleteAction: { kind: "daily_listened", contentId: audio.id },
      });
    }
  }

  // Scrub bar interaction — click anywhere on the bar to seek
  function handleScrubClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    seekTo(fraction * duration);
  }

  return (
    <div
      className="w-full transition-all"
      style={{
        borderTop: "1px solid var(--color-border)",
        borderLeft: isThis ? "3px solid var(--color-accent)" : "3px solid transparent",
        background: isThis
          ? "color-mix(in srgb, var(--color-accent) 5%, transparent)"
          : "transparent",
      }}
    >
      {/* Main row: play/pause button + title + date + duration */}
      <button
        type="button"
        onClick={handleClick}
        disabled={!src}
        className="group w-full flex items-center gap-4 px-5 py-3.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-40"
        aria-label={`${playing ? "Pause" : "Play"} ${audio.title}`}
      >
        {/* Play / Pause / Equalizer icon */}
        <span
          className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full transition-all group-hover:scale-105"
          style={{
            background: isThis
              ? "color-mix(in srgb, var(--color-accent) 18%, transparent)"
              : "color-mix(in srgb, var(--color-accent) 10%, transparent)",
            border: `1px solid color-mix(in srgb, var(--color-accent) ${isThis ? "30" : "20"}%, transparent)`,
          }}
          aria-hidden="true"
        >
          {playing ? (
            <span className="flex items-end gap-[2px] h-3">
              <span className="w-[3px] rounded-full" style={{ background: "var(--color-accent)", animation: "equalizerBar1 0.8s ease-in-out infinite alternate" }} />
              <span className="w-[3px] rounded-full" style={{ background: "var(--color-accent)", animation: "equalizerBar2 0.8s ease-in-out infinite alternate" }} />
              <span className="w-[3px] rounded-full" style={{ background: "var(--color-accent)", animation: "equalizerBar3 0.8s ease-in-out infinite alternate" }} />
            </span>
          ) : (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="var(--color-accent)" stroke="none" aria-hidden="true">
              <polygon points="5,3 19,12 5,21" />
            </svg>
          )}
        </span>

        {/* Title + date */}
        <div className="flex-1 min-w-0">
          <p
            className="text-sm font-medium truncate transition-colors"
            style={{ color: isThis ? "var(--color-accent)" : "var(--color-foreground)" }}
          >
            {audio.title}
          </p>
          {audio.publish_date && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatDate(audio.publish_date)}
            </p>
          )}
        </div>

        {/* Duration / time remaining */}
        {audio.duration_seconds ? (
          <span
            className="shrink-0 text-[11px] font-mono tabular-nums px-2 py-0.5 rounded-full"
            style={{
              color: isThis ? "var(--color-accent)" : "var(--color-muted-fg)",
              background: isThis
                ? "color-mix(in srgb, var(--color-accent) 10%, transparent)"
                : "var(--color-muted)",
            }}
          >
            {isThis && currentTime > 0
              ? `-${formatTime(Math.max(0, duration - currentTime))}`
              : formatDuration(audio.duration_seconds)}
          </span>
        ) : null}
      </button>

      {/* Expanded controls — only shown for the active track */}
      {isThis && (
        <div className="px-5 pb-3.5 flex items-center gap-3" aria-label="Audio controls">
          {/* -15s */}
          <button
            type="button"
            onClick={() => seekBy(-15)}
            className="shrink-0 flex flex-col items-center gap-0.5 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none"
            aria-label="Skip back 15 seconds"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M2.5 2v6h6M2.66 15.57a10 10 0 1 0 .57-8.38" />
            </svg>
            <span className="text-[9px] font-bold">15</span>
          </button>

          {/* Scrub bar */}
          <div
            className="flex-1 relative group/scrub"
            role="slider"
            aria-label="Seek audio"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress)}
            aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
            tabIndex={0}
            onClick={handleScrubClick}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") seekBy(5);
              if (e.key === "ArrowLeft") seekBy(-5);
            }}
            style={{ cursor: "pointer", paddingBlock: "6px" }}
          >
            {/* Track */}
            <div
              className="w-full rounded-full overflow-hidden"
              style={{ height: "4px", background: "var(--color-muted)" }}
            >
              {/* Fill */}
              <div
                className="h-full rounded-full transition-all duration-100"
                style={{
                  width: `${progress}%`,
                  background: "var(--color-accent)",
                }}
              />
            </div>
            {/* Thumb — appears on hover/focus */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full opacity-0 group-hover/scrub:opacity-100 transition-opacity"
              style={{
                left: `calc(${progress}% - 6px)`,
                background: "var(--color-accent)",
                boxShadow: "0 0 0 3px color-mix(in srgb, var(--color-accent) 25%, transparent)",
              }}
              aria-hidden="true"
            />
          </div>

          {/* Current time */}
          <span className="shrink-0 text-[11px] font-mono tabular-nums text-muted-foreground w-10 text-right">
            {formatTime(currentTime)}
          </span>

          {/* +15s */}
          <button
            type="button"
            onClick={() => seekBy(15)}
            className="shrink-0 flex flex-col items-center gap-0.5 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none"
            aria-label="Skip forward 15 seconds"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38" />
            </svg>
            <span className="text-[9px] font-bold">15</span>
          </button>
        </div>
      )}
    </div>
  );
}


function MonthSection({
  group,
  defaultOpen,
}: {
  group: MonthGroup;
  defaultOpen: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultOpen);
  const [showAll, setShowAll] = useState(false);

  const visible = showAll ? group.audios : group.audios.slice(0, PREVIEW_COUNT);
  const hasMore = group.audios.length > PREVIEW_COUNT;

  return (
    <div
      className="rounded-[1.4rem] border border-border overflow-hidden"
      style={{ backgroundColor: "var(--color-card)" }}
    >
      {/* ── Month header / toggle ───────────────────────── */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors hover:bg-accent/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-3">
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

      {/* ── Playlist rows ───────────────────────────────── */}
      {expanded && (
        <>
          <style>{`
            @keyframes equalizerBar1 { from { height: 4px; } to { height: 12px; } }
            @keyframes equalizerBar2 { from { height: 9px; } to { height: 3px; } }
            @keyframes equalizerBar3 { from { height: 5px; } to { height: 11px; } }
          `}</style>

          {visible.map((audio) => (
            <AudioRow key={audio.id} audio={audio} />
          ))}

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

export function MonthlyAudioArchive({ monthGroups, currentMonthName }: MonthlyAudioArchiveProps) {
  if (monthGroups.length === 0) return null;

  return (
    <section aria-labelledby="month-archive-heading">
      <div className="mb-4">
        <h2
          id="month-archive-heading"
          className="font-heading font-semibold text-base text-foreground tracking-[-0.02em]"
        >
          {currentMonthName}&apos;s Daily Practices
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Tap any day to play it inline.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {monthGroups.map((group, i) => (
          <MonthSection
            key={group.monthYear}
            group={group}
            defaultOpen={i === 0}
          />
        ))}
      </div>
    </section>
  );
}
