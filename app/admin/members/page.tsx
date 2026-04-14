import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  getMemberList,
  type MemberBillingFilter,
  type MemberPasswordFilter,
  type MemberStatusFilter,
  type MemberTierFilter,
} from "@/lib/queries/get-admin-members";
import { ADMIN_PLAN_SHORT_LABEL_BY_TIER, PLAN_NAME_BY_TIER } from "@/lib/plans";

/**
 * app/admin/members/page.tsx
 * Admin member list — redesigned with admin-* CSS system.
 */

export const metadata = {
  title: "Members — Positives Admin",
};

// ─────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
  active: "admin-badge admin-badge--active",
  past_due: "admin-badge admin-badge--past-due",
  canceled: "admin-badge admin-badge--canceled",
  trialing: "admin-badge admin-badge--trialing",
  inactive: "admin-badge admin-badge--inactive",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  past_due: "Past Due",
  canceled: "Canceled",
  trialing: "Trialing",
  inactive: "Inactive",
};

const TIER_BADGE: Record<string, string> = {
  level_1: "admin-badge admin-badge--l1",
  level_2: "admin-badge admin-badge--l2",
  level_3: "admin-badge admin-badge--l3",
  level_4: "admin-badge admin-badge--l4",
};

const TIER_LABEL: Record<string, string> = ADMIN_PLAN_SHORT_LABEL_BY_TIER;

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
  { label: PLAN_NAME_BY_TIER.level_1, value: "level_1" },
  { label: PLAN_NAME_BY_TIER.level_2, value: "level_2" },
  { label: PLAN_NAME_BY_TIER.level_3, value: "level_3" },
  { label: PLAN_NAME_BY_TIER.level_4, value: "level_4" },
];

const BILLING_FILTERS: { label: string; value: MemberBillingFilter }[] = [
  { label: "All billing links", value: "" },
  { label: "Stripe linked", value: "linked" },
  { label: "Stripe missing", value: "missing" },
];

const PASSWORD_FILTERS: { label: string; value: MemberPasswordFilter }[] = [
  { label: "All password states", value: "" },
  { label: "Password set", value: "set" },
  { label: "Password missing", value: "missing" },
];

// ─────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────

