import Link from "next/link";
import {
  getAdminContentCalendar,
  type AdminCalendarDay,
  type CalendarItem,
} from "@/lib/queries/get-admin-content-calendar";

export const metadata = {
  title: "Content Calendar — Positives Admin",
};

type SearchParams = Promise<{ start?: string }>;

const STATUS_STYLE: Record<string, string> = {
  published: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  ready_for_review: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  draft: "bg-muted text-muted-foreground",
};

const TYPE_LABEL: Record<string, string> = {
  daily_audio: "Daily",
  weekly_principle: "Weekly",
  monthly_theme: "Monthly",
};

function ItemCard({
  item,
  extras,
  fallbackHref,
}: {
  item: CalendarItem | null;
  extras: number;
  fallbackHref: string;
}) {
  if (!item) return null;

  return (
    <div className="rounded-md border border-border bg-background px-2.5 py-2">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {TYPE_LABEL[item.type] ?? item.type}
        </span>
        <span
          className={`inline-flex items-center rounded-sm px-1.5 py-0.5 text-[10px] font-medium ${
            STATUS_STYLE[item.status] ?? STATUS_STYLE.draft
          }`}
        >
          {item.status === "ready_for_review" ? "Review" : item.status}
        </span>
      </div>

      <Link
        href={item.href}
        className="line-clamp-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
      >
        {item.title}
      </Link>

      {extras > 0 && (
        <Link
          href={fallbackHref}
          className="mt-1 inline-block text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          +{extras} more
        </Link>
      )}
    </div>
  );
}

function DayCell({ day }: { day: AdminCalendarDay }) {
  return (
    <div
      className={[
        "flex min-h-64 flex-col rounded-lg border p-3",
        day.hasDailyGap
          ? "border-amber-300 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-950/20"
          : "border-border bg-card",
        day.isToday ? "ring-2 ring-primary/30" : "",
        !day.isCurrentMonth ? "opacity-80" : "",
      ].join(" ")}
      title={day.label}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {day.weekday}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <span className="font-heading text-xl font-bold tracking-[-0.02em] text-foreground">
              {day.dayOfMonth}
            </span>
            {day.isToday && (
              <span className="rounded-sm bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary">
                Today
              </span>
            )}
          </div>
        </div>

        {day.hasDailyGap && (
          <span className="rounded-sm bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
            Missing daily
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2">
        <ItemCard
          item={day.daily}
          extras={day.dailyExtras}
          fallbackHref="/admin/content?type=daily_audio"
        />
        <ItemCard
          item={day.weekly}
          extras={day.weeklyExtras}
          fallbackHref="/admin/content?type=weekly_principle"
        />
        <ItemCard
          item={day.monthly}
          extras={day.monthlyExtras}
          fallbackHref="/admin/content?type=monthly_theme"
        />

        {!day.daily && (
          <p className="rounded-md border border-dashed border-amber-300 px-2.5 py-2 text-xs text-amber-900 dark:border-amber-800 dark:text-amber-200">
            No daily audio scheduled.
          </p>
        )}

        {(day.hasWeeklyGap || day.hasMonthlyGap) && (
          <div className="rounded-md border border-dashed border-border px-2.5 py-2 text-xs text-muted-foreground">
            {day.hasWeeklyGap && <p>No published weekly principle for this week.</p>}
            {day.hasMonthlyGap && <p>No published monthly theme for this month.</p>}
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
        <Link
          href={day.createDailyHref}
          className="rounded-sm border border-border px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          Create Daily
        </Link>

        {day.createWeeklyHref && (
          <Link
            href={day.createWeeklyHref}
            className="rounded-sm border border-border px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            Create Weekly
          </Link>
        )}

        {day.createMonthlyHref && (
          <Link
            href={day.createMonthlyHref}
            className="rounded-sm border border-border px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            Create Monthly
          </Link>
        )}
      </div>
    </div>
  );
}

export default async function AdminContentCalendarPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const calendar = await getAdminContentCalendar(params.start);

  return (
    <div className="max-w-7xl">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <Link
            href="/admin/content"
            className="mb-4 inline-block text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to content
          </Link>
          <h1
            className="font-heading text-2xl font-bold tracking-[-0.02em] text-foreground"
            style={{ textWrap: "balance" } as React.CSSProperties}
          >
            Content Calendar
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Four-week operational view for daily coverage, weekly principles, and monthly themes.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/admin/content/calendar?start=${calendar.previousStart}`}
            className="rounded border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            Previous 4 weeks
          </Link>
          <Link
            href="/admin/content/calendar"
            className="rounded border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            Current range
          </Link>
          <Link
            href={`/admin/content/calendar?start=${calendar.nextStart}`}
            className="rounded border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            Next 4 weeks
          </Link>
        </div>
      </div>

      <div className="mb-5 flex flex-col gap-4 rounded-xl border border-border bg-card p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Visible range
          </p>
          <h2 className="font-heading text-lg font-semibold tracking-[-0.02em] text-foreground">
            {calendar.visibleMonthSummary}
          </h2>
          <p className="text-sm text-muted-foreground">
            {calendar.start} through {calendar.end}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-amber-100 px-3 py-1 font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
            {calendar.dailyGapCount} daily gap{calendar.dailyGapCount === 1 ? "" : "s"}
          </span>
          {calendar.weeklyGapCount > 0 && (
            <span className="rounded-full bg-muted px-3 py-1 font-medium text-muted-foreground">
              {calendar.weeklyGapCount} week
              {calendar.weeklyGapCount === 1 ? "" : "s"} missing a published principle
            </span>
          )}
          {calendar.monthlyGapCount > 0 && (
            <span className="rounded-full bg-muted px-3 py-1 font-medium text-muted-foreground">
              {calendar.monthlyGapCount} month
              {calendar.monthlyGapCount === 1 ? "" : "s"} missing a published theme
            </span>
          )}
        </div>
      </div>

      <div className="mb-3 grid grid-cols-7 gap-2">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => (
          <div
            key={label}
            className="px-2 py-1 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-7">
        {calendar.days.map((day) => (
          <DayCell key={day.date} day={day} />
        ))}
      </div>
    </div>
  );
}
