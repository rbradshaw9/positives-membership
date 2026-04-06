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
    alerts.push({ level: "warning", message: "No monthly masterclass created" });
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

  return (
    <div style={{ maxWidth: "60rem" }}>
      {/* Breadcrumb */}
      <Link href="/admin/months" className="admin-back-link">
        ← Monthly Setup
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

      {/* ─── Header ─── */}
      <div className="admin-page-header admin-page-header--split">
        <div>
          <p className="admin-page-header__eyebrow">Month Workspace</p>
          <h1 className="admin-page-header__title">{month.label}</h1>
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
                Publish All
              </button>
            </form>
          )}
        </div>
      </div>

      {/* ─── Readiness Alerts ─── */}
      {alerts.length > 0 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.375rem",
            marginBottom: "1.25rem",
          }}
        >
          {alerts.map((a, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem 0.875rem",
                borderRadius: "0.5rem",
                fontSize: "0.75rem",
                background:
                  a.level === "warning"
                    ? "rgba(245,158,11,0.06)"
                    : "rgba(68,168,216,0.06)",
                border: `1px solid ${
                  a.level === "warning"
                    ? "rgba(245,158,11,0.18)"
                    : "rgba(68,168,216,0.15)"
                }`,
                color:
                  a.level === "warning" ? "#d97706" : "var(--color-muted-fg)",
              }}
            >
              <span>{a.level === "warning" ? "⚠️" : "ℹ️"}</span>
              <span>{a.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* ─── Stats Ribbon ─── */}
      <div className="admin-stats-ribbon">
        {[
          {
            label: "Daily Fill",
            value: `${filledSlots}/${totalSlots}`,
            sub: `${fillPct}% complete`,
          },
          {
            label: "Unique Listeners",
            value: month.stats.unique_listeners.toLocaleString(),
            sub: "members",
          },
          {
            label: "Total Listens",
            value: month.stats.total_listens.toLocaleString(),
            sub: "plays",
          },
          {
            label: "Journal Notes",
            value: month.stats.total_notes.toLocaleString(),
            sub: "entries",
          },
        ].map((stat) => (
          <div key={stat.label} className="admin-stat-card">
            <p className="admin-stat-card__value">{stat.value}</p>
            <p className="admin-stat-card__label">{stat.label}</p>
            <p className="admin-stat-card__delta">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* ─── Monthly Masterclass (inline) ─── */}
      <MonthlyMasterclassEditor
        monthId={month.id}
        monthYear={month.month_year}
        existing={month.theme}
        action={createOrUpdateMasterclass}
      />

      {/* ─── Weekly Reflections (inline) ─── */}
      <WeeklyReflectionSection
        monthId={month.id}
        monthYear={month.month_year}
        weekSlots={weekSlots}
        action={createOrUpdateWeekly}
      />

      {/* ─── Month Details ─── */}
      <div className="admin-section" style={{ marginBottom: "1.5rem" }}>
        <div className="admin-section__header">
          <span className="admin-section__title">⚙️ Month Details</span>
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

      {/* ─── Daily Audio Calendar Grid ─── */}
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
