import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { togglePublish } from "./actions";
import type { Tables } from "@/types/supabase";

/**
 * app/admin/content/page.tsx
 * Admin content list — Sprint 4 rebuild.
 *
 * Uses real schema fields: status, publish_date, week_start, month_year.
 * Old is_active/published_at fields are left in DB for backcompat but
 * no longer used for display or sorting here.
 *
 * Filter by type via ?type= URL param.
 * Publish toggle via server action (no page reload flicker).
 */

export const metadata = {
  title: "Content — Positives Admin",
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

const STATUS_STYLE: Record<string, string> = {
  published: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  draft: "bg-muted text-muted-foreground",
  ready_for_review: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  archived: "bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400",
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
  // publish_date, week_start are DATE strings (YYYY-MM-DD) — parse at noon to avoid TZ shift
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
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground tracking-[-0.02em] mb-1">
            Content
          </h1>
          <p className="text-muted-foreground text-sm">
            {content.length} record{content.length !== 1 ? "s" : ""}
            {typeFilter ? ` · ${formatType(typeFilter)}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/content/calendar"
            className="px-4 py-2 rounded border border-border text-muted-foreground font-medium text-sm hover:text-foreground hover:bg-muted transition-colors"
          >
            Calendar
          </Link>
          <Link
            href="/admin/content/new"
            className="px-4 py-2 rounded bg-primary text-primary-foreground font-medium text-sm hover:bg-primary-hover transition-colors shadow-soft"
          >
            + New content
          </Link>
        </div>
      </div>

      {/* Success / error banners */}
      {params.success && (
        <div className="bg-green-100 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300 text-sm rounded-lg p-4 mb-6">
          {params.success === "created"
            ? "Content created."
            : params.success === "updated"
              ? "Content updated."
              : "Done."}
        </div>
      )}
      {(params.error || error) && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg p-4 mb-6">
          {error?.message ?? "Something went wrong — check server logs."}
        </div>
      )}

      {/* Type filter tabs */}
      <div className="flex gap-1 mb-5 bg-muted p-1 rounded-xl w-fit">
        {TYPE_FILTERS.map(({ label, value }) => (
          <Link
            key={value}
            href={value ? `/admin/content?type=${value}` : "/admin/content"}
            className={[
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
              typeFilter === value
                ? "bg-card text-foreground shadow-soft"
                : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Table */}
      {content.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-12 text-center">
          <p className="text-muted-foreground text-sm mb-1">No content yet</p>
          <p className="text-xs text-muted-foreground mb-4">
            Create your first {typeFilter ? formatType(typeFilter).toLowerCase() : "content"} record.
          </p>
          <Link
            href="/admin/content/new"
            className="text-sm text-primary hover:text-primary-hover transition-colors font-medium"
          >
            + New content →
          </Link>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                  Title
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide hidden md:table-cell">
                  Type
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                  Status
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide hidden sm:table-cell">
                  Date
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {content.map((row, i) => (
                <tr
                  key={row.id}
                  className={`border-b border-border last:border-0 hover:bg-muted/20 transition-colors ${
                    i % 2 === 0 ? "" : "bg-muted/10"
                  }`}
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/content/${row.id}/edit`}
                      className="font-medium text-foreground hover:text-primary transition-colors line-clamp-1 block"
                    >
                      {row.title}
                    </Link>
                    {row.excerpt && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {row.excerpt}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-xs text-muted-foreground">
                      {formatType(row.type)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium ${
                        STATUS_STYLE[row.status] ?? STATUS_STYLE.draft
                      }`}
                    >
                      {STATUS_LABEL[row.status] ?? row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs hidden sm:table-cell tabular-nums">
                    {effectiveDateLabel(row)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/admin/content/${row.id}/edit`}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Edit
                      </Link>
                      <form action={togglePublish}>
                        <input type="hidden" name="id" value={row.id} />
                        <input type="hidden" name="current_status" value={row.status} />
                        <button
                          type="submit"
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
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
