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

/**
 * Returns the start of the "month week" for a given date.
 * Month weeks are always anchored to the 1st of each month:
 *   Week 1: days  1 – 7  → returns YYYY-MM-01
 *   Week 2: days  8 – 14 → returns YYYY-MM-08
 *   Week 3: days 15 – 21 → returns YYYY-MM-15
 *   Week 4: days 22 – 31 → returns YYYY-MM-22
 *
 * Months with 5 calendar weeks simply extend Week 4 through the end of the
 * month — no 5th topic needed, content creators always produce exactly 4.
 */
export function startOfMonthWeek(date: Date): Date {
  const day = date.getUTCDate(); // 1-31
  let weekDay: number;
  if (day <= 7) weekDay = 1;
  else if (day <= 14) weekDay = 8;
  else if (day <= 21) weekDay = 15;
  else weekDay = 22;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), weekDay));
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
