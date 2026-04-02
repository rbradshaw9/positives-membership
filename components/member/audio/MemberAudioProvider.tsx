"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  markListened,
  markTrackCompleted,
  syncListeningProgress,
} from "@/app/(member)/today/actions";
import {
  MemberAudioTrack,
  memberAudioStore,
} from "@/lib/audio/member-audio-store";

type MemberAudioContextValue = {
  currentTrack: MemberAudioTrack | null;
  completedTrackId: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  progress: number;
  /** Current playback speed (e.g. 1, 1.25, 1.5). Default 1. */
  playbackRate: number;
  /** Cycle or set a specific playback speed. Persisted across sessions. */
  setPlaybackRate: (rate: number) => void;
  playTrack: (track: MemberAudioTrack) => void;
  togglePlayback: () => void;
  pause: () => void;
  clearTrack: () => void;
  seekTo: (seconds: number) => void;
  seekBy: (delta: number) => void;
  isCurrentTrack: (trackId: string) => boolean;
  formatTime: (seconds: number) => string;
  /** Register a function that pauses an external video player. Call with a stable id. */
  registerVideoPauser: (id: string, fn: () => void) => void;
  /** Unregister the video pauser for the given id (call in cleanup). */
  unregisterVideoPauser: (id: string) => void;
  /** Pause all registered video players, optionally skipping one by id. */
  pauseAllVideos: (exceptId?: string) => void;
};

const MemberAudioContext = createContext<MemberAudioContextValue | null>(null);

