import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { togglePublish } from "./actions";
import type { Tables } from "@/types/supabase";

/**
 * app/admin/content/page.tsx
 * Admin content list — redesigned with admin-* CSS system.
 */

export const metadata = {
  title: "Content Library — Positives Admin",
};

type ContentRow = Pick<
  Tables<"content">,
  | "id"
  | "title"
  | "type"
  | "status"
  | "publish_date"
  | "week_start"
  | "month_year"
  | "duration_seconds"
  | "excerpt"
  | "admin_notes"
>;

const TYPE_FILTERS = [
  { label: "All", value: "" },
  { label: "Daily", value: "daily_audio" },
  { label: "Weekly", value: "weekly_principle" },
  { label: "Monthly", value: "monthly_theme" },
] as const;

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

function formatType(type: string): string {
  if (type === "daily_audio") return "Daily";
  if (type === "weekly_principle") return "Weekly";
  if (type === "monthly_theme") return "Monthly";
  return type;
}

function formatDate(val: string | null): string {
  if (!val) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(val + "T12:00:00"));
}

function effectiveDateLabel(row: ContentRow): string {
  if (row.publish_date) return formatDate(row.publish_date);
  if (row.week_start) return `Wk ${formatDate(row.week_start)}`;
  if (row.month_year) {
    const [y, m] = row.month_year.split("-");
    return new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(
      new Date(parseInt(y), parseInt(m) - 1, 1)
    );
  }
  return "—";
}

type SearchParams = Promise<{ type?: string; success?: string; error?: string }>;

export default async function AdminContentPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const typeFilter = params.type ?? "";

  const supabase = await createClient();

  let query = supabase
    .from("content")
    .select(
      "id, title, type, status, publish_date, week_start, month_year, duration_seconds, excerpt, admin_notes"
    )
    .in("type", ["daily_audio", "weekly_principle", "monthly_theme"])
    .order("created_at", { ascending: false })
    .limit(100);

  if (typeFilter) {
    query = query.eq("type", typeFilter as "daily_audio" | "weekly_principle" | "monthly_theme");
  }

  const { data: rows, error } = await query;
  const content = (rows ?? []) as ContentRow[];

  return (
    <div style={{ maxWidth: "60rem" }}>
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
          <h1 className="admin-page-header__title">Library</h1>
          <p className="admin-page-header__subtitle">
            {content.length} record{content.length !== 1 ? "s" : ""}
            {typeFilter ? ` · ${formatType(typeFilter)}` : ""}
          </p>
        </div>
        <div className="admin-page-header__actions">
          <Link href="/admin/content/calendar" className="admin-btn admin-btn--outline">
            Calendar
          </Link>
          <Link href="/admin/content/new" className="admin-btn admin-btn--primary">
            + New content
          </Link>
        </div>
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
          {params.success === "created"
            ? "Content created."
            : params.success === "updated"
              ? "Content updated."
              : "Done."}
        </div>
      )}
      {(params.error || error) && (
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
          {error?.message ?? "Something went wrong — check server logs."}
        </div>
      )}

      {/* Type tabs */}
      <div
        style={{
          display: "flex",
          gap: "0.25rem",
          marginBottom: "1.25rem",
          background: "var(--color-muted)",
          padding: "0.25rem",
          borderRadius: "0.75rem",
          width: "fit-content",
        }}
      >
        {TYPE_FILTERS.map(({ label, value }) => (
          <Link
            key={value}
            href={value ? `/admin/content?type=${value}` : "/admin/content"}
            style={{
              padding: "0.375rem 0.875rem",
              borderRadius: "0.5rem",
              fontSize: "0.75rem",
              fontWeight: 600,
              transition: "background 130ms ease, color 130ms ease",
              textDecoration: "none",
              ...(typeFilter === value
                ? {
                    background: "var(--color-card)",
                    color: "var(--color-foreground)",
                    boxShadow: "var(--shadow-soft)",
                  }
                : {
                    color: "var(--color-muted-fg)",
                  }),
            }}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Table */}
      {content.length === 0 ? (
        <div
          className="admin-table-wrap"
          style={{ padding: "3rem", textAlign: "center" }}
        >
          <p style={{ fontSize: "0.875rem", color: "var(--color-muted-fg)", marginBottom: "0.625rem" }}>
            No content yet
          </p>
          <p style={{ fontSize: "0.75rem", color: "var(--color-muted-fg)", marginBottom: "1rem" }}>
            Create your first {typeFilter ? formatType(typeFilter).toLowerCase() : "content"} record.
          </p>
          <Link href="/admin/content/new" className="admin-btn admin-btn--primary">
            + New content
          </Link>
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Title</th>
                <th className="hidden md:table-cell">Type</th>
                <th>Status</th>
                <th className="hidden sm:table-cell">Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {content.map((row) => (
                <tr key={row.id}>
                  <td>
                    <Link
                      href={`/admin/content/${row.id}/edit`}
                      style={{
                        fontWeight: 600,
                        color: "var(--color-foreground)",
                        textDecoration: "none",
                        display: "block",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        maxWidth: "22rem",
                        transition: "color 120ms ease",
                      }}
                      className="hover:text-primary"
                    >
                      {row.title}
                    </Link>
                    {row.excerpt && (
                      <p
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--color-muted-fg)",
                          marginTop: "0.125rem",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          maxWidth: "22rem",
                        }}
                      >
                        {row.excerpt}
                      </p>
                    )}
                  </td>
                  <td className="hidden md:table-cell">
                    <span style={{ fontSize: "0.75rem", color: "var(--color-muted-fg)" }}>
                      {formatType(row.type)}
                    </span>
                  </td>
                  <td>
                    <span
                      className={STATUS_BADGE[row.status] ?? STATUS_BADGE.draft}
                    >
                      {STATUS_LABEL[row.status] ?? row.status}
                    </span>
                  </td>
                  <td
                    className="hidden sm:table-cell"
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--color-muted-fg)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {effectiveDateLabel(row)}
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
                      <Link
                        href={`/admin/content/${row.id}/edit`}
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--color-muted-fg)",
                          textDecoration: "none",
                          transition: "color 120ms ease",
                        }}
                        className="hover:text-foreground"
                      >
                        Edit
                      </Link>
                      <form action={togglePublish}>
                        <input type="hidden" name="id" value={row.id} />
                        <input type="hidden" name="current_status" value={row.status} />
                        <button
                          type="submit"
                          style={{
                            font: "inherit",
                            fontSize: "0.75rem",
                            color: "var(--color-muted-fg)",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: 0,
                            transition: "color 120ms ease",
                          }}
                          className="hover:text-foreground"
                        >
                          {row.status === "published" ? "Unpublish" : "Publish"}
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