type SearchParams = Promise<{
  search?: string;
  status?: string;
  tier?: string;
  billing?: string;
  password?: string;
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
  const billing = (params.billing ?? "") as MemberBillingFilter;
  const password = (params.password ?? "") as MemberPasswordFilter;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));

  const { members, total } = await getMemberList({
    search,
    status,
    tier,
    billing,
    password,
    page,
  });

  const totalPages = Math.ceil(total / PAGE_SIZE);

  function buildUrl(overrides: Record<string, string>) {
    const q = new URLSearchParams();
    if (search) q.set("search", search);
    if (status) q.set("status", status);
    if (tier) q.set("tier", tier);
    if (billing) q.set("billing", billing);
    if (password) q.set("password", password);
    q.set("page", String(page));
    for (const [k, v] of Object.entries(overrides)) {
      if (v) q.set(k, v);
      else q.delete(k);
    }
    return `/admin/members?${q.toString()}`;
  }

  return (
    <div style={{ maxWidth: "72rem" }}>
      {/* Page header */}
      <div
        className="admin-page-header"
        style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}
      >
        <div>
          <p className="admin-page-header__eyebrow">Management</p>
          <h1 className="admin-page-header__title">Members</h1>
          <p className="admin-page-header__subtitle">
            {total} member{total !== 1 ? "s" : ""}
            {search ? ` matching "${search}"` : ""}
            {status ? ` · ${STATUS_LABEL[status] ?? status}` : ""}
            {tier ? ` · ${TIER_LABEL[tier] ?? tier}` : ""}
            {billing === "missing" ? " · missing Stripe link" : ""}
            {billing === "linked" ? " · Stripe linked" : ""}
            {password === "missing" ? " · password missing" : ""}
            {password === "set" ? " · password set" : ""}
          </p>
        </div>
      </div>

      {/* Search + filters bar */}
      <form method="GET" action="/admin/members" className="admin-search-bar">
        <div className="admin-search-bar__field" style={{ flex: "1", minWidth: "200px" }}>
          <label className="admin-search-bar__label">Search by email or name</label>
          <input
            type="text"
            name="search"
            defaultValue={search}
            placeholder="email or name…"
            style={{ width: "100%" }}
          />
        </div>

        <div className="admin-search-bar__field">
          <label className="admin-search-bar__label">Status</label>
          <select name="status" defaultValue={status}>
            {STATUS_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        <div className="admin-search-bar__field">
          <label className="admin-search-bar__label">Tier</label>
          <select name="tier" defaultValue={tier}>
            {TIER_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        <div className="admin-search-bar__field">
          <label className="admin-search-bar__label">Billing</label>
          <select name="billing" defaultValue={billing}>
            {BILLING_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        <div className="admin-search-bar__field">
          <label className="admin-search-bar__label">Password</label>
          <select name="password" defaultValue={password}>
            {PASSWORD_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        <button type="submit" className="admin-btn admin-btn--primary">
          Filter
        </button>

        {(search || status || tier || billing || password) && (
          <Link href="/admin/members" className="admin-btn admin-btn--outline">
            Clear
          </Link>
        )}
      </form>

      {/* Table */}
      {members.length === 0 ? (
        <div
          className="admin-table-wrap"
          style={{ padding: "3rem", textAlign: "center" }}
        >
          <p style={{ fontSize: "0.875rem", color: "var(--color-muted-fg)", marginBottom: "0.375rem" }}>
            No members found
          </p>
          {(search || status || tier || billing || password) && (
            <p style={{ fontSize: "0.75rem", color: "var(--color-muted-fg)" }}>
              Try clearing one or more filters, or search by a different email or name.
            </p>
          )}
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Member</th>
                <th className="hidden sm:table-cell">Status</th>
                <th className="hidden md:table-cell">Tier</th>
                <th className="hidden lg:table-cell">Streak</th>
                <th className="hidden md:table-cell">Last Active</th>
                <th className="hidden lg:table-cell">Joined</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id}>
                  {/* Email + name */}
                  <td>
                    <Link
                      href={`/admin/members/${member.id}`}
                      style={{
                        fontWeight: 600,
                        color: "var(--color-foreground)",
                        textDecoration: "none",
                        display: "block",
                        transition: "color 120ms ease",
                      }}
                      className="hover:text-primary"
                    >
                      {member.email}
                    </Link>
                    {member.name && (
                      <span
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--color-muted-fg)",
                          display: "block",
                          marginTop: "0.1rem",
                        }}
                      >
                        {member.name}
                      </span>
                    )}
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "0.35rem",
                        marginTop: "0.35rem",
                      }}
                    >
                      {!member.stripe_customer_id && (
                        <span className="admin-badge admin-badge--past-due">
                          No Stripe link
                        </span>
                      )}
                      {!member.password_set && (
                        <span className="admin-badge admin-badge--draft">
                          Password missing
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Status */}
                  <td className="hidden sm:table-cell">
                    <span
                      className={
                        STATUS_BADGE[member.subscription_status] ??
                        STATUS_BADGE.inactive
                      }
                    >
                      {STATUS_LABEL[member.subscription_status] ??
                        member.subscription_status}
                    </span>
                  </td>

                  {/* Tier */}
                  <td className="hidden md:table-cell">
                    {member.subscription_tier ? (
                      <span
                        className={
                          TIER_BADGE[member.subscription_tier] ??
                          "admin-badge admin-badge--l1"
                        }
                      >
                        {TIER_LABEL[member.subscription_tier] ??
                          member.subscription_tier}
                      </span>
                    ) : (
                      <span style={{ fontSize: "0.75rem", color: "var(--color-muted-fg)" }}>—</span>
                    )}
                  </td>

                  {/* Streak */}
                  <td className="hidden lg:table-cell">
                    <span
                      style={{
                        fontWeight: 600,
                        fontVariantNumeric: "tabular-nums",
                        fontSize: "0.875rem",
                      }}
                    >
                      {member.practice_streak}
                    </span>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--color-muted-fg)",
                        marginLeft: "0.25rem",
                      }}
                    >
                      {member.practice_streak === 1 ? "day" : "days"}
                    </span>
                  </td>

                  {/* Last active */}
                  <td
                    className="hidden md:table-cell"
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--color-muted-fg)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {formatRelativeDate(member.last_practiced_at)}
                  </td>

                  {/* Joined */}
                  <td
                    className="hidden lg:table-cell"
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--color-muted-fg)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
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
        <div
          style={{
            marginTop: "1rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: "0.75rem", color: "var(--color-muted-fg)" }}>
            Page {page} of {totalPages} · {total} total
          </span>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {page > 1 && (
              <Link
                href={buildUrl({ page: String(page - 1) })}
                className="admin-btn admin-btn--outline"
              >
                ← Prev
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={buildUrl({ page: String(page + 1) })}
                className="admin-btn admin-btn--outline"
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
