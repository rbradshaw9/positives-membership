"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Props = {
  bookingId: string;
  coachId: string;
  coachName: string;
  scheduledAt: string; // ISO UTC
  durationMinutes: number;
  joinUrl: string;
};

type TimeSlot = {
  startsAt: string;
  endsAt: string;
  coachId: string;
  coachName: string;
  coachTitle: string | null;
  coachAvatarUrl: string | null;
};

type SlotsByDate = Record<string, TimeSlot[]>;

function formatSessionTime(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const timezone = getTimezone();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = diffMs / (1000 * 60 * 60);

  const timeStr = date.toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
    timeZoneName: "short",
  });

  let badge = "";
  if (diffHours > 0 && diffHours < 1) badge = "Starting soon";
  else if (diffHours >= 1 && diffHours < 24) badge = "Today";
  else if (diffDays === 1) badge = "Tomorrow";
  else if (diffDays >= 2 && diffDays <= 6) badge = `In ${diffDays} days`;

  return { timeStr, badge };
}

function isJoinable(iso: string, durationMinutes: number): boolean {
  const sessionStart = new Date(iso).getTime();
  const now = Date.now();
  const joinWindowStart = sessionStart - 30 * 60 * 1000;
  const joinWindowEnd = sessionStart + (durationMinutes + 120) * 60 * 1000;
  return now >= joinWindowStart && now <= joinWindowEnd;
}

function getTimezone() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return "America/New_York"; }
}

function formatSlotTime(iso: string, timezone: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric", minute: "2-digit", timeZone: timezone, timeZoneName: "short",
  }).format(new Date(iso));
}

function formatDateLabel(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" })
    .format(new Date(y, m - 1, d));
}

// ── Reschedule modal ──────────────────────────────────────────────────────────

function RescheduleModal({
  bookingId,
  coachId,
  onClose,
  onRescheduled,
}: {
  bookingId: string;
  coachId: string;
  onClose: () => void;
  onRescheduled: () => void;
}) {
  const timezone = getTimezone();
  const [slots, setSlots] = useState<SlotsByDate>({});
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load slots on mount — must be useEffect, NOT useState
  useEffect(() => {
    fetch(`/api/coaching/availability?days=28&timezone=${encodeURIComponent(timezone)}`)
      .then((r) => r.json())
      .then((d) => { setSlots(d.slots ?? {}); setLoading(false); })
      .catch(() => { setError("Could not load available times."); setLoading(false); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleConfirm() {
    if (!selectedSlot) return;
    setConfirming(true);
    setError(null);
    try {
      const res = await fetch("/api/coaching/reschedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          newScheduledAt: selectedSlot.startsAt,
          newCoachId: selectedSlot.coachId,
          timezone,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "Reschedule failed.");
        setConfirming(false);
        return;
      }
      onRescheduled();
    } catch {
      setError("Reschedule failed. Please try again.");
      setConfirming(false);
    }
  }

  const sortedDates = Object.keys(slots).sort();

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Reschedule session"
    >
      {/* Backdrop */}
      <button
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close"
      />

      {/* Sheet */}
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Reschedule Session</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <p className="text-sm text-muted-foreground -mt-2">
          Pick a new date and time. No session credit is lost — your booking just moves.
        </p>

        {loading && (
          <div className="flex items-center gap-3 py-6">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-sm text-muted-foreground">Loading available slots…</span>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        {/* Date picker */}
        {!loading && !selectedDate && sortedDates.length > 0 && (
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium text-foreground">Choose a new date</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {sortedDates.map((date) => (
                <button
                  key={date}
                  onClick={() => setSelectedDate(date)}
                  className="rounded-xl border border-border bg-surface px-3 py-3 text-left text-sm transition-all hover:border-primary/40 hover:bg-primary/5"
                >
                  <span className="font-medium text-foreground">{formatDateLabel(date)}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {slots[date].length} slot{slots[date].length !== 1 ? "s" : ""}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {!loading && !selectedDate && sortedDates.length === 0 && (
          <p className="text-sm text-muted-foreground">No available slots in the next 28 days.</p>
        )}

        {/* Time picker */}
        {selectedDate && !selectedSlot && (
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setSelectedDate(null)}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground self-start"
            >
              ← {formatDateLabel(selectedDate)}
            </button>
            <div className="grid grid-cols-2 gap-2">
              {(slots[selectedDate] ?? []).map((slot) => (
                <button
                  key={`${slot.coachId}-${slot.startsAt}`}
                  onClick={() => setSelectedSlot(slot)}
                  className="rounded-xl border border-border bg-surface px-3 py-3 text-left text-sm transition-all hover:border-primary/40 hover:bg-primary/5"
                >
                  <span className="font-medium text-foreground">{formatSlotTime(slot.startsAt, timezone)}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">with {slot.coachName}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Confirm */}
        {selectedSlot && (
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface-tint/40 p-4">
            <p className="text-sm font-medium text-foreground">Confirm new time</p>
            <p className="text-sm text-muted-foreground">
              {formatSlotTime(selectedSlot.startsAt, timezone)} with {selectedSlot.coachName}
            </p>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex items-center gap-2">
              <button
                onClick={handleConfirm}
                disabled={confirming}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                style={{ background: "var(--color-primary)" }}
              >
                {confirming ? "Rescheduling…" : "Confirm new time"}
              </button>
              <button
                onClick={() => setSelectedSlot(null)}
                className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                Back
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main card ─────────────────────────────────────────────────────────────────

export function UpcomingSessionCard({
  bookingId,
  coachId,
  coachName,
  scheduledAt,
  durationMinutes,
  joinUrl,
}: Props) {
  const router = useRouter();
  const [canceling, setCanceling] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { timeStr, badge } = formatSessionTime(scheduledAt);
  const canJoin = isJoinable(scheduledAt, durationMinutes);

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
        setError((data as { error?: string }).error ?? "Cancellation failed.");
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
    <>
      {showReschedule && (
        <RescheduleModal
          bookingId={bookingId}
          coachId={coachId}
          onClose={() => setShowReschedule(false)}
          onRescheduled={() => { setShowReschedule(false); router.refresh(); }}
        />
      )}

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
                  className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-white"
                  style={{ background: badge === "Starting soon" ? "var(--color-destructive, #e53e3e)" : "var(--color-primary)" }}
                >
                  {badge}
                </span>
              )}
              <span className="rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
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
            {canJoin ? (
              <Link
                href={joinUrl}
                className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: "var(--color-primary)" }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Join Session
              </Link>
            ) : (
              <Link
                href={joinUrl}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground"
              >
                View details
              </Link>
            )}

            {!confirmCancel ? (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setShowReschedule(true)}
                  className="rounded-lg border border-border bg-transparent px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Reschedule
                </button>
                <button
                  onClick={() => setConfirmCancel(true)}
                  className="rounded-lg border border-border bg-transparent px-3 py-2 text-sm font-medium text-muted-foreground hover:border-destructive/40 hover:text-destructive transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCancel}
                  disabled={canceling}
                  className="rounded-lg px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
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

        {/* Cancel refund policy warning */}
        {confirmCancel && !error && (
          <p className="mt-3 text-xs text-muted-foreground border-t border-border/60 pt-3">
            {sessionRestored
              ? "✓ Canceling more than 24 hours before restores your session credit."
              : "⚠ Within 24 hours — your session credit will not be restored."}
          </p>
        )}

        {error && (
          <p className="mt-3 text-xs text-red-600 border-t border-border/60 pt-3">{error}</p>
        )}
      </div>
    </>
  );
}
