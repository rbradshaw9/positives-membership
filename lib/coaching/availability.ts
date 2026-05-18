/**
 * lib/coaching/availability.ts
 *
 * Slot generation engine for native coaching availability.
 *
 * Given a coach's weekly schedule (coach_availability rows) and existing
 * confirmed bookings, generates a list of available time slots for a given
 * date range.
 *
 * All times are handled in UTC internally. The UI converts to member's timezone
 * for display.
 */

import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";

export type AvailabilityWindow = {
  day_of_week: number;   // 0=Sun, 1=Mon, ..., 6=Sat
  start_minutes: number; // minutes from midnight in coach timezone
  end_minutes: number;
  timezone: string;
};

export type TimeSlot = {
  startsAt: string;   // ISO UTC
  endsAt: string;     // ISO UTC
  coachId: string;
  coachName: string;
  coachAvatarUrl: string | null;
};

export type CoachProfileRow = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  session_duration_minutes: number;
  buffer_minutes_after: number;
};

/**
 * Get available slots for all active coaches over the next N days.
 * Returns slots grouped by date (YYYY-MM-DD in member's local timezone).
 */
export async function getAvailableSlots(params: {
  daysAhead?: number;   // how many days to look ahead (default 14)
  memberId?: string;    // if provided, uses preferred coach routing
  timezone?: string;    // member's timezone for date grouping
}): Promise<Record<string, TimeSlot[]>> {
  const { daysAhead = 14, timezone = "America/New_York" } = params;
  const supabase = asLooseSupabaseClient(getAdminClient());

  const now = new Date();
  const rangeStart = new Date(now.getTime() + 2 * 60 * 60 * 1000); // min 2h from now
  const rangeEnd = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

  // Load active coaches
  const { data: coachesRaw } = await supabase
    .from("coach_profile")
    .select(
      "id, display_name, avatar_url, session_duration_minutes, buffer_minutes_after"
    )
    .eq("is_active", true);
  const coaches = coachesRaw as CoachProfileRow[] | null;

  if (!coaches || coaches.length === 0) return {};

  const coachIds = coaches.map((c: CoachProfileRow) => c.id);

  // Load availability windows for all active coaches
  const { data: windowsRaw } = await supabase
    .from("coach_availability")
    .select("coach_id, day_of_week, start_minutes, end_minutes, timezone")
    .in("coach_id", coachIds)
    .eq("is_active", true);
  const windows = windowsRaw as Array<AvailabilityWindow & { coach_id: string }> | null;

  // Load existing confirmed bookings in range (to block those slots)
  const { data: existingBookingsRaw } = await supabase
    .from("coaching_booking")
    .select("coach_id, scheduled_at, duration_minutes")
    .in("coach_id", coachIds)
    .in("status", ["confirmed", "pending"])
    .gte("scheduled_at", rangeStart.toISOString())
    .lte("scheduled_at", rangeEnd.toISOString());
  const existingBookings = existingBookingsRaw as Array<{ coach_id: string; scheduled_at: string; duration_minutes: number }> | null;

  const slots: TimeSlot[] = [];

  for (const coach of coaches as CoachProfileRow[]) {
    const coachWindows = (windows ?? []).filter(
      (w: AvailabilityWindow & { coach_id: string }) => w.coach_id === coach.id
    );
    const coachBookings = (existingBookings ?? []).filter(
      (b: { coach_id: string; scheduled_at: string; duration_minutes: number }) =>
        b.coach_id === coach.id
    );

    const coachSlots = generateSlotsForCoach({
      coach,
      windows: coachWindows,
      existingBookings: coachBookings,
      rangeStart,
      rangeEnd,
    });

    slots.push(...coachSlots);
  }

  // Sort by time, then group by date in member's timezone
  slots.sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  const grouped: Record<string, TimeSlot[]> = {};
  for (const slot of slots) {
    const date = new Date(slot.startsAt).toLocaleDateString("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }); // YYYY-MM-DD
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(slot);
  }

  return grouped;
}

function generateSlotsForCoach(params: {
  coach: CoachProfileRow;
  windows: Array<AvailabilityWindow & { coach_id: string }>;
  existingBookings: Array<{ scheduled_at: string; duration_minutes: number }>;
  rangeStart: Date;
  rangeEnd: Date;
}): TimeSlot[] {
  const { coach, windows, existingBookings, rangeStart, rangeEnd } = params;
  const slots: TimeSlot[] = [];
  const durationMs = coach.session_duration_minutes * 60 * 1000;
  const bufferMs = coach.buffer_minutes_after * 60 * 1000;

  // Blocked intervals (start → end+buffer)
  const blocked = existingBookings.map((b) => ({
    start: new Date(b.scheduled_at).getTime(),
    end:
      new Date(b.scheduled_at).getTime() +
      (b.duration_minutes + coach.buffer_minutes_after) * 60 * 1000,
  }));

  // Iterate each day in range
  const current = new Date(rangeStart);
  current.setUTCHours(0, 0, 0, 0);

  while (current <= rangeEnd) {
    const dayOfWeek = current.getUTCDay(); // This is UTC day — close enough for availability

    const dayWindows = windows.filter((w) => w.day_of_week === dayOfWeek);

    for (const window of dayWindows) {
      const tz = window.timezone;
      // Convert window times (in coach local timezone) to UTC for this day
      const windowStart = localMinutesToUtc(current, window.start_minutes, tz);
      const windowEnd = localMinutesToUtc(current, window.end_minutes, tz);

      // Step through slots within the window
      let slotStart = Math.max(windowStart, rangeStart.getTime());
      while (slotStart + durationMs <= windowEnd) {
        const slotEnd = slotStart + durationMs;

        // Check if this slot overlaps any blocked interval
        const isBlocked = blocked.some(
          (b) => slotStart < b.end && slotEnd > b.start
        );

        if (!isBlocked && slotStart > rangeStart.getTime()) {
          slots.push({
            startsAt: new Date(slotStart).toISOString(),
            endsAt: new Date(slotEnd).toISOString(),
            coachId: coach.id,
            coachName: coach.display_name,
            coachAvatarUrl: coach.avatar_url,
          });
        }

        // Advance by 30-minute intervals (standard booking increment)
        slotStart += 30 * 60 * 1000;
      }
    }

    // Next day
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return slots;
}

/**
 * Convert minutes-from-midnight in a given timezone to UTC milliseconds
 * for a specific UTC date.
 */
function localMinutesToUtc(
  utcDay: Date,
  minutesFromMidnight: number,
  timezone: string
): number {
  // Build a date string in local timezone and parse it
  const year = utcDay.getUTCFullYear();
  const month = String(utcDay.getUTCMonth() + 1).padStart(2, "0");
  const day = String(utcDay.getUTCDate()).padStart(2, "0");
  const hours = String(Math.floor(minutesFromMidnight / 60)).padStart(2, "0");
  const mins = String(minutesFromMidnight % 60).padStart(2, "0");

  // Use Intl to get offset for this timezone on this date
  const localDateStr = `${year}-${month}-${day}T${hours}:${mins}:00`;

  try {
    // Parse the local time as if it's in the coach's timezone
    const tempDate = new Date(`${localDateStr}Z`); // treat as UTC first
    const tzOffset = getTimezoneOffsetMinutes(tempDate, timezone);
    return tempDate.getTime() + tzOffset * 60 * 1000;
  } catch {
    return new Date(`${localDateStr}Z`).getTime();
  }
}

function getTimezoneOffsetMinutes(date: Date, timezone: string): number {
  const utcStr = date.toLocaleString("en-US", { timeZone: "UTC" });
  const localStr = date.toLocaleString("en-US", { timeZone: timezone });
  const utcDate = new Date(utcStr);
  const localDate = new Date(localStr);
  return (utcDate.getTime() - localDate.getTime()) / 60000;
}
