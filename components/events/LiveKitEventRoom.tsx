"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ControlBar,
  GridLayout,
  LayoutContextProvider,
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  useCreateLayoutContext,
  useTracks,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Track } from "livekit-client";

type LiveKitEventRoomProps = {
  eventId: string;
  title: string;
  role: "audience" | "host";
  startsAt: string;
  endsAt: string;
  initialTokenResponse?: TokenResponse | null;
  authToken?: string | null;
};

type TokenResponse = {
  token: string;
  serverUrl: string;
  roomName: string;
};

function eventState(startsAt: string, endsAt: string) {
  const now = Date.now();
  const starts = new Date(startsAt).getTime();
  const ends = new Date(endsAt).getTime();
  if (now < starts) return "starts soon";
  if (now > ends) return "ended";
  return "live";
}

function WebinarStage({ role }: { role: "audience" | "host" }) {
  const layoutContext = useCreateLayoutContext();
  const tracks = useTracks(
    [
      { source: Track.Source.ScreenShare, withPlaceholder: false },
      { source: Track.Source.Camera, withPlaceholder: true },
    ],
    { onlySubscribed: false }
  );

  return (
    <LayoutContextProvider value={layoutContext}>
      <div className="flex h-full min-h-[360px] flex-col bg-[#10131b]">
        <div className="min-h-0 flex-1 p-3 md:p-4">
          {tracks.length > 0 ? (
            <GridLayout tracks={tracks} className="h-full">
              <ParticipantTile />
            </GridLayout>
          ) : (
            <div className="flex h-full min-h-[360px] items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] px-6 text-center">
              <div>
                <p className="font-heading text-2xl font-semibold text-white">
                  {role === "host" ? "Your studio is ready." : "Waiting for the host."}
                </p>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-white/65">
                  {role === "host"
                    ? "Turn on your camera or share your screen when you are ready to begin."
                    : "The event will appear here as soon as the host starts video or screen share."}
                </p>
              </div>
            </div>
          )}
        </div>
        {role === "host" ? (
          <div className="border-t border-white/10 bg-black/25 px-3 py-3">
            <ControlBar controls={{ chat: false, settings: true }} />
          </div>
        ) : null}
        <RoomAudioRenderer />
      </div>
    </LayoutContextProvider>
  );
}

export function LiveKitEventRoom({
  eventId,
  title,
  role,
  startsAt,
  endsAt,
  initialTokenResponse = null,
  authToken = null,
}: LiveKitEventRoomProps) {
  const [tokenResponse, setTokenResponse] = useState<TokenResponse | null>(initialTokenResponse);
  const [loading, setLoading] = useState(!initialTokenResponse);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const state = eventState(startsAt, endsAt);

  const fetchToken = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const endpoint =
        role === "host"
          ? `/api/admin/events/${eventId}/livekit-token`
          : `/api/events/${eventId}/livekit-token`;
      const response = await fetch(endpoint, {
        headers:
          role === "host" && authToken
            ? { "x-livekit-studio-token": authToken }
            : undefined,
      });
      const data = (await response.json().catch(() => ({}))) as Partial<TokenResponse> & {
        error?: string;
      };
      if (!response.ok || !data.token || !data.serverUrl || !data.roomName) {
        throw new Error(data.error ?? "Could not prepare the live room.");
      }
      setTokenResponse({
        token: data.token,
        serverUrl: data.serverUrl,
        roomName: data.roomName,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not prepare the live room.");
    } finally {
      setLoading(false);
    }
  }, [authToken, eventId, role]);

  useEffect(() => {
    if (!tokenResponse) fetchToken();
  }, [fetchToken, tokenResponse]);

  if (loading) {
    return (
      <div className="flex min-h-[360px] flex-col items-center justify-center gap-4 rounded-lg border border-border bg-card">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Opening live room...</p>
      </div>
    );
  }

  if (error || !tokenResponse) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center text-amber-900">
        <p className="font-heading text-xl font-semibold">Live room is not ready.</p>
        <p className="mt-2 text-sm leading-relaxed">{error ?? "Try again in a moment."}</p>
        <button
          type="button"
          onClick={fetchToken}
          className="mt-4 inline-flex h-10 items-center justify-center rounded-lg border border-amber-300 bg-white px-4 text-sm font-semibold text-amber-950 shadow-sm transition hover:bg-amber-100"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-[#10131b] shadow-sm">
      <div className="flex flex-col gap-2 border-b border-white/10 bg-black/30 px-4 py-3 text-white md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-normal text-primary">
            {role === "host" ? "Host Studio" : "Live Event"} - {state}
          </p>
          <h1 className="truncate font-heading text-xl font-semibold tracking-normal">{title}</h1>
        </div>
        <span className="rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-white/75">
          {connected ? "Connected" : "Connecting"}
        </span>
      </div>
      <LiveKitRoom
        serverUrl={tokenResponse.serverUrl}
        token={tokenResponse.token}
        video={role === "host"}
        audio={role === "host"}
        onConnected={() => setConnected(true)}
        onDisconnected={() => setConnected(false)}
        style={{ minHeight: "clamp(360px, 62dvh, 760px)" }}
        data-lk-theme="default"
      >
        <WebinarStage role={role} />
      </LiveKitRoom>
    </div>
  );
}
