"use client";

import { useActionState, useTransition } from "react";
import { updateTimezone } from "./actions";

/**
 * app/(member)/account/timezone-form.tsx
 * Sprint 7: timezone select + save.
 * Sprint 11: .member-input on select, .btn-primary (small) on save button.
 *   Replaced text link with a real button for visual weight parity.
 */

type State = { error?: string; success?: true };
const initial: State = {};

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
      className="bg-card rounded-2xl border border-border p-5 flex flex-col gap-4"
      style={{ boxShadow: "var(--shadow-medium)" }}
    >
      <select
        name="timezone"
        defaultValue={currentTimezone}
        className="member-input"
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
        className="btn-primary self-start"
        style={{ padding: "0.5rem 1.125rem", fontSize: "0.8125rem" }}
      >
        {isPending ? "Saving…" : "Save timezone"}
      </button>
    </form>
  );
}
