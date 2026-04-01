"use client";

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

export type MemberAudioSnapshot = {
  hydrated: boolean;
  currentTrack: MemberAudioTrack | null;
  completedTrackId: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  progress: number;
  resumePositions: Record<string, number>;
};

const ACTIVE_TRACK_KEY = "positives.member-audio.active-track";
const RESUME_POSITIONS_KEY = "positives.member-audio.resume-positions";

const initialSnapshot: MemberAudioSnapshot = {
  hydrated: false,
  currentTrack: null,
  completedTrackId: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  progress: 0,
  resumePositions: {},
};

class MemberAudioStore {
  private listeners = new Set<() => void>();
  private snapshot = initialSnapshot;
  private hasHydrated = false;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = () => this.snapshot;

  hydrate() {
    if (this.hasHydrated || typeof window === "undefined") return;

    this.hasHydrated = true;

    let currentTrack: MemberAudioTrack | null = null;
    let resumePositions: Record<string, number> = {};

    try {
      const rawTrack = window.localStorage.getItem(ACTIVE_TRACK_KEY);
      if (rawTrack) {
        currentTrack = JSON.parse(rawTrack) as MemberAudioTrack;
      }
    } catch {
      currentTrack = null;
    }

    try {
      const rawPositions = window.localStorage.getItem(RESUME_POSITIONS_KEY);
      if (rawPositions) {
        resumePositions = JSON.parse(rawPositions) as Record<string, number>;
      }
    } catch {
      resumePositions = {};
    }

    const currentTime = currentTrack ? resumePositions[currentTrack.id] ?? 0 : 0;

    this.snapshot = {
      ...this.snapshot,
      hydrated: true,
      currentTrack,
      currentTime,
      duration: 0,
      progress: 0,
      resumePositions,
      isPlaying: false,
    };

    this.emit();
  }

  playTrack(track: MemberAudioTrack) {
    const resumeTime =
      this.snapshot.currentTrack?.id === track.id && this.snapshot.currentTrack.src === track.src
        ? this.snapshot.currentTime
        : this.snapshot.resumePositions[track.id] ?? 0;

    this.snapshot = {
      ...this.snapshot,
      currentTrack: track,
      completedTrackId:
        this.snapshot.completedTrackId === track.id ? null : this.snapshot.completedTrackId,
      isPlaying: true,
      currentTime: resumeTime,
      duration:
        this.snapshot.currentTrack?.id === track.id && this.snapshot.currentTrack.src === track.src
          ? this.snapshot.duration
          : 0,
      progress: 0,
    };

    this.persistActiveTrack();
    this.emit();
  }

  togglePlayback() {
    if (!this.snapshot.currentTrack) return;
    this.setPlaying(!this.snapshot.isPlaying);
  }

  pause() {
    this.setPlaying(false);
  }

  setPlaying(isPlaying: boolean) {
    if (!this.snapshot.currentTrack) return;
    this.snapshot = {
      ...this.snapshot,
      isPlaying,
    };
    this.emit();
  }

  clearTrack() {
    this.snapshot = {
      ...this.snapshot,
      currentTrack: null,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      progress: 0,
    };

    this.persistActiveTrack();
    this.emit();
  }

  setDuration(duration: number) {
    const safeDuration = Number.isFinite(duration) ? Math.max(0, duration) : 0;
    this.snapshot = {
      ...this.snapshot,
      duration: safeDuration,
      progress: safeDuration > 0 ? this.snapshot.currentTime / safeDuration : 0,
    };
    this.emit();
  }

  setCurrentTime(currentTime: number) {
    const safeCurrentTime = Number.isFinite(currentTime) ? Math.max(0, currentTime) : 0;
    this.snapshot = {
      ...this.snapshot,
      currentTime: safeCurrentTime,
      progress:
        this.snapshot.duration > 0 ? safeCurrentTime / this.snapshot.duration : 0,
    };
    this.emit();
  }

  setPlaybackState(currentTime: number, duration: number) {
    const safeDuration = Number.isFinite(duration) ? Math.max(0, duration) : 0;
    const safeCurrentTime = Number.isFinite(currentTime) ? Math.max(0, currentTime) : 0;

    this.snapshot = {
      ...this.snapshot,
      currentTime: safeCurrentTime,
      duration: safeDuration,
      progress: safeDuration > 0 ? safeCurrentTime / safeDuration : 0,
    };

    this.emit();
  }

  storeResumePosition(trackId: string, seconds: number) {
    const safeSeconds = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
    const nextResumePositions = {
      ...this.snapshot.resumePositions,
      [trackId]: safeSeconds,
    };

    this.snapshot = {
      ...this.snapshot,
      resumePositions: nextResumePositions,
    };

    this.persistResumePositions();
  }

  getResumePosition(trackId: string): number {
    return this.snapshot.resumePositions[trackId] ?? 0;
  }

  markCompleted(trackId: string) {
    const nextResumePositions = {
      ...this.snapshot.resumePositions,
      [trackId]: 0,
    };

    this.snapshot = {
      ...this.snapshot,
      completedTrackId: trackId,
      resumePositions: nextResumePositions,
    };

    if (this.snapshot.currentTrack?.id === trackId) {
      this.persistActiveTrack();
    }

    this.persistResumePositions();
    this.emit();
  }

  private persistActiveTrack() {
    if (typeof window === "undefined") return;

    try {
      if (this.snapshot.currentTrack) {
        window.localStorage.setItem(
          ACTIVE_TRACK_KEY,
          JSON.stringify(this.snapshot.currentTrack)
        );
      } else {
        window.localStorage.removeItem(ACTIVE_TRACK_KEY);
      }
    } catch {
      // Ignore storage errors in privacy-restricted contexts.
    }
  }

  private persistResumePositions() {
    if (typeof window === "undefined") return;

    try {
      window.localStorage.setItem(
        RESUME_POSITIONS_KEY,
        JSON.stringify(this.snapshot.resumePositions)
      );
    } catch {
      // Ignore storage errors in privacy-restricted contexts.
    }
  }

  private emit() {
    this.listeners.forEach((listener) => listener());
  }
}

export const memberAudioStore = new MemberAudioStore();
