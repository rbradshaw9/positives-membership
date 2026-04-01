"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { markListened } from "@/app/(member)/today/actions";

export type MemberAudioTrack = {
  id: string;
  title: string;
  subtitle?: string;
  src: string;
  durationLabel: string;
  onCompleteAction?: {
    kind: "daily_listened";
    contentId: string;
  };
};

type MemberAudioContextValue = {
  currentTrack: MemberAudioTrack | null;
  completedTrackId: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  progress: number;
  playTrack: (track: MemberAudioTrack) => void;
  togglePlayback: () => void;
  pause: () => void;
  clearTrack: () => void;
  seekTo: (seconds: number) => void;
  seekBy: (delta: number) => void;
  isCurrentTrack: (trackId: string) => boolean;
  formatTime: (seconds: number) => string;
};

const MemberAudioContext = createContext<MemberAudioContextValue | null>(null);

export function MemberAudioProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const shouldAutoplayRef = useRef(false);
  const completedTrackRef = useRef<string | null>(null);

  const [currentTrack, setCurrentTrack] = useState<MemberAudioTrack | null>(null);
  const [completedTrackId, setCompletedTrackId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  function formatTime(seconds: number): string {
    const safeSeconds = Number.isFinite(seconds) ? seconds : 0;
    const minutes = Math.floor(safeSeconds / 60);
    const remaining = Math.floor(safeSeconds % 60);
    return `${minutes}:${String(remaining).padStart(2, "0")}`;
  }

  function playTrack(track: MemberAudioTrack) {
    if (currentTrack?.id === track.id && currentTrack.src === track.src) {
      if (!isPlaying) {
        audioRef.current?.play().catch((err) => {
          console.warn("[MemberAudioProvider] play() blocked:", err);
        });
      }
      return;
    }

    shouldAutoplayRef.current = true;
    completedTrackRef.current = null;
    setCurrentTime(0);
    setDuration(0);
    setCurrentTrack(track);
  }

  function togglePlayback() {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch((err) => {
        console.warn("[MemberAudioProvider] play() blocked:", err);
      });
    }
  }

  function pause() {
    audioRef.current?.pause();
  }

  function clearTrack() {
    audioRef.current?.pause();
    shouldAutoplayRef.current = false;
    completedTrackRef.current = null;
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setCurrentTrack(null);
  }

  function seekTo(seconds: number) {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(seconds, audio.duration || seconds));
    setCurrentTime(audio.currentTime);
  }

  function seekBy(delta: number) {
    const audio = audioRef.current;
    if (!audio) return;
    seekTo(audio.currentTime + delta);
  }

  function handleLoadedMetadata() {
    if (!audioRef.current) return;
    setDuration(audioRef.current.duration || 0);
  }

  function handleTimeUpdate() {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;
    const nextTime = audio.currentTime;
    const nextDuration = audio.duration || duration;
    setCurrentTime(nextTime);
    if (nextDuration && nextDuration !== duration) {
      setDuration(nextDuration);
    }

    if (
      currentTrack.onCompleteAction?.kind === "daily_listened" &&
      nextDuration > 0 &&
      nextTime / nextDuration >= 0.8 &&
      completedTrackRef.current !== currentTrack.id
    ) {
      completedTrackRef.current = currentTrack.id;
      setCompletedTrackId(currentTrack.id);
      void markListened(currentTrack.onCompleteAction.contentId);
    }
  }

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    if (!shouldAutoplayRef.current) return;
    shouldAutoplayRef.current = false;

    audio.play().catch((err) => {
      console.warn("[MemberAudioProvider] autoplay blocked:", err);
    });
  }, [currentTrack]);

  useEffect(() => {
    if (!currentTrack || !("mediaSession" in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.title,
      artist: "Positives",
      album: currentTrack.subtitle ?? "Daily Practice",
    });
    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
    navigator.mediaSession.setActionHandler("play", () => {
      audioRef.current?.play().catch(() => undefined);
    });
    navigator.mediaSession.setActionHandler("pause", () => {
      audioRef.current?.pause();
    });
    navigator.mediaSession.setActionHandler("seekbackward", () => seekBy(-15));
    navigator.mediaSession.setActionHandler("seekforward", () => seekBy(15));
  }, [currentTrack, isPlaying]);

  const value = useMemo<MemberAudioContextValue>(
    () => ({
      currentTrack,
      completedTrackId,
      isPlaying,
      currentTime,
      duration,
      progress: duration > 0 ? currentTime / duration : 0,
      playTrack,
      togglePlayback,
      pause,
      clearTrack,
      seekTo,
      seekBy,
      isCurrentTrack: (trackId: string) => currentTrack?.id === trackId,
      formatTime,
    }),
    [currentTrack, completedTrackId, isPlaying, currentTime, duration]
  );

  return (
    <MemberAudioContext.Provider value={value}>
      {children}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio
        ref={audioRef}
        src={currentTrack?.src}
        preload="metadata"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        aria-hidden="true"
      />
    </MemberAudioContext.Provider>
  );
}

export function useMemberAudio() {
  const context = useContext(MemberAudioContext);

  if (!context) {
    throw new Error("useMemberAudio must be used inside MemberAudioProvider");
  }

  return context;
}
