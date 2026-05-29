import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getAdminMonthDetail,
  getUnassignedDailyAudios,
} from "@/lib/queries/get-admin-month-detail";
import {
  updateMonthlyPractice,
  publishEntireMonth,
  createOrUpdateMasterclass,
  createOrUpdateWeekly,
  bulkCreateWeeklyPrinciples,
  quickCreateDaily,
} from "../actions";
import { DailyAudioGrid } from "./DailyAudioGrid";
import { MonthlyMasterclassEditor } from "./MonthlyMasterclassEditor";
import { MonthNotesEditor } from "./MonthNotesEditor";
import { WeeklyReflectionSection } from "./WeeklyReflectionSection";
import type { WeekSlot } from "./WeeklyReflectionSection";
import { getEffectiveMonthYear } from "@/lib/dates/effective-date";

/**
 * app/admin/months/[id]/page.tsx
 * Month Workspace — the single-screen command center for a month.
 *
 * Inline editing for:
 *   1. Monthly theme (create / edit in-place)
 *   2. Weekly principles (per-week inline forms)
 *   3. Daily audio (existing grid + quick-add support)
 */

export const metadata = {
  title: "Month Workspace — Positives Admin",
};

const STATUS_BADGE: Record<string, string> = {
  published: "admin-badge admin-badge--published",
  draft: "admin-badge admin-badge--draft",
  ready_for_review: "admin-badge admin-badge--review",
  archived: "admin-badge admin-badge--archived",
};

const STATUS_LABEL: Record<string, string> = {
  published: "Published",
  draft: "Draft",
  ready_for_review: "Review",
  archived: "Archived",
};

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ success?: string; error?: string }>;

/** Calculate all Monday week-starts that overlap with a month  */
function getWeekSlots(monthYear: string): Omit<WeekSlot, "content">[] {
  const [year, mon] = monthYear.split("-").map(Number);
  const firstDay = new Date(year, mon - 1, 1);
  const lastDay = new Date(year, mon, 0);

  // Find the Monday on or before the 1st
  const startDate = new Date(firstDay);
  const dayOfWeek = startDate.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  startDate.setDate(startDate.getDate() + diff);

  const slots: Omit<WeekSlot, "content">[] = [];
  let weekNum = 1;
  const cursor = new Date(startDate);

  while (cursor <= lastDay) {
    const weekStart = cursor.toISOString().slice(0, 10);
    const weekLabel = cursor.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    slots.push({ weekNumber: weekNum, weekStart, weekLabel });
    cursor.setDate(cursor.getDate() + 7);
    weekNum++;
  }

  return slots;
}

