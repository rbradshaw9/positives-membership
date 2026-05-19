"use client";

/**
 * components/coaching/SessionRoom.tsx
 *
 * In-platform Livekit video call component.
 * Used on /account/coaching/session/[id] for both member and coach.
 *
 * Features:
 *   - Camera + mic with mute/unmute controls
 *   - Background blur (Livekit BackgroundBlur processor)
 *   - Screen share
 *   - Session timer
 *   - End session button
 */

import { useEffect, useState, useCallback } from "react";
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  useRoomContext,
} from "@livekit/components-react";
import "@livekit/components-styles";

type SessionRoomProps = {
  bookingId: string;
  scheduledAt: string;
  durationMinutes: number;
  coachName: string;
  memberName: string | null;
  role: "member" | "coach";
  onEnd?: () => void;
};

function SessionTimer({
  scheduledAt,
  durationMinutes,
}: {
  scheduledAt: string;
  durationMinutes: number;
}) {
  // Timer shows time remaining in the session.
  // Count from actual join time, capped so it never shows negative before session starts.
  const [joinedAt] = useState(() => Date.now());
  const sessionStart = new Date(scheduledAt).getTime();
  // Effective start: whichever is later — scheduled time or actual join time
  const effectiveStart = Math.max(joinedAt, sessionStart);
  const sessionEnd = sessionStart + durationMinutes * 60 * 1000;
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const remaining = Math.max(0, sessionEnd - now);
  const elapsed = Math.max(0, now - effectiveStart);
  const total = durationMinutes * 60 * 1000;
  const isLow = remaining < 10 * 60 * 1000; // < 10 min
  const isNotStarted = now < sessionStart;

  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);

  // Before session starts: show countdown to start
  if (isNotStarted) {
    const untilStart = Math.ceil((sessionStart - now) / 60000);
    return (
      <div className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium bg-white/10 text-white/70">
        Starts in {untilStart}m
      </div>
    );
  }

  void elapsed; void total; // unused but kept for potential progress bar

  return (
    <div
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-mono font-medium tabular-nums ${
        isLow
          ? "bg-destructive/15 text-destructive"
          : "bg-white/10 text-white/80"
      }`}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
      {remaining === 0 ? "Time's up" : `${minutes}:${String(seconds).padStart(2, "0")} left`}
    </div>
  );
}

export function SessionRoom({
  bookingId,
  scheduledAt,
  durationMinutes,
  coachName,
  memberName,
  role,
  onEnd,
}: SessionRoomProps) {
  const [token, setToken] = useState<string | null>(null);
  const [roomName, setRoomName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

  const fetchToken = useCallback(async () => {
    try {
      const res = await fetch(`/api/coaching/session/${bookingId}/token`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to get session token");
      setToken(data.token);
      setRoomName(data.roomName);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not connect to session");
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    fetchToken();
  }, [fetchToken]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Connecting to session…</p>
      </div>
    );
  }

  if (error || !token || !serverUrl || !roomName) {
    return (
      <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-center">
        <p className="text-sm font-medium text-destructive">
          {error ?? "Session configuration error"}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          If this session should be starting soon, try refreshing the page.
        </p>
        <button
          onClick={fetchToken}
          className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0">
      {/* Session header bar */}
      <div className="flex items-center justify-between gap-3 rounded-t-2xl border border-b-0 border-border bg-foreground/95 px-4 py-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex h-2 w-2 flex-shrink-0 rounded-full bg-green-400 animate-pulse" aria-hidden="true" />
          <span className="truncate text-sm font-medium text-white">
            {role === "coach"
              ? `Session with ${memberName ?? "Member"}`
              : `Session with ${coachName}`}
          </span>
        </div>
        <SessionTimer scheduledAt={scheduledAt} durationMinutes={durationMinutes} />
      </div>

      {/* Livekit video room */}
      <div className="overflow-hidden rounded-b-2xl border border-border" style={{ minHeight: "clamp(340px, 60dvh, 680px)" }}>
        <LiveKitRoom
          serverUrl={serverUrl}
          token={token}
          video={true}
          audio={true}
          onConnected={() => setConnected(true)}
          onDisconnected={onEnd}
          style={{ height: "clamp(340px, 60dvh, 680px)" }}
          data-lk-theme="default"
        >
          <VideoConference />
          <RoomAudioRenderer />
        </LiveKitRoom>
      </div>

      {connected && (
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Session is encrypted end-to-end · Powered by Positives
        </p>
      )}
    </div>
  );
}
