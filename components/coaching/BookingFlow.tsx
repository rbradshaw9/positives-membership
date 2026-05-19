"use client";

/**
 * components/coaching/BookingFlow.tsx
 *
 * Native booking flow — date picker → time slot selector → confirm.
 * Replaces the Calendly button for members with available sessions.
 *
 * State machine:
 *   idle → selecting_date → selecting_slot → confirming → booked | error
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

type TimeSlot = {
  startsAt: string;
  endsAt: string;
  coachId: string;
  coachName: string;
  coachTitle: string | null;
  coachAvatarUrl: string | null;
};

type SlotsByDate = Record<string, TimeSlot[]>;

type BookingResult = {
  bookingId: string;
  coachName: string;
  scheduledAt: string;
  durationMinutes: number;
};

type Step = "idle" | "loading" | "selecting" | "confirming" | "booked" | "error";

function formatSlotTime(iso: string, timezone: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
    timeZoneName: "short",
  }).format(new Date(iso));
}

function formatDate(dateStr: string) {
  // dateStr is YYYY-MM-DD
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date);
}

function getTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "America/New_York";
  }
}

export function BookingFlow({ onBooked }: { onBooked?: (result: BookingResult) => void }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("idle");
  const [slots, setSlots] = useState<SlotsByDate>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [intake, setIntake] = useState("");
  const [result, setResult] = useState<BookingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timezone = getTimezone();

  const loadSlots = useCallback(async () => {
    setStep("loading");
    setError(null);
    try {
      const res = await fetch(
        `/api/coaching/availability?days=14&timezone=${encodeURIComponent(timezone)}`
      );
      if (!res.ok) throw new Error("Failed to load availability");
      const data = await res.json();
      setSlots(data.slots ?? {});
      setStep("selecting");
    } catch (err) {
      setError("Could not load available times. Please try again.");
      setStep("error");
    }
  }, [timezone]);

  const handleBook = async () => {
    if (!selectedSlot) return;
    setStep("loading");
    setError(null);
    try {
      const res = await fetch("/api/coaching/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coachId: selectedSlot.coachId,
          scheduledAt: selectedSlot.startsAt,
          timezone,
          intake: intake.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Booking failed");
      const booked: BookingResult = {
        bookingId: data.bookingId,
        coachName: data.coachName,
        scheduledAt: data.scheduledAt,
        durationMinutes: data.durationMinutes ?? 60,
      };
      setResult(booked);
      setStep("booked");
      onBooked?.(booked);
      // Refresh the server component so Upcoming Sessions updates
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking failed — please try again.");
      setStep("selecting");
    }
  };

  const sortedDates = Object.keys(slots).sort();

  // ── Idle state (just the trigger button) ──────────────────────────────────
  if (step === "idle") {
    return (
      <Button variant="primary" size="sm" onClick={loadSlots} id="book-session-btn">
        Book a Session
      </Button>
    );
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (step === "loading") {
    return (
      <div className="flex items-center gap-3 py-4">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-sm text-muted-foreground">
          {selectedSlot ? "Confirming your session…" : "Finding available times…"}
        </span>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (step === "error") {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="ghost" size="sm" onClick={() => { setStep("idle"); setError(null); }}>
          Try again
        </Button>
      </div>
    );
  }

  // ── Booked confirmation ───────────────────────────────────────────────────
  if (step === "booked" && result) {
    // Build Google Calendar link using actual session duration
    const sessionStartDate = new Date(result.scheduledAt);
    const sessionEndDate = new Date(sessionStartDate.getTime() + result.durationMinutes * 60 * 1000);
    const gCalFmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(".000", "");
    const gCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`Coaching Session with ${result.coachName}`)}&dates=${gCalFmt(sessionStartDate)}/${gCalFmt(sessionEndDate)}&details=${encodeURIComponent(`Join your session: https://positives.life/account/coaching/session/${result.bookingId}`)}`;

    return (
      <div
        className="rounded-2xl border border-primary/20 bg-primary/5 p-5 flex flex-col gap-3"
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <p className="text-sm font-semibold text-foreground">Session booked!</p>
        </div>
        <p className="text-sm text-muted-foreground">
          With {result.coachName} on{" "}
          <strong>{formatSlotTime(result.scheduledAt, timezone)}</strong>
        </p>
        <p className="text-xs text-muted-foreground">A confirmation email is on its way.</p>
        <div className="flex flex-wrap items-center gap-2 mt-1">
          <Button
            href={`/account/coaching/session/${result.bookingId}`}
            variant="primary"
            size="sm"
          >
            View session room
          </Button>
          <a
            href={gCalUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            Add to Google Calendar
          </a>
        </div>
      </div>
    );
  }

  // ── Slot selection ─────────────────────────────────────────────────────────
  if (step === "selecting") {
    if (sortedDates.length === 0) {
      return (
        <div className="rounded-2xl border border-border bg-surface-tint/40 p-5">
          <p className="text-sm text-muted-foreground">
            No available times in the next 14 days. Check back soon — coaches update
            their schedules regularly.
          </p>
          <Button variant="ghost" size="sm" className="mt-3" onClick={() => setStep("idle")}>
            Close
          </Button>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-5">
        {error && (
          <p className="text-sm text-destructive rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
            {error}
          </p>
        )}

        {/* Date selection */}
        {!selectedDate && (
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium text-foreground">Choose a date</p>
            <div className="grid grid-cols-3 gap-2">
              {sortedDates.map((date) => (
                <button
                  key={date}
                  onClick={() => setSelectedDate(date)}
                  className="min-h-[44px] rounded-xl border border-border bg-surface px-3 py-3 text-left text-sm transition-all hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <span className="font-medium text-foreground">
                    {new Date(date + "T12:00:00").toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {slots[date].length} {slots[date].length === 1 ? "slot" : "slots"}
                  </span>
                </button>
              ))}
            </div>
            <Button variant="ghost" size="sm" className="self-start" onClick={() => setStep("idle")}>
              Cancel
            </Button>
          </div>
        )}

        {/* Time slot selection */}
        {selectedDate && !selectedSlot && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedDate(null)}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Back to date selection"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                Back
              </button>
              <p className="text-sm font-medium text-foreground">{formatDate(selectedDate)}</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(slots[selectedDate] ?? []).map((slot) => (
                <button
                  key={`${slot.coachId}-${slot.startsAt}`}
                  onClick={() => { setSelectedSlot(slot); setStep("confirming"); }}
                  className="min-h-[44px] rounded-xl border border-border bg-surface px-3 py-3 text-left text-sm transition-all hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <span className="font-medium text-foreground">
                    {formatSlotTime(slot.startsAt, timezone)}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    with {slot.coachName}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Confirm booking ────────────────────────────────────────────────────────
  if (step === "confirming" && selectedSlot) {
    return (
      <div className="flex flex-col gap-5 rounded-2xl border border-border bg-surface p-5">
        {/* Coach info */}
        <div className="flex items-center gap-3">
          {selectedSlot.coachAvatarUrl ? (
            <img
              src={selectedSlot.coachAvatarUrl}
              alt=""
              className="h-10 w-10 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div
              className="h-10 w-10 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold text-white"
              style={{ background: "var(--color-primary)" }}
              aria-hidden="true"
            >
              {selectedSlot.coachName[0]}
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-foreground">{selectedSlot.coachName}</p>
            {selectedSlot.coachTitle && (
              <p className="text-xs text-muted-foreground">{selectedSlot.coachTitle}</p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-foreground">
            {formatSlotTime(selectedSlot.startsAt, timezone)}
          </p>
          <p className="text-xs text-muted-foreground">
            One session will be deducted from your balance.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="booking-intake"
            className="text-xs font-medium text-muted-foreground"
          >
            What would you like to work on? <span className="text-muted-foreground/60">(optional)</span>
          </label>
          <textarea
            id="booking-intake"
            value={intake}
            onChange={(e) => setIntake(e.target.value)}
            placeholder="Share any context or goals for this session…"
            rows={3}
            maxLength={1000}
            className="rounded-lg border border-border bg-surface-tint/40 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        </div>

        <div className="flex items-center gap-3">
          <Button variant="primary" size="sm" onClick={handleBook} id="confirm-booking-btn">
            Confirm Booking
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setSelectedSlot(null); setStep("selecting"); }}
          >
            Back
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
