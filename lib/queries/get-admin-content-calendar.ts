import { createClient } from "@/lib/supabase/server";
import { getEffectiveDate } from "@/lib/dates/effective-date";
import {
  addDays,
  addWeeks,
  formatDateOnly,
  getCalendarStart,
  getLongDateLabel,
  getMonthLabel,
  getMonthStart,
  getMonthYear,
  getRangeDays,
  getWeekdayShortLabel,
  parseDateOnly,
  startOfMonthWeek,
} from "@/lib/dates/admin-calendar";
import type { Tables } from "@/types/supabase";

type CalendarContentRow = Pick<
  Tables<"content">,
  "id" | "title" | "type" | "status" | "publish_date" | "week_start" | "month_year"
>;

export type CalendarItem = {
  id: string;
  title: string;
  type: CalendarContentRow["type"];
  status: CalendarContentRow["status"];
  href: string;
};

export type AdminCalendarDay = {
  date: string;
  label: string;
  weekday: string;
  dayOfMonth: string;
  isToday: boolean;
  isCurrentMonth: boolean;
  isWeekStart: boolean;
  isMonthStart: boolean;
  daily: CalendarItem | null;
  dailyExtras: number;
  weekly: CalendarItem | null;
  weeklyExtras: number;
  monthly: CalendarItem | null;
  monthlyExtras: number;
  hasDailyGap: boolean;
  hasDailyPublishRisk: boolean;
  hasWeeklyGap: boolean;
  hasMonthlyGap: boolean;
  createDailyHref: string;
  createWeeklyHref: string | null;
  createMonthlyHref: string | null;
};

export type AdminCalendarData = {
  start: string;
  end: string;
  previousStart: string;
  nextStart: string;
  visibleMonthSummary: string;
  dailyGapCount: number;
  dailyPublishRiskCount: number;
  weeklyGapCount: number;
  monthlyGapCount: number;
  days: AdminCalendarDay[];
};

const CONTENT_TYPES = ["daily_audio", "weekly_principle", "monthly_theme"] as const;

const STATUS_PRIORITY: Record<string, number> = {
  published: 0,
  ready_for_review: 1,
  draft: 2,
  archived: 99,
};

function comparePriority(a: CalendarContentRow, b: CalendarContentRow): number {
  return (STATUS_PRIORITY[a.status] ?? 50) - (STATUS_PRIORITY[b.status] ?? 50);
}

function toCalendarItem(row: CalendarContentRow): CalendarItem {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    status: row.status,
    href: `/admin/content/${row.id}/edit`,
  };
}

function pickBest(rows: CalendarContentRow[]): {
  item: CalendarItem | null;
  extras: number;
} {
  if (rows.length === 0) {
    return { item: null, extras: 0 };
  }

  const sorted = [...rows].sort(comparePriority);
  return {
    item: toCalendarItem(sorted[0]),
    extras: Math.max(0, sorted.length - 1),
  };
}

function getVisibleMonthSummary(start: string, end: string): string {
  const startMonth = getMonthLabel(start);
  const endMonth = getMonthLabel(end);
  return startMonth === endMonth ? startMonth : `${startMonth} - ${endMonth}`;
}

