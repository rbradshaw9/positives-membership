import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  getMemberList,
  type MemberStatusFilter,
  type MemberTierFilter,
} from "@/lib/queries/get-admin-members";

/**
 * app/admin/members/page.tsx
 * Admin member list — Sprint 12.
 *
 * Read-only operational view. Supports search by email/name and
 * filters by subscription status and tier. Paginated (30/page).
 * Every row links to /admin/members/[id].
 *
 * Guard: requireAdmin() enforced at layout level (app/admin/layout.tsx).
 * This page calls it explicitly too for belt-and-suspenders safety since
 * the /members sub-route is new.
 */

export const metadata = {
  title: "Members — Positives Admin",
};

// ─────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────

const STATUS_STYLE: Record<string, string> = {
  active:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  past_due:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  canceled: "bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400",
  trialing: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  inactive: "bg-muted text-muted-foreground",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  past_due: "Past Due",
  canceled: "Canceled",
  trialing: "Trialing",
  inactive: "Inactive",
};

const TIER_LABEL: Record<string, string> = {
  level_1: "L1",
  level_2: "L2",
  level_3: "L3 · Coaching",
  level_4: "L4 · Executive",
};

const TIER_STYLE: Record<string, string> = {
  level_1: "bg-muted text-muted-foreground",
  level_2: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  level_3:
    "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  level_4:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

function formatRelativeDate(iso: string | null): string {
  if (!iso) return "Never";
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

const PAGE_SIZE = 30;

// ─────────────────────────────────────────────────
// Filter options
// ─────────────────────────────────────────────────

const STATUS_FILTERS: { label: string; value: MemberStatusFilter }[] = [
  { label: "All statuses", value: "" },
  { label: "Active", value: "active" },
  { label: "Past Due", value: "past_due" },
  { label: "Canceled", value: "canceled" },
  { label: "Trialing", value: "trialing" },
  { label: "Inactive", value: "inactive" },
];

const TIER_FILTERS: { label: string; value: MemberTierFilter }[] = [
  { label: "All tiers", value: "" },
  { label: "Level 1", value: "level_1" },
  { label: "Level 2", value: "level_2" },
  { label: "Level 3 · Coaching", value: "level_3" },
  { label: "Level 4 · Executive", value: "level_4" },
];

// ─────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────

type SearchParams = Promise<{
  search?: string;
  status?: string;
  tier?: string;
  page?: string;
}>;

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdmin();

  const params = await searchParams;
  const search = params.search ?? "";
  const status = (params.status ?? "") as MemberStatusFilter;
  const tier = (params.tier ?? "") as MemberTierFilter;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));

  const { members, total } = await getMemberList({ search, status, tier, page });

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Build URL for pagination/filters preserving current filters
  function buildUrl(overrides: Record<string, string>) {
    const q = new URLSearchParams();
    if (search) q.set("search", search);
    if (status) q.set("status", status);
    if (tier) q.set("tier", tier);
    q.set("page", String(page));
    for (const [k, v] of Object.entries(overrides)) {
      if (v) q.set(k, v);
      else q.delete(k);
    }
    return `/admin/members?${q.toString()}`;
  }

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1
            className="font-heading font-bold text-2xl text-foreground tracking-[-0.02em] mb-1"
            style={{ textWrap: "balance" } as React.CSSProperties}
          >
            Members
          </h1>
          <p className="text-muted-foreground text-sm">
            {total} member{total !== 1 ? "s" : ""}
            {search ? ` matching "${search}"` : ""}
            {status ? ` · ${STATUS_LABEL[status] ?? status}` : ""}
            {tier ? ` · ${TIER_LABEL[tier] ?? tier}` : ""}
          </p>
        </div>
      </div>

      {/* Search + Filters */}
      <form method="GET" action="/admin/members" className="mb-5 flex flex-wrap gap-3 items-end">
        {/* Search input */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs text-muted-foreground mb-1 font-medium">
            Search by email or name
          </label>
          <input
            type="text"
            name="search"
            defaultValue={search}
            placeholder="email or name…"
            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Status filter */}
        <div>
          <label className="block text-xs text-muted-foreground mb-1 font-medium">
            Status
          </label>
          <select
            name="status"
            defaultValue={status}
            className="px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {STATUS_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        {/* Tier filter */}
        <div>
          <label className="block text-xs text-muted-foreground mb-1 font-medium">
            Tier
          </label>
          <select
            name="tier"
            defaultValue={tier}
            className="px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {TIER_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary-hover transition-colors shadow-soft"
        >
          Filter
        </button>

        {(search || status || tier) && (
          <Link
            href="/admin/members"
            className="px-4 py-2 rounded-lg border border-border text-muted-foreground text-sm hover:text-foreground transition-colors"
          >
            Clear
          </Link>
        )}
      </form>

      {/* Member table */}
      {members.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-12 text-center">
          <p className="text-muted-foreground text-sm mb-1">No members found</p>
          {(search || status || tier) && (
            <p className="text-xs text-muted-foreground">
              Try adjusting the filters.
            </p>
          )}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                  Member
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide hidden sm:table-cell">
                  Status
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide hidden md:table-cell">
                  Tier
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide hidden lg:table-cell">
                  Streak
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide hidden md:table-cell">
                  Last Active
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide hidden lg:table-cell">
                  Joined
                </th>
              </tr>
            </thead>
            <tbody>
              {members.map((member, i) => (
                <tr
                  key={member.id}
                  className={`border-b border-border last:border-0 hover:bg-muted/20 transition-colors ${
                    i % 2 === 0 ? "" : "bg-muted/10"
                  }`}
                >
                  {/* Email + name */}
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/members/${member.id}`}
                      className="font-medium text-foreground hover:text-primary transition-colors block"
                    >
                      {member.email}
                    </Link>
                    {member.name && (
                      <span className="text-xs text-muted-foreground">
                        {member.name}
                      </span>
                    )}
                  </td>

                  {/* Subscription status */}
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium ${
                        STATUS_STYLE[member.subscription_status] ??
                        STATUS_STYLE.inactive
                      }`}
                    >
                      {STATUS_LABEL[member.subscription_status] ??
                        member.subscription_status}
                    </span>
                  </td>

                  {/* Tier */}
                  <td className="px-4 py-3 hidden md:table-cell">
                    {member.subscription_tier ? (
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium ${
                          TIER_STYLE[member.subscription_tier] ??
                          "bg-muted text-muted-foreground"
                        }`}
                      >
                        {TIER_LABEL[member.subscription_tier] ??
                          member.subscription_tier}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>

                  {/* Practice streak */}
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="text-sm font-medium tabular-nums">
                      {member.practice_streak}
                    </span>
                    <span className="text-xs text-muted-foreground ml-1">
                      {member.practice_streak === 1 ? "day" : "days"}
                    </span>
                  </td>

                  {/* Last practiced */}
                  <td className="px-4 py-3 hidden md:table-cell text-xs text-muted-foreground tabular-nums">
                    {formatRelativeDate(member.last_practiced_at)}
                  </td>

                  {/* Joined */}
                  <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground tabular-nums">
                    {formatDate(member.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted-foreground text-xs">
            Page {page} of {totalPages} · {total} total
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={buildUrl({ page: String(page - 1) })}
                className="px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground text-xs transition-colors"
              >
                ← Prev
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={buildUrl({ page: String(page + 1) })}
                className="px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground text-xs transition-colors"
              >
                Next →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
