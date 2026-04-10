"use client";

import { useEffect, useMemo, useState } from "react";
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
  listenedContentIds?: string[];
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

function getWeekStart(dateStr: string): string {
  const date = new Date(`${dateStr}T12:00:00`);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date.toISOString().slice(0, 10);
}

function formatWeekRangeLabel(startDate: string, endDate: string): string {
  const start = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);

  const sameMonth =
    start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();

  const startLabel = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(start);

  const endLabel = new Intl.DateTimeFormat("en-US", {
    ...(sameMonth ? {} : { month: "short" }),
    day: "numeric",
  }).format(end);

  return `${startLabel} - ${endLabel}`;
}

interface WeekGroup {
  weekStart: string;
  rangeLabel: string;
  audios: MonthGroup["audios"];
}

function groupAudiosByWeek(audios: MonthGroup["audios"]): WeekGroup[] {
  const groups = new Map<string, MonthGroup["audios"]>();

  for (const audio of audios) {
    const dateStr = audio.publish_date;
    if (!dateStr) continue;
    const weekStart = getWeekStart(dateStr);
    const current = groups.get(weekStart) ?? [];
    current.push(audio);
    groups.set(weekStart, current);
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([weekStart, weekAudios]) => {
      const sortedAudios = [...weekAudios].sort((a, b) =>
        (b.publish_date ?? "").localeCompare(a.publish_date ?? "")
      );
      const oldest = sortedAudios[sortedAudios.length - 1]?.publish_date ?? weekStart;
      const newest = sortedAudios[0]?.publish_date ?? weekStart;

      return {
        weekStart,
        rangeLabel: formatWeekRangeLabel(oldest, newest),
        audios: sortedAudios,
      };
    });
}