export async function getAdminContentCalendar(
  requestedStart?: string
): Promise<AdminCalendarData> {
  const today = getEffectiveDate();
  const start = getCalendarStart(requestedStart ?? today);
  const end = formatDateOnly(addDays(parseDateOnly(start), 27));
  const previousStart = formatDateOnly(addWeeks(parseDateOnly(start), -4));
  const nextStart = formatDateOnly(addWeeks(parseDateOnly(start), 4));
  const visibleDates = getRangeDays(start, 28);
  const rangeMonths = Array.from(new Set(visibleDates.map(getMonthYear)));
  const weekStarts = Array.from(
    new Set(visibleDates.map((date) => formatDateOnly(startOfMonthWeek(parseDateOnly(date)))))
  );

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("content")
    .select("id, title, type, status, publish_date, week_start, month_year")
    .in("type", CONTENT_TYPES)
    .neq("status", "archived")
    .or(
      [
        `and(type.eq.daily_audio,publish_date.gte.${start},publish_date.lte.${end})`,
        `and(type.eq.weekly_principle,week_start.gte.${weekStarts[0]},week_start.lte.${weekStarts[weekStarts.length - 1]})`,
        ...rangeMonths.map((month) => `and(type.eq.monthly_theme,month_year.eq.${month})`),
      ].join(",")
    );

  if (error) {
    console.error("[getAdminContentCalendar] Supabase query error:", error.message);
  }

  const rows = ((data ?? []) as CalendarContentRow[]).sort(comparePriority);

  const dailyByDate = new Map<string, CalendarContentRow[]>();
  const weeklyByStart = new Map<string, CalendarContentRow[]>();
  const publishedWeeklyStarts = new Set<string>();
  const monthlyByMonth = new Map<string, CalendarContentRow[]>();
  const publishedMonths = new Set<string>();

  for (const row of rows) {
    if (row.type === "daily_audio" && row.publish_date) {
      dailyByDate.set(row.publish_date, [...(dailyByDate.get(row.publish_date) ?? []), row]);
    }

    if (row.type === "weekly_principle" && row.week_start) {
      weeklyByStart.set(row.week_start, [...(weeklyByStart.get(row.week_start) ?? []), row]);
      if (row.status === "published") {
        publishedWeeklyStarts.add(row.week_start);
      }
    }

    if (row.type === "monthly_theme" && row.month_year) {
      monthlyByMonth.set(row.month_year, [...(monthlyByMonth.get(row.month_year) ?? []), row]);
      if (row.status === "published") {
        publishedMonths.add(row.month_year);
      }
    }
  }

  const days = visibleDates.map((date) => {
    const weekStart = formatDateOnly(startOfMonthWeek(parseDateOnly(date)));
    const monthYear = getMonthYear(date);
    const dailyRows = dailyByDate.get(date) ?? [];
    const weeklyRows = weeklyByStart.get(weekStart) ?? [];
    const monthlyRows = monthlyByMonth.get(monthYear) ?? [];
    const daily = pickBest(dailyRows);
    const weekly = pickBest(weeklyRows);
    const monthly = pickBest(monthlyRows);
    const hasPublishedDaily = dailyRows.some((row) => row.status === "published");
    // isWeekStart: true on the 1st, 8th, 15th, 22nd of any month (month-week boundary)
    const isWeekStart = date === weekStart;
    const isMonthStart = date === getMonthStart(date);

    return {
      date,
      label: getLongDateLabel(date),
      weekday: getWeekdayShortLabel(date),
      dayOfMonth: String(parseDateOnly(date).getUTCDate()),
      isToday: date === today,
      isCurrentMonth: monthYear === getMonthYear(today),
      isWeekStart,
      isMonthStart,
      daily: daily.item,
      dailyExtras: daily.extras,
      weekly: weekly.item,
      weeklyExtras: weekly.extras,
      monthly: monthly.item,
      monthlyExtras: monthly.extras,
      hasDailyGap: dailyRows.length === 0,
      hasDailyPublishRisk: dailyRows.length > 0 && !hasPublishedDaily,
      hasWeeklyGap: isWeekStart && !publishedWeeklyStarts.has(weekStart),
      hasMonthlyGap: isMonthStart && !publishedMonths.has(monthYear),
      createDailyHref: `/admin/content/new?type=daily_audio&publish_date=${date}`,
      createWeeklyHref: isWeekStart
        ? `/admin/content/new?type=weekly_principle&week_start=${weekStart}`
        : null,
      createMonthlyHref: isMonthStart
        ? `/admin/content/new?type=monthly_theme&month_year=${monthYear}`
        : null,
    };
  });

  return {
    start,
    end,
    previousStart,
    nextStart,
    visibleMonthSummary: getVisibleMonthSummary(start, end),
    dailyGapCount: days.filter((day) => day.hasDailyGap).length,
    dailyPublishRiskCount: days.filter((day) => day.hasDailyPublishRisk).length,
    weeklyGapCount: days.filter((day) => day.hasWeeklyGap).length,
    monthlyGapCount: days.filter((day) => day.hasMonthlyGap).length,
    days,
  };
}
