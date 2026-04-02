"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useMemberAudio } from "@/components/member/audio/MemberAudioProvider";

/**
 * components/member/PersistentAudioPlayer.tsx
 *
 * Sticky bottom audio bar with two modes:
 *   - Expanded (default): progress bar, skip controls, title, close
 *   - Mini: single pill showing title + play/pause only. Tap chevron to expand.
 *
 * Mini mode persists in sessionStorage so it survives navigation within a session.
 */

const MINI_KEY = "positives:player:mini";

function readMini(): boolean {
  try {
    return sessionStorage.getItem(MINI_KEY) === "1";
  } catch {
    return false;
  }
}

function writeMini(v: boolean) {
  try {
    sessionStorage.setItem(MINI_KEY, v ? "1" : "0");
  } catch {
    // ignore
  }
}

export function PersistentAudioPlayer() {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    progress,
    playbackRate,
    setPlaybackRate,
    togglePlayback,
    seekBy,
    seekTo,
    clearTrack,
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

  const pathname = usePathname();
  const playerRef = useRef<HTMLDivElement>(null);
  const [mini, setMini] = useState(false);

  // Read persisted mini state on mount
  useEffect(() => {
    setMini(readMini());
  }, []);

  function toggleMini() {
    setMini((v) => {
      const next = !v;
      writeMini(next);
      return next;
    });
  }

  // Sync CSS custom property so layout bottom-padding stays correct.
  // IMPORTANT: .member-shell declares --member-player-height: 0px which
  // shadows any value set on <html>. We must set it on .member-shell itself.
  useEffect(() => {
    const shell = document.querySelector<HTMLElement>(".member-shell");
    const player = playerRef.current;

    // Also clear the height when on /today (player is hidden there)
    if (!currentTrack || !player || !shell || pathname === "/today") {
      shell?.style.setProperty("--member-player-height", "0px");
      return;
    }

    const syncPlayerHeight = () => {
      shell.style.setProperty(
        "--member-player-height",
        `${player.getBoundingClientRect().height}px`
      );
    };

    syncPlayerHeight();

    const observer = new ResizeObserver(syncPlayerHeight);
    observer.observe(player);
    window.addEventListener("resize", syncPlayerHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", syncPlayerHeight);
      shell.style.setProperty("--member-player-height", "0px");
    };
  }, [currentTrack, mini, pathname]);

  // The /today page has its own full-featured in-card audio player for today's
  // daily practice. Showing the persistent bar there would create a duplicate UI.
  // Once the member navigates away, the bar reappears and playback continues.
  if (pathname === "/today") return null;

  if (!currentTrack) return null;

  const maxSeconds = duration || 100;

  // ── Mini pill ─────────────────────────────────────────────────────────────
  if (mini) {
    return (
      <div
        ref={playerRef}
        className="persistent-player"
        data-mobile-offset="true"
        data-mini="true"
      >
        <div className="mx-auto max-w-6xl px-4 py-2.5 md:px-6">
          <div className="flex items-center gap-3">
            {/* Progress line — subtle, full width, behind content */}
            <div
              className="absolute bottom-0 left-0 h-[2px] transition-all"
              style={{
                width: `${progress * 100}%`,
                background: "var(--color-player-bar)",
                opacity: 0.6,
              }}
              aria-hidden="true"
            />

            {/* Play/Pause */}
            <button
              type="button"
              onClick={togglePlayback}
              className="shrink-0 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white shadow-glow transition-transform hover:-translate-y-0.5"
              aria-label={isPlaying ? "Pause audio" : "Play audio"}
            >
              {isPlaying ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M5 3L19 12L5 21V3Z" />
                </svg>
              )}
            </button>

            {/* Title + subtitle */}
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-semibold text-white leading-tight">
                {currentTrack.title}
              </p>
              <p className="truncate text-[11px] text-white/40 mt-0.5 tabular-nums">
                {formatTime(currentTime)}
                {duration > 0 ? ` / ${formatTime(duration)}` : ""}
              </p>
            </div>

            {/* Speed */}
            <button
              type="button"
              onClick={cycleSpeed}
              className="shrink-0 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white/70 tabular-nums transition-colors hover:bg-white/10 hover:text-white"
              aria-label={`Playback speed: ${formatSpeed(playbackRate)}. Click to change.`}
              title="Change playback speed"
            >
              <span className="text-[11px] font-bold">{formatSpeed(playbackRate)}</span>
            </button>

            {/* Expand chevron */}
            <button
              type="button"
              onClick={toggleMini}
              className="shrink-0 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Expand player"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M18 15l-6-6-6 6" />
              </svg>
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={clearTrack}
              className="shrink-0 flex h-9 w-9 items-center justify-center rounded-full border border-white/8 text-white/35 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Close player"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Expanded bar ─────────────────────────────────────────────────────────
  return (
    <div ref={playerRef} className="persistent-player" data-mobile-offset="true">
      <div className="mx-auto max-w-6xl px-4 py-3 md:px-6 md:py-4">
        {/* Progress scrubber */}
        <div className="mb-3">
          <input
            type="range"
            min={0}
            max={maxSeconds}
            step={0.5}
            value={currentTime}
            onChange={(event) => seekTo(parseFloat(event.target.value))}
            aria-label="Seek audio"
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full accent-primary"
            style={{
              background: `linear-gradient(to right, var(--color-player-bar) ${progress * 100}%, var(--color-player-track) ${progress * 100}%)`,
            }}
          />
          <div className="mt-1 flex justify-between text-[11px] tabular-nums text-white/45">
            <span>{formatTime(currentTime)}</span>
            <span>{duration > 0 ? formatTime(duration) : currentTrack.durationLabel}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Track info */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-white/42">
              {currentTrack.subtitle ?? "Positives"}
            </p>
            <p className="mt-1 truncate text-sm font-semibold text-white md:text-base">
              {currentTrack.title}
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => seekBy(-15)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/8 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Rewind 15 seconds"
            >
              <span className="text-sm font-semibold">-15</span>
            </button>
            <button
              type="button"
              onClick={togglePlayback}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-glow transition-transform hover:-translate-y-0.5"
              aria-label={isPlaying ? "Pause audio" : "Play audio"}
            >
              {isPlaying ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M5 3L19 12L5 21V3Z" />
                </svg>
              )}
            </button>
            <button
              type="button"
              onClick={() => seekBy(15)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/8 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Skip forward 15 seconds"
            >
              <span className="text-sm font-semibold">+15</span>
            </button>

            {/* Speed */}
            <button
              type="button"
              onClick={cycleSpeed}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/8 tabular-nums text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              aria-label={`Playback speed: ${formatSpeed(playbackRate)}. Click to change.`}
              title="Change playback speed"
            >
              <span className="text-[12px] font-bold">{formatSpeed(playbackRate)}</span>
            </button>
          </div>

          {/* Minimise chevron */}
          <button
            type="button"
            onClick={toggleMini}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/8 text-white/45 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Minimize player"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>

          {/* Close */}
          <button
            type="button"
            onClick={clearTrack}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/8 text-white/45 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Close player"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
