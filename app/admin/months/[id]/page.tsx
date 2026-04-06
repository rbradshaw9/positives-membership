import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getAdminMonthDetail,
  getUnassignedDailyAudios,
} from "@/lib/queries/get-admin-month-detail";
import { updateMonthlyPractice, publishEntireMonth } from "../actions";
import { DailyAudioGrid } from "./DailyAudioGrid";

/**
 * app/admin/months/[id]/page.tsx
 * Month Workspace — the single-screen command center for a month.
 *
 * Sections:
 *   1. Header with label, status, bulk actions
 *   2. Stats ribbon
 *   3. Description + admin notes editor
 *   4. Monthly theme + weekly reflections
 *   5. Daily slot calendar grid (DailyAudioGrid client component)
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

  return (
    <div style={{ maxWidth: "60rem" }}>
      {/* Breadcrumb */}
      <Link href="/admin/months" className="admin-back-link">
        ← Months
      </Link>

      {/* Success / error banners */}
      {sp.success && (
        <div className="admin-banner admin-banner--success">
          {sp.success === "published"
            ? "Month and all content published."
            : sp.success === "updated"
              ? "Month updated."
              : "Done."}
        </div>
      )}
      {sp.error && (
        <div className="admin-banner admin-banner--error">
          Something went wrong — check server logs.
        </div>
      )}

      {/* ─── Section 1: Header ─── */}
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

      {/* ─── Section 2: Stats Ribbon ─── */}
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

      {/* ─── Section 3: Description + Notes ─── */}
      <div className="admin-section" style={{ marginBottom: "1.5rem" }}>
        <div className="admin-section__header">
          <span className="admin-section__title">Month Details</span>
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

      {/* ─── Section 4: Theme + Weekly Reflections ─── */}
      <div className="admin-section-grid-2">
        {/* Theme */}
        <div className="admin-section">
          <div className="admin-section__header">
            <span className="admin-section__title">Monthly Theme</span>
          </div>
          <div className="admin-section__body">
            {month.theme ? (
              <div>
                <Link
                  href={`/admin/content/${month.theme.id}/edit`}
                  className="admin-content-link"
                >
                  {month.theme.title}
                </Link>
                <div className="admin-content-meta">
                  <span className={STATUS_BADGE[month.theme.status] ?? STATUS_BADGE.draft}>
                    {STATUS_LABEL[month.theme.status] ?? month.theme.status}
                  </span>
                  <span className="admin-content-meta__views">
                    👁 {month.theme.views}
                  </span>
                </div>
              </div>
            ) : (
              <p className="admin-hint">
                No theme assigned.{" "}
                <Link
                  href="/admin/content/new"
                  style={{ color: "var(--color-primary)", textDecoration: "none" }}
                >
                  Create one →
                </Link>
              </p>
            )}
          </div>
        </div>

        {/* Weekly Reflections */}
        <div className="admin-section">
          <div className="admin-section__header">
            <span className="admin-section__title">Weekly Reflections</span>
          </div>
          <div className="admin-section__body">
            {month.weeklyReflections.length === 0 ? (
              <p className="admin-hint">No weekly reflections yet.</p>
            ) : (
              <ul className="admin-weekly-list">
                {month.weeklyReflections.map((w) => (
                  <li key={w.id} className="admin-weekly-item">
                    <Link
                      href={`/admin/content/${w.id}/edit`}
                      className="admin-weekly-item__link"
                    >
                      {w.title}
                    </Link>
                    <div className="admin-weekly-item__meta">
                      <span className={STATUS_BADGE[w.status] ?? STATUS_BADGE.draft}>
                        {STATUS_LABEL[w.status] ?? w.status}
                      </span>
                      <span className="admin-content-meta__views">
                        👁 {w.views}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* ─── Section 5: Daily Audio Calendar Grid ─── */}
      <DailyAudioGrid
        monthId={month.id}
        monthYear={month.month_year}
        dailySlots={month.dailySlots}
        unassigned={unassigned}
      />
    </div>
  );
}
