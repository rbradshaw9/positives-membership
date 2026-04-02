import Link from "next/link";
import { getAdminMonths } from "@/lib/queries/get-admin-months";
import { createMonthlyPractice } from "./actions";

/**
 * app/admin/months/page.tsx
 * Admin month list — card grid with inline analytics.
 *
 * Displays all monthly_practice rows, newest first.
 * Each card shows: label, content fill bar, and key stats.
 * "+ New month" creates a month via server action.
 */

export const metadata = {
  title: "Months — Positives Admin",
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

type SearchParams = Promise<{ success?: string; error?: string }>;

export default async function AdminMonthsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const months = await getAdminMonths();

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground tracking-[-0.02em] mb-1">
            Months
          </h1>
          <p className="text-muted-foreground text-sm">
            {months.length} month{months.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* New month form */}
        <form action={createMonthlyPractice} className="flex items-center gap-2">
          <input
            type="month"
            name="month_year"
            required
            className="bg-card border border-border rounded px-3 py-2 text-sm text-foreground"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded bg-primary text-primary-foreground font-medium text-sm hover:bg-primary-hover transition-colors shadow-soft"
          >
            + New month
          </button>
        </form>
      </div>

      {/* Banners */}
      {params.success && (
        <div className="bg-green-100 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300 text-sm rounded-lg p-4 mb-6">
          {params.success === "published"
            ? "Month published."
            : params.success === "updated"
              ? "Month updated."
              : "Done."}
        </div>
      )}
      {params.error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg p-4 mb-6">
          {params.error === "invalid_month"
            ? "Invalid month format — use YYYY-MM."
            : params.error === "create_failed"
              ? "Failed to create month."
              : "Something went wrong."}
        </div>
      )}

      {/* Month cards */}
      {months.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-12 text-center">
          <p className="text-muted-foreground text-sm mb-1">No months yet</p>
          <p className="text-xs text-muted-foreground">
            Use the date picker above to create your first month.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {months.map((month) => {
            const fillPct =
              month.daily_total > 0
                ? Math.round((month.daily_count / month.daily_total) * 100)
                : 0;

            return (
              <Link
                key={month.id}
                href={`/admin/months/${month.id}`}
                className="block bg-card border border-border rounded-lg p-5 hover:shadow-soft transition-shadow group"
              >
                {/* Label + status */}
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-base text-foreground group-hover:text-primary transition-colors">
                    {month.label}
                  </h2>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium ${
                      STATUS_STYLE[month.status] ?? STATUS_STYLE.draft
                    }`}
                  >
                    {STATUS_LABEL[month.status] ?? month.status}
                  </span>
                </div>

                {/* Content fill bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>
                      Daily: {month.daily_count}/{month.daily_total}
                    </span>
                    <span>{fillPct}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${fillPct}%` }}
                    />
                  </div>
                </div>

                {/* Stats row */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="tabular-nums">
                    {month.weekly_count} weekly
                  </span>
                  <span className="tabular-nums">
                    {month.monthly_theme_count === 0
                      ? "No theme"
                      : "Theme ✓"}
                  </span>
                </div>

                {/* Analytics row */}
                {(month.unique_listeners > 0 ||
                  month.total_listens > 0 ||
                  month.total_notes > 0) && (
                  <div className="mt-3 pt-3 border-t border-border flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="tabular-nums">
                      🎧 {month.unique_listeners}
                    </span>
                    <span className="tabular-nums">
                      ▶ {month.total_listens}
                    </span>
                    <span className="tabular-nums">
                      📝 {month.total_notes}
                    </span>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
