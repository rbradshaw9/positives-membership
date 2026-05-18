"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Props = {
  bookingId: string;
  coachName: string;
  scheduledAt: string; // ISO UTC
  durationMinutes: number;
  joinUrl: string;
};

function formatSessionTime(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const timeStr = date.toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });

  let badge = "";
  if (diffHours < 1 && diffMs > 0) {
    badge = "Starting soon";
  } else if (diffHours < 24) {
    badge = "Tomorrow";
  } else if (diffDays === 1) {
    badge = "Tomorrow";
  } else if (diffDays <= 6) {
    badge = `In ${diffDays} days`;
  }

  return { timeStr, badge };
}

function isJoinable(iso: string, durationMinutes: number): boolean {
  const sessionStart = new Date(iso).getTime();
  const now = Date.now();
  const joinWindowStart = sessionStart - 30 * 60 * 1000; // 30 min before
  const joinWindowEnd = sessionStart + (durationMinutes + 120) * 60 * 1000; // 2h after
  return now >= joinWindowStart && now <= joinWindowEnd;
}

export function UpcomingSessionCard({
  bookingId,
  coachName,
  scheduledAt,
  durationMinutes,
  joinUrl,
}: Props) {
  const router = useRouter();
  const [canceling, setCanceling] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { timeStr, badge } = formatSessionTime(scheduledAt);
  const canJoin = isJoinable(scheduledAt, durationMinutes);

  // Check if within 24h (no refund)
  const hoursUntil = (new Date(scheduledAt).getTime() - Date.now()) / (1000 * 60 * 60);
  const sessionRestored = hoursUntil > 24;

  async function handleCancel() {
    setCanceling(true);
    setError(null);
    try {
      const res = await fetch("/api/coaching/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? "Cancellation failed. Please try again.");
        setCanceling(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Cancellation failed. Please try again.");
      setCanceling(false);
    }
  }

  return (
    <div
      className="rounded-2xl border border-border bg-card p-4 sm:p-5"
      style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            {badge && (
              <span
                className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                style={{
                  background: "var(--color-primary)",
                  color: "#fff",
                }}
              >
                {badge}
              </span>
            )}
            <span
              className="rounded-full border px-2 py-0.5 text-[11px] font-medium"
              style={{
                borderColor: "var(--color-border)",
                color: "var(--color-muted-fg)",
              }}
            >
              {durationMinutes} min
            </span>
          </div>
          <p className="text-sm font-semibold text-foreground">
            Coaching session with {coachName}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">{timeStr}</p>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 sm:flex-shrink-0">
          <Link
            href={joinUrl}
            className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{
              background: canJoin ? "var(--color-primary)" : "var(--color-muted)",
              color: canJoin ? "#fff" : "var(--color-muted-fg)",
              pointerEvents: canJoin ? "auto" : "none",
            }}
            aria-disabled={!canJoin}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            {canJoin ? "Join Session" : "Joining available 30 min before"}
          </Link>

          {!confirmCancel ? (
            <button
              onClick={() => setConfirmCancel(true)}
              className="rounded-lg border border-border bg-transparent px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
            >
              Cancel
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleCancel}
                disabled={canceling}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ background: "var(--color-destructive, #e53e3e)" }}
              >
                {canceling ? "Canceling…" : "Confirm cancel"}
              </button>
              <button
                onClick={() => setConfirmCancel(false)}
                className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                Keep
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Cancel warning */}
      {confirmCancel && !error && (
        <p className="mt-3 text-xs text-muted-foreground border-t border-border/60 pt-3">
          {sessionRestored
            ? "✓ Canceling more than 24 hours before restores your session credit."
            : "⚠ This session is within 24 hours — your session credit will not be restored."}
        </p>
      )}

      {/* Error */}
      {error && (
        <p className="mt-3 text-xs text-red-600 border-t border-border/60 pt-3">{error}</p>
      )}
    </div>
  );
}
