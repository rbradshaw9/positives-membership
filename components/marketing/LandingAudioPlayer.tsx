"use client";

import { useEffect, useRef, useState } from "react";

const SAMPLE_AUDIO_URL =
  "https://media.blubrry.com/liveonpurpose/traffic.libsyn.com/liveonpurpose/692_mixdown.mp3";

export function LandingAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(false);

  function formatTime(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    const remainder = Math.floor(seconds % 60);
    return `${minutes}:${remainder.toString().padStart(2, "0")}`;
  }

  function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) return;

    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }

    setLoading(true);
    audio
      .play()
      .then(() => {
        setPlaying(true);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    function handleTimeUpdate() {
      const currentAudio = audioRef.current;
      if (!currentAudio) return;

      setCurrentTime(currentAudio.currentTime);
      setProgress(
        currentAudio.duration
          ? (currentAudio.currentTime / currentAudio.duration) * 100
          : 0
      );
    }

    function handleLoadedMetadata() {
      const currentAudio = audioRef.current;
      if (!currentAudio) return;

      setDuration(currentAudio.duration);
    }

    function handleEnded() {
      setPlaying(false);
      setProgress(0);
      setCurrentTime(0);
    }

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);

  function seek(event: React.MouseEvent<HTMLDivElement>) {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const progressRatio = (event.clientX - rect.left) / rect.width;
    audio.currentTime = progressRatio * audio.duration;
  }

  const bars = [2, 3, 5, 7, 9, 11, 14, 12, 10, 13, 15, 11, 9, 12, 14, 11, 8, 10, 12, 9, 7, 10, 13, 10, 8, 6, 9, 11, 8, 6, 4, 3, 5, 7, 9, 6, 4, 3];
  const playedBars = Math.round((progress / 100) * bars.length);

  return (
    <div
      className="mx-auto w-full max-w-lg rounded-3xl"
      style={{
        background: "#FFFFFF",
        border: "1px solid #DDD7CF",
        boxShadow: "0 20px 60px rgba(18,20,23,0.08), 0 4px 16px rgba(18,20,23,0.04)",
        overflow: "hidden",
      }}
    >
      <audio ref={audioRef} src={SAMPLE_AUDIO_URL} preload="none" />

      <div className="px-8 pt-8 pb-6" style={{ borderBottom: "1px solid #F1EEE8" }}>
        <p className="mb-2 text-xs font-semibold uppercase" style={{ color: "#4E8C78", letterSpacing: "0.12em" }}>
          Sample · Dr. Paul Jenkins
        </p>
        <p
          className="font-heading font-bold"
          style={{ fontSize: "1.15rem", color: "#121417", letterSpacing: "-0.03em", lineHeight: "1.3" }}
        >
          Responding vs. Reacting
        </p>
        <p className="mt-1 text-sm" style={{ color: "#9AA0A8" }}>
          Live On Purpose · Podcast Episode
        </p>
      </div>

      <div className="px-8 py-7">
        <div className="mb-4 flex h-10 items-center gap-0.5" aria-hidden="true">
          {bars.map((height, index) => (
            <div
              key={index}
              className="flex-1 rounded-full transition-colors duration-100"
              style={{
                height: `${height * 2.4}px`,
                background: index < playedBars ? "rgba(47,111,237,0.85)" : "rgba(18,20,23,0.09)",
              }}
            />
          ))}
        </div>

        <div
          className="mb-4 w-full cursor-pointer overflow-hidden rounded-full"
          style={{ height: "4px", background: "rgba(18,20,23,0.07)" }}
          onClick={seek}
        >
          <div
            className="h-full rounded-full"
            style={{ width: `${progress}%`, background: "#2F6FED", transition: "width 0.1s linear" }}
          />
        </div>

        <div className="mb-6 flex items-center justify-between">
          <span className="text-xs font-medium tabular-nums" style={{ color: "#2F6FED" }}>
            {formatTime(currentTime)}
          </span>
          <span className="text-xs tabular-nums" style={{ color: "#9AA0A8" }}>
            {duration > 0 ? formatTime(duration) : "--:--"}
          </span>
        </div>

        <div className="flex justify-center">
          <button
            type="button"
            onClick={togglePlayback}
            aria-label={playing ? "Pause" : "Play sample"}
            className="flex h-14 w-14 items-center justify-center rounded-full transition-transform hover:scale-105 active:scale-95"
            style={{
              background: "linear-gradient(135deg, #2F6FED 0%, #245DD0 100%)",
              boxShadow: "0 8px 24px rgba(47,111,237,0.35)",
            }}
          >
            {loading ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth="2.5" strokeLinecap="round" className="animate-spin">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            ) : playing ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#FFFFFF" aria-hidden="true">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#FFFFFF" aria-hidden="true">
                <path d="M5 3l14 9-14 9V3z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
