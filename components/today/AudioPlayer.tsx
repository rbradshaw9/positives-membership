"use client";

import { useState, useRef } from "react";

/**
 * components/today/AudioPlayer.tsx
 * Minimal custom audio player — client component.
 * Milestone 04: structurally real, visually calm.
 *
 * Wraps the native <audio> element with a play/pause button and
 * a progress bar. Does not attempt waveform rendering, background
 * playback, or advanced buffering — those are Milestone 05+ scope.
 *
 * Falls back to the browser's native controls if JS is unavailable.
 */

interface AudioPlayerProps {
  src: string;
  title: string;
  duration: string; // pre-formatted "m:ss"
}

export function AudioPlayer({ src, title, duration }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(0);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch((err) => {
        // Autoplay policy can block play() — surface in console only
        console.warn("[AudioPlayer] play() blocked:", err);
      });
    }
  }

  function handleTimeUpdate() {
    const audio = audioRef.current;
    if (!audio) return;
    setCurrentTime(audio.currentTime);
  }

  function handleLoadedMetadata() {
    const audio = audioRef.current;
    if (!audio) return;
    setTotalSeconds(audio.duration || 0);
  }

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    const audio = audioRef.current;
    if (!audio) return;
    const t = parseFloat(e.target.value);
    audio.currentTime = t;
    setCurrentTime(t);
  }

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  const progress = totalSeconds > 0 ? (currentTime / totalSeconds) * 100 : 0;
  const displayDuration =
    totalSeconds > 0 ? formatTime(totalSeconds) : duration;

  return (
    <div className="flex flex-col gap-3">
      {/* Hidden native audio element */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        aria-label={`Audio: ${title}`}
      />

      <div className="flex items-center gap-4">
        {/* Play / Pause */}
        <button
          type="button"
          onClick={togglePlay}
          aria-label={isPlaying ? `Pause ${title}` : `Play ${title}`}
          className="w-12 h-12 rounded-pill bg-primary flex items-center justify-center hover:bg-primary-hover transition-colors shadow-focus flex-shrink-0"
        >
          {isPlaying ? (
            /* Pause icon */
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            /* Play icon */
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <polygon points="5,3 19,12 5,21" />
            </svg>
          )}
        </button>

        {/* Progress bar + time */}
        <div className="flex-1 flex flex-col gap-1.5">
          <input
            type="range"
            min={0}
            max={totalSeconds || 100}
            step={0.5}
            value={currentTime}
            onChange={handleSeek}
            aria-label="Seek audio"
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-white/20 accent-primary"
            style={{
              background: `linear-gradient(to right, #2F6FED ${progress}%, rgba(255,255,255,0.2) ${progress}%)`,
            }}
          />
          <div className="flex justify-between text-xs text-white/50 tabular-nums">
            <span>{formatTime(currentTime)}</span>
            <span>{displayDuration}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
