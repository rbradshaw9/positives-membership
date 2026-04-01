"use client";

import { useMemberAudio } from "@/components/member/audio/MemberAudioProvider";

export function PersistentAudioPlayer() {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    progress,
    togglePlayback,
    seekBy,
    seekTo,
    clearTrack,
    formatTime,
  } = useMemberAudio();

  if (!currentTrack) return null;

  const maxSeconds = duration || 100;

  return (
    <div className="persistent-player" data-mobile-offset="true">
      <div className="mx-auto max-w-5xl px-4 py-3 md:px-6">
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
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{currentTrack.title}</p>
            <p className="truncate text-xs text-white/55">
              {currentTrack.subtitle ?? "Positives"}
            </p>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => seekBy(-15)}
              className="flex h-10 w-10 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
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
              className="flex h-10 w-10 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Skip forward 15 seconds"
            >
              <span className="text-sm font-semibold">+15</span>
            </button>
          </div>

          <button
            type="button"
            onClick={clearTrack}
            className="hidden h-10 w-10 items-center justify-center rounded-full text-white/45 transition-colors hover:bg-white/10 hover:text-white md:flex"
            aria-label="Close player"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
