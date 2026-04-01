"use client";

import { useEffect, useRef } from "react";
import { useMemberAudio } from "@/components/member/audio/MemberAudioProvider";

/**
 * Shared member audio trigger/control. Playback itself is owned by the
 * member-shell provider so audio survives route navigation.
 */

interface AudioPlayerProps {
  trackId: string;
  src: string;
  title: string;
  subtitle?: string;
  duration: string;
  tone?: "dark" | "light";
  onCompleteContentId?: string;
  onMarkedComplete?: () => void;
}

export function AudioPlayer({
  trackId,
  src,
  title,
  subtitle,
  duration,
  tone = "dark",
  onCompleteContentId,
  onMarkedComplete,
}: AudioPlayerProps) {
  const {
    currentTrack,
    completedTrackId,
    currentTime,
    duration: totalSeconds,
    progress,
    isPlaying,
    playTrack,
    togglePlayback,
    seekTo,
    isCurrentTrack,
    formatTime,
  } = useMemberAudio();
  const completionCallbackFired = useRef(false);

  const isCurrent = isCurrentTrack(trackId);
  const displayedTime = isCurrent ? currentTime : 0;
  const displayedDuration = isCurrent && totalSeconds > 0 ? formatTime(totalSeconds) : duration;
  const displayedProgress = isCurrent ? progress * 100 : 0;

  useEffect(() => {
    if (completedTrackId !== trackId || !onMarkedComplete || completionCallbackFired.current) {
      return;
    }

    completionCallbackFired.current = true;
    onMarkedComplete();
  }, [completedTrackId, onMarkedComplete, trackId]);

  function handlePlayToggle() {
    if (isCurrent) {
      togglePlayback();
    } else {
      playTrack({
        id: trackId,
        src,
        title,
        subtitle,
        durationLabel: duration,
        onCompleteAction: onCompleteContentId
          ? {
              kind: "daily_listened",
              contentId: onCompleteContentId,
            }
          : undefined,
      });
    }
  }

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    if (!isCurrent) return;
    seekTo(parseFloat(e.target.value));
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handlePlayToggle}
          aria-label={isPlaying ? `Pause ${title}` : `Play ${title}`}
          className={[
            "flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full transition-colors",
            tone === "dark"
              ? "bg-primary text-white shadow-glow hover:bg-primary-hover"
              : "bg-primary text-white shadow-soft hover:bg-primary-hover",
          ].join(" ")}
        >
          {isCurrent && isPlaying ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <polygon points="5,3 19,12 5,21" />
            </svg>
          )}
        </button>

        <div className="flex-1 flex flex-col gap-1.5">
          <input
            type="range"
            min={0}
            max={isCurrent && totalSeconds > 0 ? totalSeconds : 100}
            step={0.5}
            value={displayedTime}
            onChange={handleSeek}
            aria-label="Seek audio"
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-primary"
            style={{
              background:
                tone === "dark"
                  ? `linear-gradient(to right, var(--color-player-bar) ${displayedProgress}%, rgba(255,255,255,0.2) ${displayedProgress}%)`
                  : `linear-gradient(to right, var(--color-primary) ${displayedProgress}%, color-mix(in srgb, var(--color-muted) 92%, white) ${displayedProgress}%)`,
            }}
          />
          <div
            className={[
              "flex justify-between text-xs tabular-nums",
              tone === "dark" ? "text-white/50" : "text-muted-foreground",
            ].join(" ")}
          >
            <span>{formatTime(displayedTime)}</span>
            <span>{displayedDuration}</span>
          </div>
          {currentTrack?.id === trackId && subtitle && (
            <p className={tone === "dark" ? "text-xs text-white/35" : "text-xs text-muted-foreground/80"}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
