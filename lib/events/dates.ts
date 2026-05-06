import { addDays, formatDateOnly, parseDateOnly, startOfWeekMonday } from "@/lib/dates/admin-calendar";
import { formatInTimeZone } from "date-fns-tz";

export function eventDateKey(value: string | Date, timezone = "UTC") {
  const date = typeof value === "string" ? new Date(value) : value;
  return formatInTimeZone(date, timezone, "yyyy-MM-dd");
}

export function monthRange(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const start = new Date(Date.UTC(year, monthNumber - 1, 1));
  const end = new Date(Date.UTC(year, monthNumber, 0));
  return {
    start: formatDateOnly(start),
    end: formatDateOnly(end),
  };
}

export function calendarGridDays(month: string) {
  const { start, end } = monthRange(month);
  const first = startOfWeekMonday(parseDateOnly(start));
  const last = startOfWeekMonday(addDays(parseDateOnly(end), 6));
  const total = Math.max(35, Math.round((last.getTime() - first.getTime()) / (24 * 60 * 60 * 1000)) + 1);
  const gridStart = formatDateOnly(first);
  return Array.from({ length: total }, (_, index) => formatDateOnly(addDays(parseDateOnly(gridStart), index)));
}

export function currentMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

export function currentTimestampMs() {
  return Date.now();
}

export function shiftMonth(month: string, amount: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + amount, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function formatEventDateRange(startsAt: string, endsAt: string, timezone: string, allDay = false) {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  if (allDay) {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: timezone,
    }).format(start);
  }

  const day = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: timezone,
  }).format(start);
  const time = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
    timeZoneName: "short",
  }).formatRange(start, end);
  return `${day}, ${time}`;
}