export default async function MonthWorkspacePage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const [month, unassigned] = await Promise.all([
    getAdminMonthDetail(id),
    getUnassignedDailyAudios(),
  ]);

  if (!month) return notFound();

  const filledSlots = month.dailySlots.filter((s) => s.content !== null).length;
  const totalSlots = month.dailySlots.length;
  const fillPct =
    totalSlots > 0 ? Math.round((filledSlots / totalSlots) * 100) : 0;
  const effectiveMonthYear = getEffectiveMonthYear();
  const memberPreviewHref =
    month.month_year === effectiveMonthYear
      ? "/today"
      : month.month_year < effectiveMonthYear
        ? `/library/months/${month.month_year}`
        : null;

  // Build week slots and match with existing weekly reflections
  const rawWeekSlots = getWeekSlots(month.month_year);
  const weeklyByDate = new Map(
    month.weeklyReflections.map((w) => [w.week_start, w])
  );
  const weekSlots: WeekSlot[] = rawWeekSlots.map((slot) => ({
    ...slot,
    content: weeklyByDate.get(slot.weekStart) ?? null,
  }));

  // Readiness alerts specific to this month
  const alerts: { level: string; message: string }[] = [];
  if (!month.theme) {
    alerts.push({ level: "warning", message: "No monthly theme created" });
  }
  const filledWeeks = weekSlots.filter((w) => w.content).length;
  if (filledWeeks === 0) {
    alerts.push({ level: "warning", message: "No weekly principles added" });
  } else if (filledWeeks < weekSlots.length) {
    alerts.push({
      level: "info",
      message: `${filledWeeks} of ${weekSlots.length} weekly principles filled`,
    });
  }
  if (fillPct < 50) {
    alerts.push({
      level: fillPct === 0 ? "warning" : "info",
      message: `Daily audio: ${filledSlots}/${totalSlots} (${fillPct}%)`,
    });
  }

  const setupItems = [
    {
      label: "Monthly theme",
      href: "#monthly-theme",
      value: month.theme ? "Ready" : "Needed",
      detail: month.theme?.title ?? "Add the guiding theme for this month.",
      complete: Boolean(month.theme),
    },
    {
      label: "Weekly principles",
      href: "#weekly-principles",
      value: `${filledWeeks}/${weekSlots.length}`,
      detail: filledWeeks === weekSlots.length ? "Each week has a reflection." : "Fill the remaining weekly reflections.",
      complete: filledWeeks === weekSlots.length,
    },
    {
      label: "Daily audio",
      href: "#daily-audio",
      value: `${filledSlots}/${totalSlots}`,
      detail: `${fillPct}% of daily practices are scheduled.`,
      complete: filledSlots === totalSlots,
    },
  ];
  const completedSetupItems = setupItems.filter((item) => item.complete).length;
  const nextSetupItem = setupItems.find((item) => !item.complete);

  return (
    <div className="admin-month-workspace">
      {/* Breadcrumb */}
      <Link href="/admin/months" className="admin-back-link">
        Back to Practice Content
      </Link>

      {/* Success / error banners */}
      {sp.success && (
        <div className="admin-banner admin-banner--success">
          {sp.success === "published"
            ? "Month and all content published."
            : sp.success === "updated"
              ? "Changes saved."
              : sp.success === "weekly_created"
                ? "Weekly principle drafts created."
              : "Done."}
        </div>
      )}
      {sp.error && (
        <div className="admin-banner admin-banner--error">
          Something went wrong — check server logs.
        </div>
      )}

      <div className="admin-page-header admin-page-header--split">
        <div>
          <p className="admin-page-header__eyebrow">Practice Content</p>
          <h1 className="admin-page-header__title" style={{ textWrap: "balance" }}>
            {month.label}
          </h1>
          <p className="admin-page-header__subtitle" style={{ marginTop: "0.5rem" }}>
            Manage this month&apos;s theme, weekly principles, and daily audio in one place.
          </p>
          <div className="admin-month-status-row">
            <span className={STATUS_BADGE[month.status] ?? STATUS_BADGE.draft}>
              {STATUS_LABEL[month.status] ?? month.status}
            </span>
            <span className="admin-month-year-label">
              {month.month_year}
            </span>
          </div>
        </div>

        <div className="admin-page-header__actions">
          {memberPreviewHref ? (
            <Link href={memberPreviewHref} className="admin-btn admin-btn--outline" target="_blank" rel="noopener noreferrer">
              Preview member view
            </Link>
          ) : (
            <span className="admin-month-preview-note">Preview opens when this month is active.</span>
          )}
          {month.status !== "published" && (
            <form action={publishEntireMonth}>
              <input type="hidden" name="id" value={month.id} />
              <button type="submit" className="admin-btn admin-btn--primary">
                Publish month
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="admin-month-guide">
        <div>
          <p className="admin-month-guide__eyebrow">Setup progress</p>
          <h2 className="admin-month-guide__title">
            {completedSetupItems}/{setupItems.length} areas ready
          </h2>
          <p className="admin-month-guide__copy">
            {nextSetupItem
              ? `Next: ${nextSetupItem.detail}`
              : "This month has the core content pieces in place."}
          </p>
        </div>
        <div className="admin-month-guide__nav" aria-label="Month setup sections">
          {setupItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className={item.complete ? "is-complete" : ""}
              aria-label={`${item.label}: ${item.value}. ${item.detail}`}
            >
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </a>
          ))}
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="admin-month-alerts">
          {alerts.map((a, i) => (
            <div
              key={i}
              className={a.level === "warning" ? "admin-month-alert is-warning" : "admin-month-alert"}
            >
              <span>{a.message}</span>
            </div>
          ))}
        </div>
      )}

      <div className="admin-month-metrics">
        {[
          {
            label: "Unique Listeners",
            value: month.stats.unique_listeners.toLocaleString(),
          },
          {
            label: "Total Listens",
            value: month.stats.total_listens.toLocaleString(),
          },
          {
            label: "Journal Notes",
            value: month.stats.total_notes.toLocaleString(),
          },
        ].map((stat) => (
          <div key={stat.label} className="admin-month-metric">
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
          </div>
        ))}
      </div>

      <div id="monthly-theme" className="admin-anchor-section">
        <MonthlyMasterclassEditor
          monthId={month.id}
          monthYear={month.month_year}
          existing={month.theme}
          action={createOrUpdateMasterclass}
        />
      </div>
      <div id="weekly-principles" className="admin-anchor-section">
        <WeeklyReflectionSection
          monthId={month.id}
          monthYear={month.month_year}
          weekSlots={weekSlots}
          action={createOrUpdateWeekly}
          bulkAction={bulkCreateWeeklyPrinciples}
        />
      </div>

      <MonthNotesEditor
        action={updateMonthlyPractice}
        adminNotes={month.admin_notes}
        description={month.description}
        monthId={month.id}
      />

      <div id="daily-audio" className="admin-anchor-section">
        <DailyAudioGrid
          monthId={month.id}
          monthYear={month.month_year}
          dailySlots={month.dailySlots}
          unassigned={unassigned}
          quickCreateAction={quickCreateDaily}
        />
      </div>
    </div>
  );
}
