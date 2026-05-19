"use client";

import { useState } from "react";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Generate time options in 30-min increments: 6:00 AM → 10:00 PM
const TIME_OPTIONS: Array<{ label: string; minutes: number }> = [];
for (let m = 6 * 60; m <= 22 * 60; m += 30) {
  const h = Math.floor(m / 60);
  const min = m % 60;
  const ampm = h < 12 ? "AM" : "PM";
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  const label = `${displayH}:${String(min).padStart(2, "0")} ${ampm}`;
  TIME_OPTIONS.push({ label, minutes: m });
}

type Window = {
  id: string | null; // null = new, unsaved
  day_of_week: number;
  start_minutes: number;
  end_minutes: number;
  timezone: string;
  is_active: boolean;
};

type Props = {
  coachId: string;
  initialWindows: Window[];
  sessionDurationMinutes: number;
  initialBlockedDates?: string[]; // YYYY-MM-DD
};

function getTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "America/New_York";
  }
}

function minutesToLabel(minutes: number): string {
  const opt = TIME_OPTIONS.find((o) => o.minutes === minutes);
  return opt ? opt.label : `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
}

export function AvailabilityEditor({ coachId, initialWindows, sessionDurationMinutes, initialBlockedDates = [] }: Props) {
  const timezone = getTimezone();

  const [windows, setWindows] = useState<Window[]>(initialWindows);
  const [blockedDates, setBlockedDates] = useState<string[]>(initialBlockedDates);
  const [newBlockDate, setNewBlockDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Which days have at least one window
  const activeDays = new Set(windows.filter((w) => w.is_active).map((w) => w.day_of_week));

  function copyToWeekdays(sourceDay: number) {
    setWindows((prev) => {
      const sourceWins = prev.filter((w) => w.day_of_week === sourceDay && w.is_active);
      if (sourceWins.length === 0) return prev;
      // Remove existing weekday windows
      const weekdays = [1, 2, 3, 4, 5];
      const filtered = prev.filter((w) => !weekdays.includes(w.day_of_week) || w.day_of_week === sourceDay);
      // Add source windows for all other weekdays
      const newWins = weekdays
        .filter((d) => d !== sourceDay)
        .flatMap((d) =>
          sourceWins.map((w) => ({ ...w, id: null, day_of_week: d }))
        );
      return [...filtered, ...newWins];
    });
    setSaved(false);
  }

  function toggleDay(day: number) {
    setWindows((prev) => {
      const dayWindows = prev.filter((w) => w.day_of_week === day);
      if (dayWindows.length === 0) {
        // Add a default 9am–5pm window
        return [
          ...prev,
          {
            id: null,
            day_of_week: day,
            start_minutes: 9 * 60,
            end_minutes: 17 * 60,
            timezone,
            is_active: true,
          },
        ];
      }
      // Toggle is_active on all windows for this day
      const newActive = !dayWindows.some((w) => w.is_active);
      return prev.map((w) =>
        w.day_of_week === day ? { ...w, is_active: newActive } : w
      );
    });
    setSaved(false);
  }

  function addWindow(day: number) {
    setWindows((prev) => [
      ...prev,
      {
        id: null,
        day_of_week: day,
        start_minutes: 9 * 60,
        end_minutes: 17 * 60,
        timezone,
        is_active: true,
      },
    ]);
    setSaved(false);
  }

  function removeWindow(idx: number) {
    setWindows((prev) => prev.filter((_, i) => i !== idx));
    setSaved(false);
  }

  function updateWindow(idx: number, field: "start_minutes" | "end_minutes", value: number) {
    setWindows((prev) =>
      prev.map((w, i) => (i === idx ? { ...w, [field]: value } : w))
    );
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/coaching/availability/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coachId, windows, blockedDates }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "Failed to save. Please try again.");
        return;
      }
      // Update IDs from response
      const updated = (data as { windows?: Window[] }).windows;
      if (updated) setWindows(updated);
      setSaved(true);
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  // Day-by-day windows (sorted by day, then start)
  const windowsByDay = DAYS.map((_, day) =>
    windows
      .map((w, idx) => ({ ...w, _idx: idx }))
      .filter((w) => w.day_of_week === day)
      .sort((a, b) => a.start_minutes - b.start_minutes)
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Day toggles + time pickers */}
      <div className="flex flex-col gap-3">
        {DAYS.map((day, dayNum) => {
          const dayWins = windowsByDay[dayNum];
          const isOn = activeDays.has(dayNum);

          return (
            <div
              key={dayNum}
              className={`rounded-xl border transition-colors ${
                isOn ? "border-primary/20 bg-primary/3" : "border-border"
              }`}
            >
              {/* Day header */}
              <div className="flex items-center gap-3 px-4 py-3">
                {/* Toggle */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={isOn}
                  aria-label={`Toggle ${day}`}
                  onClick={() => toggleDay(dayNum)}
                  className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    isOn ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                      isOn ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
                <span
                  className={`w-24 text-sm font-medium ${
                    isOn ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {day}
                </span>

                {/* Summary when collapsed */}
                {!isOn && (
                  <span className="text-sm text-muted-foreground/60">Unavailable</span>
                )}

                {isOn && dayWins.length === 0 && (
                  <span className="text-sm text-muted-foreground/60">No windows — add one</span>
                )}

                {isOn && dayWins.length > 0 && (
                  <span className="text-sm text-muted-foreground">
                    {dayWins.map((w) => `${minutesToLabel(w.start_minutes)} – ${minutesToLabel(w.end_minutes)}`).join(", ")}
                  </span>
                )}

                {isOn && (
                  <div className="ml-auto flex items-center gap-2">
                    {dayNum >= 1 && dayNum <= 5 && isOn && dayWins.length > 0 && (
                      <button
                        type="button"
                        onClick={() => copyToWeekdays(dayNum)}
                        className="text-xs text-muted-foreground/70 hover:text-muted-foreground transition-colors"
                        title="Copy this day's schedule to all weekdays"
                      >
                        Copy to Mon–Fri
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => addWindow(dayNum)}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      + Add window
                    </button>
                  </div>
                )}
              </div>

              {/* Time pickers for each window */}
              {isOn && dayWins.length > 0 && (
                <div className="flex flex-col gap-2 border-t border-border/50 px-4 pb-3 pt-3">
                  {dayWins.map((w) => (
                    <div key={w._idx} className="flex flex-wrap items-center gap-2">
                      <select
                        value={w.start_minutes}
                        onChange={(e) => updateWindow(w._idx, "start_minutes", Number(e.target.value))}
                        className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        aria-label="Start time"
                      >
                        {TIME_OPTIONS.filter((o) => o.minutes < w.end_minutes).map((opt) => (
                          <option key={opt.minutes} value={opt.minutes}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <span className="text-sm text-muted-foreground">to</span>
                      <select
                        value={w.end_minutes}
                        onChange={(e) => updateWindow(w._idx, "end_minutes", Number(e.target.value))}
                        className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        aria-label="End time"
                      >
                        {TIME_OPTIONS.filter((o) => o.minutes > w.start_minutes + sessionDurationMinutes).map((opt) => (
                          <option key={opt.minutes} value={opt.minutes}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <span className="text-xs text-muted-foreground">{timezone}</span>
                      <button
                        type="button"
                        onClick={() => removeWindow(w._idx)}
                        className="ml-auto rounded-md p-1 text-muted-foreground/60 hover:text-destructive transition-colors"
                        aria-label="Remove window"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Blackout dates */}
      <div className="flex flex-col gap-3 rounded-xl border border-border p-4">
        <div>
          <p className="text-sm font-semibold text-foreground">Blackout dates</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Block specific dates — no slots will be shown to members on these days.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="date"
            value={newBlockDate}
            onChange={(e) => setNewBlockDate(e.target.value)}
            min={new Date().toISOString().slice(0, 10)}
            className="rounded-lg border border-border bg-surface-tint/40 px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="button"
            onClick={() => {
              if (newBlockDate && !blockedDates.includes(newBlockDate)) {
                setBlockedDates((prev) => [...prev, newBlockDate].sort());
                setNewBlockDate("");
                setSaved(false);
              }
            }}
            disabled={!newBlockDate || blockedDates.includes(newBlockDate)}
            className="rounded-lg border border-primary/30 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/5 transition-colors disabled:opacity-50"
          >
            + Block date
          </button>
          {newBlockDate && blockedDates.includes(newBlockDate) && (
            <span className="text-xs text-amber-600">Already blocked</span>
          )}
        </div>
        {blockedDates.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {blockedDates.map((d) => (
              <span
                key={d}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-medium text-muted-foreground"
              >
                {new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                <button
                  type="button"
                  onClick={() => { setBlockedDates((prev) => prev.filter((x) => x !== d)); setSaved(false); }}
                  className="text-muted-foreground/60 hover:text-destructive transition-colors"
                  aria-label={`Remove blackout ${d}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {/* Save */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{ background: "var(--color-primary)" }}
        >
          {saving ? "Saving…" : "Save availability"}
        </button>
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-green-600">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Saved
          </span>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Slots are generated every 30 minutes within your availability windows. Changes take effect immediately for new bookings.
      </p>
    </div>
  );
}