export function MemberAudioProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const snapshot = useSyncExternalStore(
    memberAudioStore.subscribe,
    memberAudioStore.getSnapshot,
    memberAudioStore.getSnapshot
  );

  const audioRef = useRef<HTMLAudioElement>(null);
  const pendingResumeTimeRef = useRef(0);
  const completionTrackRef = useRef<string | null>(null);
  // Registry of video pauser functions keyed by a stable id.
  // Supports multiple VideoEmbeds on the same page.
  const videoPausersRef = useRef<Map<string, () => void>>(new Map());
  const lastPersistedResumeRef = useRef<{ trackId: string | null; seconds: number }>({
    trackId: null,
    seconds: 0,
  });
  const lastProgressSyncRef = useRef<{ trackId: string | null; at: number }>({
    trackId: null,
    at: 0,
  });

  // ── Playback speed ────────────────────────────────────────────────────────
  const SPEED_KEY = "positives:player:speed";
  const [playbackRate, setPlaybackRateState] = useState<number>(1);

  // Load persisted speed on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SPEED_KEY);
      if (saved) {
        const rate = parseFloat(saved);
        if (Number.isFinite(rate) && rate > 0 && rate <= 3) {
          setPlaybackRateState(rate);
        }
      }
    } catch { /* ignore storage errors */ }
  }, []);

  // Apply rate to the <audio> element whenever it changes or a new track loads
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = playbackRate;
  }, [playbackRate, snapshot.currentTrack]);

  function setPlaybackRate(rate: number) {
    setPlaybackRateState(rate);
    // Apply immediately (the useEffect above may lag one render)
    if (audioRef.current) audioRef.current.playbackRate = rate;
    try {
      localStorage.setItem(SPEED_KEY, String(rate));
    } catch { /* ignore */ }
  }

  useEffect(() => {
    memberAudioStore.hydrate();
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!snapshot.currentTrack) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      completionTrackRef.current = null;
      pendingResumeTimeRef.current = 0;
      return;
    }

    if (
      audio.dataset.trackId !== snapshot.currentTrack.id ||
      audio.dataset.trackSrc !== snapshot.currentTrack.src
    ) {
      audio.dataset.trackId = snapshot.currentTrack.id;
      audio.dataset.trackSrc = snapshot.currentTrack.src;
      audio.src = snapshot.currentTrack.src;
      pendingResumeTimeRef.current =
        memberAudioStore.getResumePosition(snapshot.currentTrack.id) ?? 0;
      lastPersistedResumeRef.current = {
        trackId: snapshot.currentTrack.id,
        seconds: pendingResumeTimeRef.current,
      };
      completionTrackRef.current = null;
      audio.load();
    }
  }, [snapshot.currentTrack]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !snapshot.currentTrack) return;

    if (snapshot.isPlaying) {
      // Pause all registered video players before starting audio — "latest wins".
      videoPausersRef.current.forEach((fn) => fn());
      audio.play().catch((err) => {
        console.warn("[MemberAudioProvider] play() blocked:", err);
        memberAudioStore.pause();
      });
      return;
    }

    audio.pause();
  }, [snapshot.currentTrack, snapshot.isPlaying]);

  useEffect(() => {
    function handleBeforeUnload() {
      if (!snapshot.currentTrack) return;
      memberAudioStore.storeResumePosition(snapshot.currentTrack.id, snapshot.currentTime);
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [snapshot.currentTime, snapshot.currentTrack]);

  function formatTime(seconds: number): string {
    const safeSeconds = Number.isFinite(seconds) ? seconds : 0;
    const minutes = Math.floor(safeSeconds / 60);
    const remaining = Math.floor(safeSeconds % 60);
    return `${minutes}:${String(remaining).padStart(2, "0")}`;
  }

  function playTrack(track: MemberAudioTrack) {
    memberAudioStore.playTrack(track);
  }

  function togglePlayback() {
    memberAudioStore.togglePlayback();
  }

  function pause() {
    memberAudioStore.pause();
  }

  function registerVideoPauser(id: string, fn: () => void) {
    videoPausersRef.current.set(id, fn);
  }

  function unregisterVideoPauser(id: string) {
    videoPausersRef.current.delete(id);
  }

  function pauseAllVideos(exceptId?: string) {
    videoPausersRef.current.forEach((fn, id) => {
      if (id !== exceptId) fn();
    });
  }

  function clearTrack() {
    memberAudioStore.clearTrack();
  }

  function seekTo(seconds: number) {
    const audio = audioRef.current;
    if (!audio || !snapshot.currentTrack) return;

    const boundedSeconds = Math.max(0, Math.min(seconds, audio.duration || seconds));
    audio.currentTime = boundedSeconds;
    memberAudioStore.setCurrentTime(boundedSeconds);
    memberAudioStore.storeResumePosition(snapshot.currentTrack.id, boundedSeconds);
    lastPersistedResumeRef.current = {
      trackId: snapshot.currentTrack.id,
      seconds: boundedSeconds,
    };
  }

  function seekBy(delta: number) {
    const audio = audioRef.current;
    if (!audio) return;
    seekTo(audio.currentTime + delta);
  }

  function maybePersistResume(trackId: string, seconds: number, force = false) {
    const last = lastPersistedResumeRef.current;
    if (
      !force &&
      last.trackId === trackId &&
      Math.abs(seconds - last.seconds) < 5
    ) {
      return;
    }

    memberAudioStore.storeResumePosition(trackId, seconds);
    lastPersistedResumeRef.current = {
      trackId,
      seconds,
    };
  }

  function maybeSyncIncompleteProgress(trackId: string, currentTime: number, force = false) {
    if (currentTime < 5) return;

    const now = Date.now();
    const lastSync = lastProgressSyncRef.current;
    if (!force && lastSync.trackId === trackId && now - lastSync.at < 30_000) {
      return;
    }

    lastProgressSyncRef.current = {
      trackId,
      at: now,
    };

    void syncListeningProgress(trackId);
  }

  function maybeCompleteTrack(track: MemberAudioTrack, currentTime: number, duration: number) {
    if (
      duration <= 0 ||
      currentTime / duration < 0.8 ||
      completionTrackRef.current === track.id
    ) {
      return;
    }

    completionTrackRef.current = track.id;
    memberAudioStore.markCompleted(track.id);

    if (track.onCompleteAction?.kind === "daily_listened") {
      void markListened(track.onCompleteAction.contentId);
      return;
    }

    void markTrackCompleted(track.id);
  }

  useEffect(() => {
    if (!snapshot.currentTrack || !("mediaSession" in navigator)) return;

    const currentTrack = snapshot.currentTrack;

    const mediaSeek = (delta: number) => {
      const audio = audioRef.current;
      if (!audio) return;

      const nextSeconds = Math.max(
        0,
        Math.min(audio.currentTime + delta, audio.duration || audio.currentTime + delta)
      );
      audio.currentTime = nextSeconds;
      memberAudioStore.setCurrentTime(nextSeconds);
      memberAudioStore.storeResumePosition(currentTrack.id, nextSeconds);
      lastPersistedResumeRef.current = {
        trackId: currentTrack.id,
        seconds: nextSeconds,
      };
    };

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.title,
      artist: "Positives",
      album: currentTrack.subtitle ?? "Daily Practice",
    });
    navigator.mediaSession.playbackState = snapshot.isPlaying ? "playing" : "paused";
    navigator.mediaSession.setActionHandler("play", () => {
      memberAudioStore.playTrack(currentTrack);
    });
    navigator.mediaSession.setActionHandler("pause", () => {
      memberAudioStore.pause();
    });
    navigator.mediaSession.setActionHandler("seekbackward", () => {
      mediaSeek(-15);
    });
    navigator.mediaSession.setActionHandler("seekforward", () => {
      mediaSeek(15);
    });
  }, [snapshot.currentTrack, snapshot.isPlaying]);

  const value: MemberAudioContextValue = {
    currentTrack: snapshot.currentTrack,
    completedTrackId: snapshot.completedTrackId,
    isPlaying: snapshot.isPlaying,
    currentTime: snapshot.currentTime,
    duration: snapshot.duration,
    progress: snapshot.progress,
    playbackRate,
    setPlaybackRate,
    playTrack,
    togglePlayback,
    pause,
    clearTrack,
    seekTo,
    seekBy,
    isCurrentTrack: (trackId: string) => snapshot.currentTrack?.id === trackId,
    formatTime,
    registerVideoPauser,
    unregisterVideoPauser,
    pauseAllVideos,
  };

  return (
    <MemberAudioContext.Provider value={value}>
      {children}
      <audio
        ref={audioRef}
        preload="metadata"
        onPlay={() => memberAudioStore.setPlaying(true)}
        onPause={() => {
          memberAudioStore.setPlaying(false);
          if (snapshot.currentTrack) {
            maybePersistResume(snapshot.currentTrack.id, audioRef.current?.currentTime ?? 0, true);
            maybeSyncIncompleteProgress(
              snapshot.currentTrack.id,
              audioRef.current?.currentTime ?? 0,
              true
            );
          }
        }}
        onEnded={() => {
          memberAudioStore.setPlaying(false);
          if (!snapshot.currentTrack) return;

          const endedTime = audioRef.current?.duration ?? snapshot.duration;
          memberAudioStore.setPlaybackState(endedTime, snapshot.duration || endedTime);
          maybePersistResume(snapshot.currentTrack.id, 0, true);
          maybeCompleteTrack(
            snapshot.currentTrack,
            endedTime,
            snapshot.duration || endedTime
          );
        }}
        onLoadedMetadata={() => {
          const audio = audioRef.current;
          if (!audio || !snapshot.currentTrack) return;

          // Re-apply speed — audio.load() can reset playbackRate to 1
          audio.playbackRate = playbackRate;

          const resumeTime =
            pendingResumeTimeRef.current || memberAudioStore.getResumePosition(snapshot.currentTrack.id);
          if (resumeTime > 0) {
            audio.currentTime = Math.min(resumeTime, audio.duration || resumeTime);
            pendingResumeTimeRef.current = 0;
          }

          memberAudioStore.setPlaybackState(audio.currentTime, audio.duration || 0);
        }}
        onTimeUpdate={() => {
          const audio = audioRef.current;
          if (!audio || !snapshot.currentTrack) return;

          const nextTime = audio.currentTime;
          const nextDuration = audio.duration || snapshot.duration;
          memberAudioStore.setPlaybackState(nextTime, nextDuration);
          maybePersistResume(snapshot.currentTrack.id, nextTime);
          maybeSyncIncompleteProgress(snapshot.currentTrack.id, nextTime);
          maybeCompleteTrack(snapshot.currentTrack, nextTime, nextDuration);
        }}
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
