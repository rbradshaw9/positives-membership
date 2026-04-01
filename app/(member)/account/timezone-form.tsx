"use client";

import { useActionState, useTransition } from "react";
import { updateTimezone } from "./actions";

/**
 * components for /account — TimezoneForm
 * Simple select + save for member timezone preference.
 * Shows current value and allows changing to any common timezone.
 */

type State = { error?: string; success?: true };
const initial: State = {};

// Common timezones — enough to cover US + international members without
// overwhelming a simple settings form. Full Intl list available in Sprint 4
// if a searchable timezone picker is ever needed.
const TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HT)" },
  { value: "America/Toronto", label: "Eastern Time — Toronto" },
  { value: "America/Vancouver", label: "Pacific Time — Vancouver" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Paris", label: "Central European Time" },
  { value: "Europe/Berlin", label: "Central European Time — Berlin" },
  { value: "Asia/Dubai", label: "Gulf Standard Time (GST)" },
  { value: "Asia/Kolkata", label: "India Standard Time (IST)" },
  { value: "Asia/Singapore", label: "Singapore Time (SGT)" },
  { value: "Asia/Tokyo", label: "Japan Standard Time (JST)" },
  { value: "Australia/Sydney", label: "Australian Eastern Time (AET)" },
];

interface TimezoneFormProps {
  currentTimezone: string;
}

export function TimezoneForm({ currentTimezone }: TimezoneFormProps) {
  const [state, action] = useActionState<State, FormData>(updateTimezone, initial);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={action}
      className="bg-card rounded-xl border border-border shadow-soft p-5 flex flex-col gap-4"
    >
      <select
        name="timezone"
        defaultValue={currentTimezone}
        className="w-full rounded-xl px-4 py-2.5 text-sm text-foreground bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/60 transition-colors"
        aria-label="Your timezone"
      >
        {TIMEZONES.map((tz) => (
          <option key={tz.value} value={tz.value}>
            {tz.label}
          </option>
        ))}
        {/* If member's current timezone isn't in the curated list, add it */}
        {!TIMEZONES.some((tz) => tz.value === currentTimezone) && (
          <option value={currentTimezone}>{currentTimezone}</option>
        )}
      </select>

      {state.error && (
        <p role="alert" className="text-xs text-destructive">
          {state.error}
        </p>
      )}

      {state.success && (
        <p className="text-xs text-secondary font-medium">Timezone saved.</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        onClick={() => startTransition(() => {})}
        className="self-start text-sm font-medium text-primary hover:text-primary-hover transition-colors disabled:opacity-50"
      >
        {isPending ? "Saving…" : "Save timezone"}
      </button>
    </form>
  );
}
