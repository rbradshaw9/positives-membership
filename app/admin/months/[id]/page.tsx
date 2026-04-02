import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getAdminMonthDetail,
  getUnassignedDailyAudios,
} from "@/lib/queries/get-admin-month-detail";
import {
  updateMonthlyPractice,
  publishEntireMonth,
  assignDailyAudio,
  unassignDailyAudio,
} from "../actions";

/**
 * app/admin/months/[id]/page.tsx
 * Month Workspace — the single-screen command center for a month.
 *
 * Sections:
 *   1. Header with label, status, bulk actions
 *   2. Stats ribbon
 *   3. Theme + description editor
 *   4. Weekly reflections list
 *   5. Daily slot calendar grid
 */

export const metadata = {
  title: "Month Workspace — Positives Admin",
};

const STATUS_STYLE: Record<string, string> = {
  published:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  draft: "bg-muted text-muted-foreground",
  ready_for_review:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  archived:
    "bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400",
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
    <div className="max-w-5xl">
      {/* Breadcrumb */}
      <nav className="text-xs text-muted-foreground mb-4">
        <Link
          href="/admin/months"
          className="hover:text-foreground transition-colors"
        >
          Months
        </Link>
        <span className="mx-1.5">›</span>
        <span className="text-foreground">{month.label}</span>
      </nav>

      {/* Success / error banners */}
      {sp.success && (
        <div className="bg-green-100 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300 text-sm rounded-lg p-4 mb-4">
          {sp.success === "published"
            ? "Month and all content published."
            : sp.success === "updated"
              ? "Month updated."
              : "Done."}
        </div>
      )}
      {sp.error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg p-4 mb-4">
          Something went wrong — check server logs.
        </div>
      )}

      {/* ─── Section 1: Header ─── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground tracking-[-0.02em] mb-1">
            {month.label}
          </h1>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium ${
                STATUS_STYLE[month.status] ?? STATUS_STYLE.draft
              }`}
            >
              {STATUS_LABEL[month.status] ?? month.status}
            </span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {month.month_year}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {month.status !== "published" && (
            <form action={publishEntireMonth}>
              <input type="hidden" name="id" value={month.id} />
              <button
                type="submit"
                className="px-4 py-2 rounded bg-green-600 text-white font-medium text-sm hover:bg-green-700 transition-colors shadow-soft"
              >
                Publish All
              </button>
            </form>
          )}
        </div>
      </div>

      {/* ─── Section 2: Stats Ribbon ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          {
            label: "Daily Fill",
            value: `${filledSlots}/${totalSlots}`,
            sub: `${fillPct}%`,
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
          <div
            key={stat.label}
            className="bg-card border border-border rounded-lg px-4 py-3"
          >
            <p className="text-xs text-muted-foreground mb-0.5">
              {stat.label}
            </p>
            <p className="text-lg font-semibold text-foreground tabular-nums">
              {stat.value}
            </p>
            <p className="text-xs text-muted-foreground">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* ─── Section 3: Description + Notes ─── */}
      <div className="bg-card border border-border rounded-lg p-5 mb-6">
        <h2 className="font-semibold text-sm text-foreground mb-3">
          Month Details
        </h2>
        <form action={updateMonthlyPractice}>
          <input type="hidden" name="id" value={month.id} />
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">
                Description
              </label>
              <textarea
                name="description"
                rows={3}
                defaultValue={month.description ?? ""}
                placeholder="Month description (optional)…"
                className="w-full bg-muted border border-border rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">
                Admin Notes
              </label>
              <textarea
                name="admin_notes"
                rows={3}
                defaultValue={month.admin_notes ?? ""}
                placeholder="Internal notes…"
                className="w-full bg-muted border border-border rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none"
              />
            </div>
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded bg-primary text-primary-foreground font-medium text-sm hover:bg-primary-hover transition-colors shadow-soft"
          >
            Save Details
          </button>
        </form>
      </div>

      {/* ─── Section 4: Theme + Weekly Reflections ─── */}
      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        {/* Theme */}
        <div className="bg-card border border-border rounded-lg p-5">
          <h2 className="font-semibold text-sm text-foreground mb-3">
            Monthly Theme
          </h2>
          {month.theme ? (
            <div>
              <Link
                href={`/admin/content/${month.theme.id}/edit`}
                className="font-medium text-foreground hover:text-primary transition-colors text-sm"
              >
                {month.theme.title}
              </Link>
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-sm font-medium ${
                    STATUS_STYLE[month.theme.status] ?? STATUS_STYLE.draft
                  }`}
                >
                  {STATUS_LABEL[month.theme.status] ?? month.theme.status}
                </span>
                <span className="tabular-nums">
                  👁 {month.theme.views}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No theme assigned.{" "}
              <Link
                href="/admin/content/new"
                className="text-primary hover:text-primary-hover transition-colors"
              >
                Create one →
              </Link>
            </p>
          )}
        </div>

        {/* Weekly Reflections */}
        <div className="bg-card border border-border rounded-lg p-5">
          <h2 className="font-semibold text-sm text-foreground mb-3">
            Weekly Reflections
          </h2>
          {month.weeklyReflections.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No weekly reflections yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {month.weeklyReflections.map((w) => (
                <li key={w.id} className="flex items-center justify-between">
                  <Link
                    href={`/admin/content/${w.id}/edit`}
                    className="text-sm text-foreground hover:text-primary transition-colors line-clamp-1"
                  >
                    {w.title}
                  </Link>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0 ml-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-sm font-medium ${
                        STATUS_STYLE[w.status] ?? STATUS_STYLE.draft
                      }`}
                    >
                      {STATUS_LABEL[w.status] ?? w.status}
                    </span>
                    <span className="tabular-nums">👁 {w.views}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ─── Section 5: Daily Audio Calendar Grid ─── */}
      <div className="bg-card border border-border rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-sm text-foreground">
            Daily Audio Grid
          </h2>
          <span className="text-xs text-muted-foreground tabular-nums">
            {filledSlots}/{totalSlots} filled ({fillPct}%)
          </span>
        </div>

        {/* Fill progress bar */}
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden mb-5">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${fillPct}%` }}
          />
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7 gap-1.5">
          {/* Weekday headers */}
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div
              key={d}
              className="text-center text-[10px] text-muted-foreground font-medium py-1"
            >
              {d}
            </div>
          ))}

          {/* Leading empty cells for offset */}
          {(() => {
            const firstSlot = month.dailySlots[0];
            if (!firstSlot) return null;
            const dayIndex = [
              "Sun",
              "Mon",
              "Tue",
              "Wed",
              "Thu",
              "Fri",
              "Sat",
            ].indexOf(firstSlot.weekday);
            return Array.from({ length: dayIndex }, (_, i) => (
              <div key={`empty-${i}`} />
            ));
          })()}

          {/* Day cells */}
          {month.dailySlots.map((slot) => {
            const filled = slot.content !== null;
            return (
              <div
                key={slot.date}
                className={`relative rounded-md border text-center p-1.5 min-h-[60px] flex flex-col items-center justify-between transition-colors ${
                  filled
                    ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10"
                    : "border-border bg-muted/30 hover:bg-muted/60"
                }`}
              >
                <span className="text-[11px] text-muted-foreground tabular-nums font-medium">
                  {slot.dayOfMonth}
                </span>

                {filled ? (
                  <div className="w-full mt-1">
                    <Link
                      href={`/admin/content/${slot.content!.id}/edit`}
                      className="text-[9px] text-foreground hover:text-primary transition-colors leading-tight line-clamp-2 block"
                      title={slot.content!.title}
                    >
                      {slot.content!.title}
                    </Link>
                    <div className="flex items-center justify-center gap-1 mt-0.5 text-[9px] text-muted-foreground">
                      <span>🎧{slot.content!.listens}</span>
                      <span>📝{slot.content!.notes}</span>
                    </div>
                    <form action={unassignDailyAudio} className="mt-0.5">
                      <input
                        type="hidden"
                        name="content_id"
                        value={slot.content!.id}
                      />
                      <input
                        type="hidden"
                        name="month_id"
                        value={month.id}
                      />
                      <button
                        type="submit"
                        className="text-[9px] text-destructive/60 hover:text-destructive transition-colors"
                        title="Remove from this date"
                      >
                        ✕
                      </button>
                    </form>
                  </div>
                ) : (
                  <div className="w-full mt-1">
                    {unassigned.length > 0 ? (
                      <form
                        action={assignDailyAudio}
                        className="flex flex-col items-center gap-0.5"
                      >
                        <input
                          type="hidden"
                          name="month_id"
                          value={month.id}
                        />
                        <input
                          type="hidden"
                          name="publish_date"
                          value={slot.date}
                        />
                        <input
                          type="hidden"
                          name="month_year"
                          value={month.month_year}
                        />
                        <select
                          name="content_id"
                          required
                          className="w-full text-[9px] bg-transparent border-none text-muted-foreground cursor-pointer text-center"
                          defaultValue=""
                        >
                          <option value="" disabled>
                            pick…
                          </option>
                          {unassigned.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.title.length > 28
                                ? a.title.slice(0, 28) + "…"
                                : a.title}
                            </option>
                          ))}
                        </select>
                        <button
                          type="submit"
                          className="text-[9px] text-primary hover:text-primary-hover transition-colors font-medium"
                        >
                          + Assign
                        </button>
                      </form>
                    ) : (
                      <span className="text-[9px] text-muted-foreground">
                        —
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