function AudioRow({
  audio,
  listened,
}: {
  audio: MonthGroup["audios"][number];
  listened: boolean;
}) {
  const {
    playTrack,
    isCurrentTrack,
    isPlaying,
    togglePlayback,
    currentTime,
    duration,
    progress,
    playbackRate,
    setPlaybackRate,
    seekTo,
    seekBy,
    formatTime,
  } = useMemberAudio();

  const SPEEDS = [1, 1.25, 1.5, 1.75, 2, 0.75];
  function cycleSpeed() {
    const idx = SPEEDS.indexOf(playbackRate);
    const next = SPEEDS[(idx + 1) % SPEEDS.length] ?? 1;
    setPlaybackRate(next);
  }
  function formatSpeed(rate: number) {
    return `${rate}×`;
  }

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

  const pct = progress * 100; // progress is 0–1 fraction from store

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
      {/* Single row: play · title/date · [controls when active] · duration */}
      <div className="flex items-center gap-3 px-4 py-3">

        {/* ── Play / Pause button ── */}
        <button
          type="button"
          onClick={handleClick}
          disabled={!src}
          className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full transition-all hover:scale-105 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2"
          style={{
            background: isThis
              ? "color-mix(in srgb, var(--color-accent) 18%, transparent)"
              : "color-mix(in srgb, var(--color-accent) 10%, transparent)",
            border: `1px solid color-mix(in srgb, var(--color-accent) ${isThis ? "30" : "20"}%, transparent)`,
          }}
          aria-label={`${playing ? "Pause" : "Play"} ${audio.title}`}
        >
          {playing ? (
            <span className="flex items-end gap-[2px] h-3" aria-hidden="true">
              <span className="w-[3px] rounded-full" style={{ background: "var(--color-accent)", animation: "equalizerBar1 0.8s ease-in-out infinite alternate" }} />
              <span className="w-[3px] rounded-full" style={{ background: "var(--color-accent)", animation: "equalizerBar2 0.8s ease-in-out infinite alternate" }} />
              <span className="w-[3px] rounded-full" style={{ background: "var(--color-accent)", animation: "equalizerBar3 0.8s ease-in-out infinite alternate" }} />
            </span>
          ) : (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="var(--color-accent)" stroke="none" aria-hidden="true">
              <polygon points="5,3 19,12 5,21" />
            </svg>
          )}
        </button>

        {/* ── Title + date — constrained when controls are visible ── */}
        <div className={isThis ? "shrink-0 w-40 sm:w-52 min-w-0" : "flex-1 min-w-0"}>
          <div className="flex items-center gap-2 min-w-0">
            <p
              className="text-sm font-medium truncate transition-colors"
              style={{ color: isThis ? "var(--color-accent)" : "var(--color-foreground)" }}
            >
              {audio.title}
            </p>
            <span
              className="shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{
                color: listened ? "#15803D" : "var(--color-muted-fg)",
                background: listened
                  ? "rgba(22,163,74,0.10)"
                  : "var(--color-muted)",
                border: listened
                  ? "1px solid rgba(22,163,74,0.16)"
                  : "1px solid var(--color-border)",
              }}
              aria-label={listened ? "Listened" : "Not listened yet"}
              title={listened ? "Listened" : "Not listened yet"}
            >
              {listened ? "✓" : "○"}
            </span>
          </div>
          {audio.publish_date && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {formatDate(audio.publish_date)}
            </p>
          )}
        </div>

        {/* ── Inline controls — only when active ── */}
        {isThis && (
          <>
            {/* Skip back 15s */}
            <button
              type="button"
              onClick={() => seekBy(-15)}
              className="shrink-0 flex flex-col items-center gap-0.5 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none"
              aria-label="Skip back 15 seconds"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M2.5 2v6h6M2.66 15.57a10 10 0 1 0 .57-8.38" />
              </svg>
              <span className="text-[9px] font-bold leading-none">15</span>
            </button>

            {/* Scrub bar */}
            <div
              className="flex-1 relative group/scrub"
              role="slider"
              aria-label="Seek audio"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(pct)}
              aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
              tabIndex={0}
              onClick={handleScrubClick}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight") seekBy(5);
                if (e.key === "ArrowLeft") seekBy(-5);
              }}
              style={{ cursor: "pointer", paddingBlock: "8px" }}
            >
              {/* Track */}
              <div
                className="w-full rounded-full overflow-hidden"
                style={{ height: "4px", background: "var(--color-muted)" }}
              >
                {/* Fill — progress is 0–1, convert to % */}
                <div
                  className="h-full rounded-full transition-all duration-100"
                  style={{ width: `${pct}%`, background: "var(--color-accent)" }}
                />
              </div>
              {/* Thumb */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full opacity-0 group-hover/scrub:opacity-100 transition-opacity"
                style={{
                  left: `calc(${pct}% - 6px)`,
                  background: "var(--color-accent)",
                  boxShadow: "0 0 0 3px color-mix(in srgb, var(--color-accent) 25%, transparent)",
                }}
                aria-hidden="true"
              />
            </div>

            {/* Current time */}
            <span className="shrink-0 text-[11px] font-mono tabular-nums text-muted-foreground w-8 text-right">
              {formatTime(currentTime)}
            </span>

            {/* Skip forward 15s */}
            <button
              type="button"
              onClick={() => seekBy(15)}
              className="shrink-0 flex flex-col items-center gap-0.5 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none"
              aria-label="Skip forward 15 seconds"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38" />
              </svg>
              <span className="text-[9px] font-bold leading-none">15</span>
            </button>

            {/* Speed */}
            <button
              type="button"
              onClick={cycleSpeed}
              className="shrink-0 px-2 py-0.5 rounded-full tabular-nums text-[11px] font-bold transition-colors focus-visible:outline-none"
              style={{
                color: "var(--color-accent)",
                background: "color-mix(in srgb, var(--color-accent) 10%, transparent)",
                border: "1px solid color-mix(in srgb, var(--color-accent) 20%, transparent)",
              }}
              aria-label={`Playback speed: ${formatSpeed(playbackRate)}. Click to change.`}
              title="Change playback speed"
            >
              {formatSpeed(playbackRate)}
            </button>
          </>
        )}

        {/* ── Duration / time-remaining badge ── */}
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

      </div>
    </div>
  );
}


function MonthSection({
  group,
  defaultOpen,
  listenedIds,
}: {
  group: MonthGroup;
  defaultOpen: boolean;
  listenedIds: Set<string>;
}) {
  const [expanded, setExpanded] = useState(defaultOpen);
  const weekGroups = useMemo(() => groupAudiosByWeek(group.audios), [group.audios]);
  const weekCount = weekGroups.length;

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
              · {group.audios.length} practice{group.audios.length !== 1 ? "s" : ""} ·{" "}
              {weekCount} week{weekCount !== 1 ? "s" : ""}
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

          <WeekPickerSection weekGroups={weekGroups} listenedIds={listenedIds} />
        </>
      )}
    </div>
  );
}

