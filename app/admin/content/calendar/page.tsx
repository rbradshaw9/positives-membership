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

// Maps content status → admin-badge modifier class
const STATUS_BADGE: Record<string, string> = {
  published: "admin-badge admin-badge--published",
  ready_for_review: "admin-badge admin-badge--review",
  draft: "admin-badge admin-badge--draft",
  archived: "admin-badge admin-badge--archived",
};

const STATUS_LABEL: Record<string, string> = {
  published: "Published",
  ready_for_review: "Review",
  draft: "Draft",
  archived: "Archived",
};

const TYPE_LABEL: Record<string, string> = {
  daily_audio: "Daily",
  weekly_principle: "Weekly",
  monthly_theme: "Monthly",
};

// ── Item card (inside each day cell) ────────────────────────────────────────

function ItemCard({
  item,
  extraItems,
  sectionLabel,
}: {
  item: CalendarItem | null;
  extraItems: CalendarItem[];
  sectionLabel: string;
}) {
  const extras = extraItems.length;

  return (
    <div className="surface-card" style={{ padding: "0.625rem 0.75rem", borderRadius: "0.75rem" }}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span
          className="text-[10px] font-semibold uppercase tracking-[0.14em]"
          style={{ color: "var(--color-text-subtle)" }}
        >
          {sectionLabel}
        </span>
        {item && (
          <span className={STATUS_BADGE[item.status] ?? STATUS_BADGE.draft}
            style={{ fontSize: "0.625rem", padding: "0.125rem 0.5rem" }}>
            {STATUS_LABEL[item.status] ?? item.status}
          </span>
        )}
      </div>

      {item ? (
        <>
          <div
            className="mb-1 text-[11px] font-medium uppercase tracking-wide"
            style={{ color: "var(--color-text-subtle)" }}
          >
            {TYPE_LABEL[item.type] ?? item.type}
          </div>

          <Link
            href={item.href}
            className="line-clamp-2 text-sm font-medium transition-colors hover:text-primary"
            style={{ color: "var(--color-text-default)" }}
          >
            {item.title}
          </Link>

          <div className="mt-2 flex items-center justify-between gap-2">
            {extras > 0 ? (
              <span className="text-[11px]" style={{ color: "var(--color-text-subtle)" }}>
                +{extras} more scheduled
              </span>
            ) : (
              <span className="text-[11px]" style={{ color: "var(--color-text-subtle)" }}>
                Scheduled
              </span>
            )}
            <Link
              href={item.href}
              className="text-[11px] font-medium transition-colors hover:text-foreground"
              style={{ color: "var(--color-text-subtle)" }}
            >
              Edit
            </Link>
          </div>

          {extraItems.length > 0 ? (
            <details
              className="mt-2 rounded-xl border border-dashed px-2.5 py-2"
              style={{
                borderColor: "var(--color-border)",
                background: "rgba(18,20,23,0.02)",
              }}
            >
              <summary
                className="cursor-pointer text-[11px] font-medium"
                style={{ color: "var(--color-text-subtle)" }}
              >
                View duplicate items
              </summary>
              <div className="mt-2 flex flex-col gap-2">
                {extraItems.map((extra) => (
                  <Link
                    key={extra.id}
                    href={extra.href}
                    className="rounded-lg border px-2.5 py-2 text-xs transition-colors hover:bg-muted"
                    style={{
                      borderColor: "var(--color-border)",
                      color: "var(--color-text-default)",
                    }}
                  >
                    <span className="line-clamp-2 font-medium">{extra.title}</span>
                    <span
                      className={STATUS_BADGE[extra.status] ?? STATUS_BADGE.draft}
                      style={{
                        marginTop: "0.4rem",
                        width: "fit-content",
                        fontSize: "0.6rem",
                        padding: "0.1rem 0.45rem",
                      }}
                    >
                      {STATUS_LABEL[extra.status] ?? extra.status}
                    </span>
                  </Link>
                ))}
              </div>
            </details>
          ) : null}
        </>
      ) : (
        <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-subtle)" }}>
          Nothing assigned here yet.
        </p>
      )}
    </div>
  );
}

// ── Day cell ─────────────────────────────────────────────────────────────────

