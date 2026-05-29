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
  quickCreateDaily,
} from "../actions";
import { DailyAudioGrid } from "./DailyAudioGrid";
import { BulkAudioUploader } from "@/components/admin/BulkAudioUploader";
import { MonthlyMasterclassEditor } from "./MonthlyMasterclassEditor";
import { WeeklyReflectionSection } from "./WeeklyReflectionSection";
import type { WeekSlot } from "./WeeklyReflectionSection";

/**
 * app/admin/months/[id]/page.tsx
 * Month Workspace — the single-screen command center for a month.
 *
 * Inline editing for:
 *   1. Monthly masterclass (create / edit in-place)
 *   2. Weekly reflections (per-week inline forms)
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
    alerts.push({ level: "warning", message: "No weekly reflections added" });
  } else if (filledWeeks < weekSlots.length) {
    alerts.push({
      level: "info",
      message: `${filledWeeks} of ${weekSlots.length} weekly reflections filled`,
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
      value: month.theme ? "Ready" : "Needed",
      detail: month.theme?.title ?? "Add the guiding theme for this month.",
      complete: Boolean(month.theme),
    },
    {
      label: "Weekly principles",
      value: `${filledWeeks}/${weekSlots.length}`,
      detail: filledWeeks === weekSlots.length ? "Each week has a reflection." : "Fill the remaining weekly reflections.",
      complete: filledWeeks === weekSlots.length,
    },
    {
      label: "Daily audio",
      value: `${filledSlots}/${totalSlots}`,
      detail: `${fillPct}% of daily practices are scheduled.`,
      complete: filledSlots === totalSlots,
    },
  ];

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

      <div className="admin-month-setup-grid">
        {setupItems.map((item) => (
          <div key={item.label} className={item.complete ? "admin-month-setup-card is-complete" : "admin-month-setup-card"}>
            <div className="admin-month-setup-card__topline">
              <span>{item.label}</span>
              <span>{item.value}</span>
            </div>
            <p>{item.detail}</p>
          </div>
        ))}
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

      <MonthlyMasterclassEditor
        monthId={month.id}
        monthYear={month.month_year}
        existing={month.theme}
        action={createOrUpdateMasterclass}
      />
      <WeeklyReflectionSection
        monthId={month.id}
        monthYear={month.month_year}
        weekSlots={weekSlots}
        action={createOrUpdateWeekly}
      />

      <div className="admin-section" style={{ marginBottom: "1.5rem" }}>
        <div className="admin-section__header">
          <div>
            <span className="admin-section__title">Month notes</span>
            <p className="admin-section__subtitle">Optional context for the month record and internal planning.</p>
          </div>
        </div>
        <div className="admin-section__body">
          <form action={updateMonthlyPractice}>
            <input type="hidden" name="id" value={month.id} />
            <div className="admin-form-grid-2" style={{ marginBottom: "1rem" }}>
              <div className="admin-form-field">
                <label className="admin-form-section__label">Description</label>
                <textarea
                  name="description"
                  rows={3}
                  defaultValue={month.description ?? ""}
                  placeholder="Month description (optional)…"
                  className="admin-textarea admin-textarea--no-resize"
                />
              </div>
              <div className="admin-form-field">
                <label className="admin-form-section__label">Admin Notes</label>
                <textarea
                  name="admin_notes"
                  rows={3}
                  defaultValue={month.admin_notes ?? ""}
                  placeholder="Internal notes…"
                  className="admin-textarea admin-textarea--no-resize"
                />
              </div>
            </div>
            <button type="submit" className="admin-btn admin-btn--primary">
              Save Details
            </button>
          </form>
        </div>
      </div>

      <BulkAudioUploader
        monthId={month.id}
        monthYear={month.month_year}
        openDates={month.dailySlots
          .filter((s) => s.content === null)
          .map((s) => s.date)}
      />
      <DailyAudioGrid
        monthId={month.id}
        monthYear={month.month_year}
        dailySlots={month.dailySlots}
        unassigned={unassigned}
        quickCreateAction={quickCreateDaily}
      />
    </div>
  );
}