function WeekPickerSection({
  weekGroups,
  listenedIds,
}: {
  weekGroups: WeekGroup[];
  listenedIds: Set<string>;
}) {
  const [selectedWeekStart, setSelectedWeekStart] = useState<string | null>(
    weekGroups[0]?.weekStart ?? null
  );

  const activeWeek =
    weekGroups.find((group) => group.weekStart === selectedWeekStart) ?? weekGroups[0] ?? null;

  if (!activeWeek) return null;

  const listenedCount = activeWeek.audios.filter((audio) => listenedIds.has(audio.id)).length;

  return (
    <div className="flex flex-col gap-4 px-4 pb-4 pt-4">
      {weekGroups.length > 1 ? (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground mb-2">
            Browse by week
          </p>
          <div className="flex flex-wrap gap-2">
            {weekGroups.map((group) => {
              const isActive = group.weekStart === activeWeek.weekStart;
              return (
                <button
                  key={group.weekStart}
                  type="button"
                  onClick={() => setSelectedWeekStart(group.weekStart)}
                  className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                  style={{
                    color: isActive ? "var(--color-accent)" : "var(--color-foreground)",
                    background: isActive
                      ? "color-mix(in srgb, var(--color-accent) 10%, transparent)"
                      : "var(--color-muted)",
                    border: isActive
                      ? "1px solid color-mix(in srgb, var(--color-accent) 22%, transparent)"
                      : "1px solid var(--color-border)",
                  }}
                >
                  <span className="text-xs font-semibold">{group.rangeLabel}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {group.audios.length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-border overflow-hidden">
        <div className="px-5 py-3.5 bg-accent/5 border-b border-border">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="inline-flex items-center text-[9px] font-bold uppercase tracking-[0.16em] px-2 py-1 rounded-full"
              style={{
                color: "var(--color-accent)",
                background: "color-mix(in srgb, var(--color-accent) 10%, transparent)",
                border: "1px solid color-mix(in srgb, var(--color-accent) 18%, transparent)",
              }}
            >
              {activeWeek.rangeLabel}
            </span>
            <span className="text-xs text-muted-foreground">
              {activeWeek.audios.length} practice
              {activeWeek.audios.length !== 1 ? "s" : ""} · {listenedCount} listened
            </span>
          </div>
        </div>

        <div>
          {activeWeek.audios.map((audio) => (
            <AudioRow key={audio.id} audio={audio} listened={listenedIds.has(audio.id)} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function MonthlyAudioArchive({
  monthGroups,
  currentMonthName,
  listenedContentIds = [],
}: MonthlyAudioArchiveProps) {
  const [listenedIds, setListenedIds] = useState<Set<string>>(
    () => new Set(listenedContentIds)
  );

  useEffect(() => {
    function handleTodayListened(event: Event) {
      const detail = (event as CustomEvent<{ contentId?: string | null }>).detail;
      if (!detail?.contentId) return;
      setListenedIds((current) => {
        const next = new Set(current);
        next.add(detail.contentId!);
        return next;
      });
    }

    window.addEventListener("positives:today-listened", handleTodayListened);
    return () => window.removeEventListener("positives:today-listened", handleTodayListened);
  }, []);

  const listenedCount = useMemo(
    () =>
      monthGroups.reduce(
        (sum, group) =>
          sum + group.audios.filter((audio) => listenedIds.has(audio.id)).length,
        0
      ),
    [listenedIds, monthGroups]
  );
  const totalCount = useMemo(
    () => monthGroups.reduce((sum, group) => sum + group.audios.length, 0),
    [monthGroups]
  );

  if (monthGroups.length === 0) return null;

  return (
    <section aria-labelledby="month-archive-heading">
      <div className="mb-4">
        <h2
          id="month-archive-heading"
          className="font-heading font-semibold text-base text-foreground tracking-[-0.02em]"
          style={{ textWrap: "balance" }}
        >
          {currentMonthName}&apos;s Daily Practices
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Tap any day to play it inline. Practices are grouped by week to keep the month easy to revisit.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {listenedCount} of {totalCount} marked listened
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {monthGroups.length === 1 ? (
          <div
            className="rounded-[1.4rem] border border-border overflow-hidden"
            style={{ backgroundColor: "var(--color-card)" }}
          >
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
              <span
                className="inline-flex items-center text-[9px] font-bold uppercase tracking-[0.18em] px-2.5 py-1 rounded-full shrink-0"
                style={{
                  color: "var(--color-accent)",
                  background: "color-mix(in srgb, var(--color-accent) 10%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--color-accent) 18%, transparent)",
                }}
              >
                {monthGroups[0]?.monthName.split(" ")[0]}
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {monthGroups[0]?.monthName}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Jump to a week, then play any day inline.
                </p>
              </div>
            </div>

            <WeekPickerSection
              weekGroups={groupAudiosByWeek(monthGroups[0]?.audios ?? [])}
              listenedIds={listenedIds}
            />
          </div>
        ) : (
          monthGroups.map((group, i) => (
            <MonthSection
              key={group.monthYear}
              group={group}
              defaultOpen={i === 0}
              listenedIds={listenedIds}
            />
          ))
        )}
      </div>
    </section>
  );
}