function DayCell({ day }: { day: AdminCalendarDay }) {
  // Functional state colors — amber = missing coverage, rose = unpublished risk
  const cellStyle: React.CSSProperties = day.hasDailyGap
    ? { borderColor: "#FCD34D", background: "rgba(254,243,199,0.6)" }
    : day.hasDailyPublishRisk
      ? { borderColor: "#FCA5A5", background: "rgba(254,226,226,0.5)" }
      : {};

  return (
    <div
      className="surface-card flex min-h-72 flex-col"
      style={{
        padding: "0.75rem",
        borderRadius: "1rem",
        ...(day.isToday ? { outline: "2px solid rgba(47,111,237,0.25)", outlineOffset: "1px" } : {}),
        ...(!day.isCurrentMonth ? { opacity: 0.8 } : {}),
        ...cellStyle,
      }}
      title={day.label}
    >
      {/* ── Day header ── */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p
            className="text-[11px] font-medium uppercase tracking-wide"
            style={{ color: "var(--color-text-subtle)" }}
          >
            {day.weekday}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <span
              className="font-heading text-xl font-bold"
              style={{ letterSpacing: "-0.02em", color: "var(--color-text-default)" }}
            >
              {day.dayOfMonth}
            </span>
            {day.isToday && (
              <span className="admin-badge admin-badge--published" style={{ fontSize: "0.65rem" }}>
                Today
              </span>
            )}
          </div>
        </div>

        {(day.hasDailyGap || day.hasDailyPublishRisk) && (
          <span
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium"
            style={{
              background: "rgba(254,243,199,0.9)",
              color: "#92400E",
            }}
          >
            <svg
              width="11" height="11" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            </svg>
            {day.hasDailyGap ? "Missing daily" : "Not published"}
          </span>
        )}
      </div>

      {/* ── Content slots ── */}
      <div className="flex flex-1 flex-col gap-2">
        <ItemCard
          item={day.daily}
          extraItems={day.dailyExtraItems}
          sectionLabel="Daily Coverage"
        />
        <ItemCard
          item={day.weekly}
          extraItems={day.weeklyExtraItems}
          sectionLabel="Weekly Principle"
        />
        <ItemCard
          item={day.monthly}
          extraItems={day.monthlyExtraItems}
          sectionLabel="Monthly Theme"
        />

        {!day.daily && (
          <p
            className="rounded-xl border border-dashed px-3 py-2 text-xs font-medium"
            style={{
              borderColor: "#FCD34D",
              background: "rgba(254,243,199,0.4)",
              color: "#92400E",
            }}
          >
            No daily audio scheduled for this date.
          </p>
        )}

        {day.daily && day.hasDailyPublishRisk && (
          <p
            className="rounded-xl border border-dashed px-3 py-2 text-xs font-medium"
            style={{
              borderColor: "#FCA5A5",
              background: "rgba(254,226,226,0.4)",
              color: "#991B1B",
            }}
          >
            Daily audio exists here, but none of the scheduled items are published yet.
          </p>
        )}

        {(day.hasWeeklyGap || day.hasMonthlyGap) && (
          <div
            className="rounded-xl border border-dashed px-3 py-2 text-xs"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text-subtle)" }}
          >
            {day.hasWeeklyGap && <p>No published weekly principle for this week.</p>}
            {day.hasMonthlyGap && <p>No published monthly theme for this month.</p>}
          </div>
        )}
      </div>

      {/* ── Create actions ── */}
      <div
        className="mt-3 flex flex-wrap gap-2 pt-3"
        style={{ borderTop: "1px solid var(--color-border)" }}
      >
        <Link
          href={day.createDailyHref}
          className="rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors hover:bg-muted"
          style={{
            border: "1px solid var(--color-border)",
            color: "var(--color-text-subtle)",
          }}
        >
          + Daily
        </Link>

        {day.createWeeklyHref && (
          <Link
            href={day.createWeeklyHref}
            className="rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors hover:bg-muted"
            style={{
              border: "1px solid var(--color-border)",
              color: "var(--color-text-subtle)",
            }}
          >
            + Weekly
          </Link>
        )}

        {day.createMonthlyHref && (
          <Link
            href={day.createMonthlyHref}
            className="rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors hover:bg-muted"
            style={{
              border: "1px solid var(--color-border)",
              color: "var(--color-text-subtle)",
            }}
          >
            + Monthly
          </Link>
        )}
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminContentCalendarPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const calendar = await getAdminContentCalendar(params.start);

  return (
    <div style={{ maxWidth: "90rem" }}>
      {/* ── Page header ── */}
      <div className="admin-page-header">
        <div>
          <Link
            href="/admin/content"
            className="mb-3 inline-block text-xs font-medium transition-colors"
            style={{ color: "var(--color-text-subtle)" }}
          >
            ← Content
          </Link>
          <h1 className="admin-page-header__title">Content Calendar</h1>
          <p className="admin-page-header__subtitle">
            Four-week operational view for daily coverage, weekly principles, and monthly themes.
          </p>
        </div>

        <div className="admin-page-header__actions">
          <Link
            href={`/admin/content/calendar?start=${calendar.previousStart}`}
            className="btn-ghost"
            style={{ fontSize: "0.875rem", padding: "0.5rem 0.875rem" }}
          >
            ← Previous
          </Link>
          <Link
            href="/admin/content/calendar"
            className="btn-ghost"
            style={{ fontSize: "0.875rem", padding: "0.5rem 0.875rem" }}
          >
            Today
          </Link>
          <Link
            href={`/admin/content/calendar?start=${calendar.nextStart}`}
            className="btn-ghost"
            style={{ fontSize: "0.875rem", padding: "0.5rem 0.875rem" }}
          >
            Next →
          </Link>
        </div>
      </div>

      {/* ── Range summary ── */}
      <div
        className="surface-card mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
        style={{ padding: "1.125rem 1.5rem" }}
      >
        <div>
          <p className="admin-page-header__eyebrow" style={{ marginBottom: "0.25rem" }}>
            Visible range
          </p>
          <h2
            className="font-heading font-semibold"
            style={{
              fontSize: "1.2rem",
              letterSpacing: "-0.03em",
              color: "var(--color-text-default)",
            }}
          >
            {calendar.visibleMonthSummary}
          </h2>
          <p className="text-sm" style={{ color: "var(--color-text-subtle)" }}>
            {calendar.start} through {calendar.end}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="admin-badge admin-badge--review">
            {calendar.dailyGapCount} daily gap{calendar.dailyGapCount === 1 ? "" : "s"}
          </span>
          {calendar.dailyPublishRiskCount > 0 && (
            <span className="admin-badge admin-badge--past-due">
              {calendar.dailyPublishRiskCount} day
              {calendar.dailyPublishRiskCount === 1 ? "" : "s"} not yet published
            </span>
          )}
          {calendar.weeklyGapCount > 0 && (
            <span className="admin-badge admin-badge--draft">
              {calendar.weeklyGapCount} week
              {calendar.weeklyGapCount === 1 ? "" : "s"} missing principle
            </span>
          )}
          {calendar.monthlyGapCount > 0 && (
            <span className="admin-badge admin-badge--draft">
              {calendar.monthlyGapCount} month
              {calendar.monthlyGapCount === 1 ? "" : "s"} missing theme
            </span>
          )}
        </div>
      </div>

      {/* ── Operational Focus + Legend ── */}
      <div className="mb-5 grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="surface-card" style={{ padding: "1.25rem 1.5rem" }}>
          <p className="admin-page-header__eyebrow">Operational focus</p>
          <h2
            className="mt-2 font-heading font-semibold"
            style={{
              fontSize: "1.15rem",
              letterSpacing: "-0.03em",
              color: "var(--color-text-default)",
              marginBottom: "0.5rem",
            }}
          >
            Daily coverage first
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-subtle)" }}>
            The calendar is optimized to surface missing daily audio. Weekly principles
            and monthly themes remain visible, but they stay secondary to day-by-day coverage.
          </p>
        </div>

        <div className="surface-card" style={{ padding: "1.25rem 1.5rem" }}>
          <p className="admin-page-header__eyebrow">Legend</p>
          <div className="mt-3 flex flex-col gap-2 text-sm" style={{ color: "var(--color-text-subtle)" }}>
            <span className="inline-flex items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ background: "#FCD34D" }} />
              Missing daily coverage
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ background: "#FCA5A5" }} />
              Daily scheduled but unpublished
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ background: "#6EE7B7" }} />
              Published and ready
            </span>
            <span className="inline-flex items-center gap-2">
              <span
                className="h-3 w-3 rounded-full"
                style={{ background: "var(--color-border)" }}
              />
              Draft or review content
            </span>
          </div>
        </div>
      </div>

      {/* ── Weekday row labels ── */}
      <div className="mb-3 grid grid-cols-7 gap-2">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => (
          <div
            key={label}
            className="px-2 py-1 text-center text-[11px] font-semibold uppercase tracking-wide"
            style={{ color: "var(--color-text-subtle)" }}
          >
            {label}
          </div>
        ))}
      </div>

      {/* ── Calendar grid ── */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-7">
        {calendar.days.map((day) => (
          <DayCell key={day.date} day={day} />
        ))}
      </div>
    </div>
  );
}
