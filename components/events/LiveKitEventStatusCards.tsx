"use client";

import { useEffect, useMemo, useState } from "react";

type LiveKitEventStatus = {
  roomName: string;
  roomStatus: string | null;
  recordingPolicy: string | null;
  egressId: string | null;
  egressStatus: string | null;
  replayAttached: boolean;
  replayAssetId: string | null;
  lastError: string | null;
  roomStartedAt: string | null;
  roomFinishedAt: string | null;
  egressStartedAt: string | null;
  egressEndedAt: string | null;
};

type Props = {
  eventId: string;
  initialStatus: LiveKitEventStatus;
  authToken: string;
};

function statusText(status?: string | null) {
  if (!status) return "Pending";
  if (status === "complete") return "Replay ready";
  if (status === "failed") return "Recording failed";
  if (status === "active" || status === "starting") return "Recording";
  return status;
}

function formatUpdatedAt(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

export function LiveKitEventStatusCards({ eventId, initialStatus, authToken }: Props) {
  const [status, setStatus] = useState(initialStatus);
  const [pollError, setPollError] = useState<string | null>(null);
  const latestActivity = useMemo(
    () =>
      status.egressEndedAt ??
      status.egressStartedAt ??
      status.roomFinishedAt ??
      status.roomStartedAt ??
      null,
    [status.egressEndedAt, status.egressStartedAt, status.roomFinishedAt, status.roomStartedAt]
  );

  useEffect(() => {
    let ignore = false;

    async function refreshStatus() {
      try {
        const response = await fetch(`/api/admin/events/${eventId}/livekit-status`, {
          cache: "no-store",
          headers: { "x-livekit-studio-token": authToken },
        });
        const data = (await response.json().catch(() => ({}))) as Partial<LiveKitEventStatus> & {
          error?: string;
        };
        if (!response.ok) throw new Error(data.error ?? "Could not refresh LiveKit status.");
        if (!ignore) {
          setStatus({
            roomName: data.roomName ?? initialStatus.roomName,
            roomStatus: data.roomStatus ?? null,
            recordingPolicy: data.recordingPolicy ?? null,
            egressId: data.egressId ?? null,
            egressStatus: data.egressStatus ?? null,
            replayAttached: Boolean(data.replayAttached),
            replayAssetId: data.replayAssetId ?? null,
            lastError: data.lastError ?? null,
            roomStartedAt: data.roomStartedAt ?? null,
            roomFinishedAt: data.roomFinishedAt ?? null,
            egressStartedAt: data.egressStartedAt ?? null,
            egressEndedAt: data.egressEndedAt ?? null,
          });
          setPollError(null);
        }
      } catch (error) {
        if (!ignore) {
          setPollError(error instanceof Error ? error.message : "Could not refresh LiveKit status.");
        }
      }
    }

    const interval = window.setInterval(refreshStatus, 5000);
    refreshStatus();

    return () => {
      ignore = true;
      window.clearInterval(interval);
    };
  }, [authToken, eventId, initialStatus.roomName]);

  return (
    <>
      <div className="mb-5 grid gap-3 md:grid-cols-4">
        <div className="admin-events-summary-card">
          <span>Room</span>
          <strong>{statusText(status.roomStatus)}</strong>
          {latestActivity ? (
            <small className="mt-1 block text-xs text-muted-foreground">
              Updated {formatUpdatedAt(latestActivity)}
            </small>
          ) : null}
        </div>
        <div className="admin-events-summary-card">
          <span>Recording</span>
          <strong>{statusText(status.egressStatus)}</strong>
          <small className="mt-1 block text-xs text-muted-foreground">
            {status.recordingPolicy === "auto" ? "Auto-recording" : "Manual recording"}
          </small>
        </div>
        <div className="admin-events-summary-card">
          <span>Replay</span>
          <strong>{status.replayAttached ? "Attached" : "Waiting"}</strong>
          {status.replayAssetId ? (
            <small className="mt-1 block break-all text-xs text-muted-foreground">
              {status.replayAssetId}
            </small>
          ) : null}
        </div>
        <div className="admin-events-summary-card">
          <span>Room name</span>
          <strong className="break-all text-base">{status.roomName}</strong>
        </div>
      </div>

      {status.lastError ? (
        <div className="admin-banner admin-banner--error mb-5">
          {status.lastError}
        </div>
      ) : null}

      {pollError ? (
        <div className="admin-banner admin-banner--warning mb-5">
          LiveKit status could not refresh automatically: {pollError}
        </div>
      ) : null}
    </>
  );
}
