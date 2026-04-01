/**
 * lib/dates/admin-calendar.ts
 * Date helpers for the admin content calendar.
 *
 * These helpers work with canonical date-only strings (YYYY-MM-DD) and use
 * UTC-backed Date objects to avoid local timezone drift while doing calendar
 * math for admin scheduling views.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function formatDateOnly(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

export function addWeeks(date: Date, weeks: number): Date {
  return addDays(date, weeks * 7);
}

export function startOfWeekMonday(date: Date): Date {
  const day = date.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(date, diff);
}

export function getCalendarStart(value: string): string {
  return formatDateOnly(startOfWeekMonday(parseDateOnly(value)));
}

export function getRangeDays(start: string, totalDays: number): string[] {
  const firstDay = parseDateOnly(start);

  return Array.from({ length: totalDays }, (_, index) =>
    formatDateOnly(addDays(firstDay, index))
  );
}

export function getMonthYear(value: string): string {
  return value.slice(0, 7);
}

export function getMonthStart(value: string): string {
  return `${getMonthYear(value)}-01`;
}

export function getMonthLabel(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(parseDateOnly(getMonthStart(value)));
}

export function getDayNumber(value: string): string {
  return String(parseDateOnly(value).getUTCDate());
}

export function getWeekdayShortLabel(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: "UTC",
  }).format(parseDateOnly(value));
}

export function getLongDateLabel(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(parseDateOnly(value));
}
