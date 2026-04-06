import Link from "next/link";
import { getAdminMonths } from "@/lib/queries/get-admin-months";
import { createMonthlyPractice } from "./actions";

/**
 * app/admin/months/page.tsx
 * Admin month list — redesigned with admin-* CSS system.
 */

export const metadata = {
  title: "Months — Positives Admin",
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

type SearchParams = Promise<{ success?: string; error?: string }>;

export default async function AdminMonthsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const months = await getAdminMonths();

  return (
    <div style={{ maxWidth: "56rem" }}>
      {/* Page header */}
      <div
        className="admin-page-header"
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <div>
          <p className="admin-page-header__eyebrow">Content</p>
          <h1 className="admin-page-header__title">Months</h1>
          <p className="admin-page-header__subtitle">
            {months.length} month{months.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* New month form */}
        <form action={createMonthlyPractice} className="admin-page-header__actions">
          <input
            type="month"
            name="month_year"
            required
            style={{
              background: "var(--color-card)",
              border: "1px solid var(--color-border)",
              borderRadius: "0.5rem",
              padding: "0.5rem 0.75rem",
              fontSize: "0.875rem",
              color: "var(--color-foreground)",
              colorScheme: "dark",
            }}
          />
          <button type="submit" className="admin-btn admin-btn--primary">
            + New month
          </button>
        </form>
      </div>

      {/* Banners */}
      {params.success && (
        <div
          style={{
            background: "rgba(34,197,94,0.08)",
            border: "1px solid rgba(34,197,94,0.2)",
            color: "#15803d",
            fontSize: "0.875rem",
            borderRadius: "0.625rem",
            padding: "0.875rem 1rem",
            marginBottom: "1.25rem",
          }}
        >
          {params.success === "published"
            ? "Month published."
            : params.success === "updated"
              ? "Month updated."
              : "Done."}
        </div>
      )}
      {params.error && (
        <div
          style={{
            background: "rgba(239,68,68,0.06)",
            border: "1px solid rgba(239,68,68,0.15)",
            color: "#dc2626",
            fontSize: "0.875rem",
            borderRadius: "0.625rem",
            padding: "0.875rem 1rem",
            marginBottom: "1.25rem",
          }}
        >
          {params.error === "invalid_month"
            ? "Invalid month format — use YYYY-MM."
            : params.error === "create_failed"
              ? "Failed to create month."
              : "Something went wrong."}
        </div>
      )}

      {/* Month cards */}
      {months.length === 0 ? (
        <div
          className="admin-table-wrap"
          style={{ padding: "3rem", textAlign: "center" }}
        >
          <p style={{ fontSize: "0.875rem", color: "var(--color-muted-fg)", marginBottom: "0.375rem" }}>
            No months yet
          </p>
          <p style={{ fontSize: "0.75rem", color: "var(--color-muted-fg)" }}>
            Use the date picker above to create your first month.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: "1rem",
          }}
        >
          {months.map((month) => {
            const fillPct =
              month.daily_total > 0
                ? Math.round((month.daily_count / month.daily_total) * 100)
                : 0;

            return (
              <Link
                key={month.id}
                href={`/admin/months/${month.id}`}
                className="admin-month-card"
              >
                {/* Label + status */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "0.875rem",
                  }}
                >
                  <h2 className="admin-month-card__title">{month.label}</h2>
                  <span
                    className={STATUS_BADGE[month.status] ?? STATUS_BADGE.draft}
                  >
                    {STATUS_LABEL[month.status] ?? month.status}
                  </span>
                </div>

                {/* Content fill bar */}
                <div style={{ marginBottom: "0.875rem" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      fontSize: "0.6875rem",
                      color: "var(--color-muted-fg)",
                      marginBottom: "0.375rem",
                    }}
                  >
                    <span>Daily: {month.daily_count}/{month.daily_total}</span>
                    <span>{fillPct}%</span>
                  </div>
                  <div
                    style={{
                      height: "4px",
                      width: "100%",
                      background: "var(--color-muted)",
                      borderRadius: "999px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${fillPct}%`,
                        background:
                          fillPct === 100
                            ? "var(--color-primary)"
                            : "linear-gradient(90deg, var(--color-primary), var(--color-secondary))",
                        borderRadius: "999px",
                        transition: "width 400ms ease",
                      }}
                    />
                  </div>
                </div>

                {/* Stats row */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                    fontSize: "0.75rem",
                    color: "var(--color-muted-fg)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  <span>{month.weekly_count} weekly</span>
                  <span>{month.monthly_theme_count === 0 ? "No theme" : "Theme ✓"}</span>
                </div>

                {/* Analytics row */}
                {(month.unique_listeners > 0 ||
                  month.total_listens > 0 ||
                  month.total_notes > 0) && (
                  <div
                    style={{
                      marginTop: "0.875rem",
                      paddingTop: "0.875rem",
                      borderTop: "1px solid var(--color-border)",
                      display: "flex",
                      alignItems: "center",
                      gap: "1rem",
                      fontSize: "0.75rem",
                      color: "var(--color-muted-fg)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    <span>🎧 {month.unique_listeners}</span>
                    <span>▶ {month.total_listens}</span>
                    <span>📝 {month.total_notes}</span>
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
