import Link from "next/link";
import { requireAdminPermission } from "@/lib/auth/require-admin";
import {
  getAdminAssignableMembers,
  getAdminRolesForMember,
  getMemberCrmList,
  getMemberCrmQueueSummary,
  type CourseEntitlementSource,
  type MemberAttentionFilter,
  type MemberCrmListFilters,
  type MemberCrmStatusFilter,
  type MemberCrmTierFilter,
  type MemberFollowupStatus,
  type MemberHealthStatusFilter,
} from "@/lib/admin/member-crm";
import { ADMIN_PLAN_SHORT_LABEL_BY_TIER, PLAN_NAME_BY_TIER } from "@/lib/plans";

export const metadata = {
  title: "Members — Positives Admin",
};

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

const ACCESS_LABEL: Record<string, string> = {
  subscriber: "Subscriber",
  course_only: "Course only",
  inactive_no_courses: "No active access",
};

const ACCESS_BADGE: Record<string, string> = {
  subscriber: "admin-badge admin-badge--active",
  course_only: "admin-badge admin-badge--review",
  inactive_no_courses: "admin-badge admin-badge--inactive",
};

const FOLLOWUP_LABEL: Record<string, string> = {
  none: "No follow-up",
  needs_followup: "Needs follow-up",
  waiting_on_member: "Waiting on member",
  resolved: "Resolved",
};

const HEALTH_LABEL: Record<Exclude<MemberHealthStatusFilter, "">, string> = {
  healthy: "Healthy",
  watch: "Watch",
  at_risk: "At Risk",
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
  if (Number.isNaN(then)) return "—";
  const diffDays = Math.floor((now - then) / 86_400_000);

  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

const STATUS_FILTERS: { label: string; value: MemberCrmStatusFilter }[] = [
  { label: "All statuses", value: "" },
  { label: "Active", value: "active" },
  { label: "Past Due", value: "past_due" },
  { label: "Canceled", value: "canceled" },
  { label: "Trialing", value: "trialing" },
  { label: "Inactive", value: "inactive" },
];

const TIER_FILTERS: { label: string; value: MemberCrmTierFilter }[] = [
  { label: "All tiers", value: "" },
  { label: PLAN_NAME_BY_TIER.level_1, value: "level_1" },
  { label: PLAN_NAME_BY_TIER.level_2, value: "level_2" },
  { label: PLAN_NAME_BY_TIER.level_3, value: "level_3" },
  { label: PLAN_NAME_BY_TIER.level_4, value: "level_4" },
];

const LAUNCH_COHORT_FILTERS: {
  label: string;
  value: NonNullable<MemberCrmListFilters["launchCohort"]>;
}[] = [
  { label: "All cohorts", value: "" },
  { label: "Alpha or Beta", value: "testing" },
  { label: "Alpha", value: "alpha" },
  { label: "Beta", value: "beta" },
  { label: "Live", value: "live" },
];

const QUICK_VIEWS: Array<{
  label: string;
  description: string;
  query: Record<string, string>;
  summaryKey: keyof Awaited<ReturnType<typeof getMemberCrmQueueSummary>>;
}> = [
  {
    label: "Needs attention",
    description: "Billing, access, password, or support follow-up.",
    query: { attention: "needs_attention" },
    summaryKey: "needsAttention",
  },
  {
    label: "Past due",
    description: "Payment recovery and billing support.",
    query: { status: "past_due" },
    summaryKey: "pastDue",
  },
  {
    label: "Beta/Alpha",
    description: "Members with feedback access enabled.",
    query: { launchCohort: "testing" },
    summaryKey: "testing",
  },
  {
    label: "Missing password",
    description: "Still relying on magic-link access.",
    query: { password: "missing" },
    summaryKey: "missingPassword",
  },
  {
    label: "No Stripe",
    description: "Members without a billing customer link.",
    query: { billing: "missing" },
    summaryKey: "missingStripe",
  },
  {
    label: "Course-only",
    description: "Owns courses without active membership.",
    query: { access: "course_only" },
    summaryKey: "courseOnly",
  },
  {
    label: "Unassigned coach",
    description: "No staff owner assigned yet.",
    query: { assignedCoach: "unassigned" },
    summaryKey: "unassignedCoach",
  },
];

const ENTITLEMENT_SOURCE_FILTERS: { label: string; value: CourseEntitlementSource | "" }[] = [
  { label: "All course sources", value: "" },
  { label: "Purchase", value: "purchase" },
  { label: "Migration", value: "migration" },
  { label: "Admin grant", value: "admin_grant" },
  { label: "Points unlock", value: "points_unlock" },
  { label: "Gift", value: "gift" },
];

function isCoachOnlyRoleSet(roles: { role_key: string }[]) {
  const keys = new Set(roles.map((role) => role.role_key));
  return (
    keys.has("coach") &&
    !keys.has("super_admin") &&
    !keys.has("admin") &&
    !keys.has("support") &&
    !keys.has("readonly")
  );
}

type SearchParams = Promise<Record<string, string | undefined>>;

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const adminUser = await requireAdminPermission("members.read");

  const params = await searchParams;
  const filters: MemberCrmListFilters = {
    search: params.search ?? "",
    status: (params.status ?? "") as MemberCrmStatusFilter,
    tier: (params.tier ?? "") as MemberCrmTierFilter,
    launchCohort: (params.launchCohort ?? "") as MemberCrmListFilters["launchCohort"],
    health: (params.health ?? "") as MemberHealthStatusFilter,
    attention: (params.attention ?? "") as MemberAttentionFilter,
    billing: (params.billing ?? "") as MemberCrmListFilters["billing"],
    password: (params.password ?? "") as MemberCrmListFilters["password"],
    access: (params.access ?? "") as MemberCrmListFilters["access"],
    entitlementSource: (params.entitlementSource ?? "") as CourseEntitlementSource | "",
    points: (params.points ?? "") as MemberCrmListFilters["points"],
    followup: (params.followup ?? "") as MemberFollowupStatus | "",
    assignedCoach: params.assignedCoach ?? "",
    lastSeen: (params.lastSeen ?? "") as MemberCrmListFilters["lastSeen"],
    page: Math.max(1, parseInt(params.page ?? "1", 10)),
  };

  const [adminRoles, coaches] = await Promise.all([
    getAdminRolesForMember(adminUser.id),
    getAdminAssignableMembers(),
  ]);
  const coachOnly = isCoachOnlyRoleSet(adminRoles);
  const effectiveFilters = coachOnly
    ? { ...filters, assignedCoach: adminUser.id }
    : filters;

  const [{ members, total, page, totalPages }, queueSummary] = await Promise.all([
    getMemberCrmList(effectiveFilters),
    getMemberCrmQueueSummary(),
  ]);

  function buildUrl(overrides: Record<string, string>) {
    const q = new URLSearchParams();
    for (const [key, value] of Object.entries({
      search: effectiveFilters.search,
      status: effectiveFilters.status,
      tier: effectiveFilters.tier,
      launchCohort: effectiveFilters.launchCohort,
      health: effectiveFilters.health,
      attention: effectiveFilters.attention,
      billing: effectiveFilters.billing,
      password: effectiveFilters.password,
      access: effectiveFilters.access,
      entitlementSource: effectiveFilters.entitlementSource,
      points: effectiveFilters.points,
      followup: effectiveFilters.followup,
      assignedCoach: coachOnly ? "" : effectiveFilters.assignedCoach,
      lastSeen: effectiveFilters.lastSeen,
      page: String(page),
    })) {
      if (value) q.set(key, String(value));
    }
    for (const [key, value] of Object.entries(overrides)) {
      if (value) q.set(key, value);
      else q.delete(key);
    }
    return `/admin/members?${q.toString()}`;
  }

  function quickViewIsActive(query: Record<string, string>) {
    return Object.entries(query).every(
      ([key, value]) => String(effectiveFilters[key as keyof MemberCrmListFilters] ?? "") === value
    );
  }

  const hasFilters = Object.entries(filters).some(([key, value]) => {
    if (key === "page") return false;
    if (coachOnly && key === "assignedCoach") return false;
    return Boolean(value);
  });

  return (
    <div style={{ maxWidth: "86rem" }}>
      <div
        className="admin-page-header"
        style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}
      >
        <div>
          <p className="admin-page-header__eyebrow">Member CRM</p>
          <h1 className="admin-page-header__title">Members</h1>
          <p className="admin-page-header__subtitle">
            Search the member base, then open a member record to manage access,
            courses, points, notes, and support context.
          </p>
        </div>
      </div>

      {params.success === "member_deleted" ? (
        <div className="admin-banner admin-banner--success">
          Test member account deleted.
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(10rem, 1fr))",
          gap: "0.75rem",
          margin: "1.25rem 0",
        }}
        aria-label="Member support queue summary"
      >
        {[
          ["Active", queueSummary.active, "Active or trialing"],
          ["Past due", queueSummary.pastDue, "Payment support"],
          ["Needs attention", queueSummary.needsAttention, "Support queue"],
          ["Beta/Alpha", queueSummary.testing, "Feedback access"],
          ["No password", queueSummary.missingPassword, "Magic-link only"],
          ["Course-only", queueSummary.courseOnly, "Owned courses"],
        ].map(([label, value, hint]) => (
          <div
            key={String(label)}
            className="admin-table-wrap"
            style={{ padding: "0.85rem", minHeight: "5.2rem" }}
          >
            <p style={{ fontSize: "1.35rem", fontWeight: 800, margin: 0 }}>
              {value}
            </p>
            <p style={{ fontSize: "0.78rem", fontWeight: 800, margin: "0.2rem 0 0" }}>
              {label}
            </p>
            <p style={{ fontSize: "0.72rem", color: "var(--color-muted-fg)", margin: "0.2rem 0 0" }}>
              {hint}
            </p>
          </div>
        ))}
      </div>

      <div className="admin-table-wrap" style={{ padding: "1rem", marginBottom: "1rem" }}>
        <p className="admin-search-bar__label" style={{ marginBottom: "0.75rem" }}>
          Support queues
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.55rem" }}>
          {QUICK_VIEWS.map((view) => {
            const active = quickViewIsActive(view.query);
            return (
              <Link
                key={view.label}
                href={buildUrl({ ...view.query, page: "" })}
                className={active ? "admin-btn admin-btn--primary" : "admin-btn admin-btn--outline"}
                title={view.description}
              >
                {view.label} ({queueSummary[view.summaryKey]})
              </Link>
            );
          })}
        </div>
      </div>

      <form method="GET" action="/admin/members" className="admin-search-bar" style={{ alignItems: "end" }}>
        <div className="admin-search-bar__field" style={{ flex: "1 1 20rem", minWidth: "220px" }}>
          <label htmlFor="member-search" className="admin-search-bar__label">
            Search members
          </label>
          <input
            id="member-search"
            type="text"
            name="search"
            defaultValue={filters.search}
            placeholder="email, name, Stripe ID, member ID, course, legacy ref..."
            style={{ width: "100%" }}
          />
        </div>

        <div className="admin-search-bar__field">
          <label htmlFor="member-status" className="admin-search-bar__label">Status</label>
          <select id="member-status" name="status" defaultValue={filters.status}>
            {STATUS_FILTERS.map((filter) => (
              <option key={filter.value || "all"} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>
        </div>

        <div className="admin-search-bar__field">
          <label htmlFor="member-tier" className="admin-search-bar__label">Tier</label>
          <select id="member-tier" name="tier" defaultValue={filters.tier}>
            {TIER_FILTERS.map((filter) => (
              <option key={filter.value || "all"} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>
        </div>

        <details
          open={hasFilters}
          style={{
            flex: "1 1 100%",
            border: "1px solid var(--color-border)",
            borderRadius: "0.9rem",
            padding: "0.85rem",
            background: "rgba(255,255,255,0.72)",
          }}
        >
          <summary style={{ cursor: "pointer", fontWeight: 800, fontSize: "0.85rem" }}>
            Advanced filters
          </summary>
          <div style={{ display: "flex", alignItems: "end", flexWrap: "wrap", gap: "0.85rem", marginTop: "0.85rem" }}>

        <div className="admin-search-bar__field">
          <label htmlFor="launch-cohort" className="admin-search-bar__label">Cohort</label>
          <select id="launch-cohort" name="launchCohort" defaultValue={filters.launchCohort}>
            {LAUNCH_COHORT_FILTERS.map((filter) => (
              <option key={filter.value || "all"} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>
        </div>

        <div className="admin-search-bar__field">
          <label htmlFor="member-access" className="admin-search-bar__label">Access</label>
          <select id="member-access" name="access" defaultValue={filters.access}>
            <option value="">All access types</option>
            <option value="subscriber">Subscriber</option>
            <option value="course_only">Course only</option>
            <option value="inactive_no_courses">No active access</option>
          </select>
        </div>

        <div className="admin-search-bar__field">
          <label htmlFor="health-filter" className="admin-search-bar__label">Health</label>
          <select id="health-filter" name="health" defaultValue={filters.health}>
            <option value="">All health states</option>
            <option value="healthy">Healthy</option>
            <option value="watch">Watch</option>
            <option value="at_risk">At risk</option>
          </select>
        </div>

        <div className="admin-search-bar__field">
          <label htmlFor="attention-filter" className="admin-search-bar__label">Attention</label>
          <select id="attention-filter" name="attention" defaultValue={filters.attention}>
            <option value="">All records</option>
            <option value="needs_attention">Needs attention</option>
            <option value="clear">Clear</option>
          </select>
        </div>

        <div className="admin-search-bar__field">
          <label htmlFor="course-source" className="admin-search-bar__label">Course source</label>
          <select id="course-source" name="entitlementSource" defaultValue={filters.entitlementSource}>
            {ENTITLEMENT_SOURCE_FILTERS.map((filter) => (
              <option key={filter.value || "all"} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>
        </div>

        <div className="admin-search-bar__field">
          <label htmlFor="points-filter" className="admin-search-bar__label">Points</label>
          <select id="points-filter" name="points" defaultValue={filters.points}>
            <option value="">All balances</option>
            <option value="positive">Positive balance</option>
            <option value="zero">Zero balance</option>
            <option value="negative">Negative balance</option>
          </select>
        </div>

        <div className="admin-search-bar__field">
          <label htmlFor="followup-filter" className="admin-search-bar__label">Follow-up</label>
          <select id="followup-filter" name="followup" defaultValue={filters.followup}>
            <option value="">All follow-up</option>
            <option value="none">No follow-up</option>
            <option value="needs_followup">Needs follow-up</option>
            <option value="waiting_on_member">Waiting on member</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>

        <div className="admin-search-bar__field">
          <label htmlFor="coach-filter" className="admin-search-bar__label">Coach</label>
          <select id="coach-filter" name="assignedCoach" defaultValue={filters.assignedCoach}>
            <option value="">All coaches</option>
            <option value="unassigned">Unassigned</option>
            {coaches.map((coach) => (
              <option key={coach.id} value={coach.id}>
                {coach.label}
              </option>
            ))}
          </select>
        </div>

        <div className="admin-search-bar__field">
          <label htmlFor="last-seen-filter" className="admin-search-bar__label">Last seen</label>
          <select id="last-seen-filter" name="lastSeen" defaultValue={filters.lastSeen}>
            <option value="">Any time</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="never">Never seen</option>
          </select>
        </div>

        <div className="admin-search-bar__field">
          <label htmlFor="billing-filter" className="admin-search-bar__label">Billing</label>
          <select id="billing-filter" name="billing" defaultValue={filters.billing}>
            <option value="">All billing</option>
            <option value="linked">Stripe linked</option>
            <option value="missing">Stripe missing</option>
          </select>
        </div>

        <div className="admin-search-bar__field">
          <label htmlFor="password-filter" className="admin-search-bar__label">Password</label>
          <select id="password-filter" name="password" defaultValue={filters.password}>
            <option value="">All password states</option>
            <option value="set">Password set</option>
            <option value="missing">Password missing</option>
          </select>
        </div>

          </div>
        </details>

        <button type="submit" className="admin-btn admin-btn--primary">
          Search
        </button>
        {hasFilters ? (
          <Link href="/admin/members" className="admin-btn admin-btn--outline">
            Clear
          </Link>
        ) : null}
      </form>

      <div style={{ margin: "1rem 0", fontSize: "0.8125rem", color: "var(--color-muted-fg)" }}>
        {total} member{total !== 1 ? "s" : ""} found
        {coachOnly ? " in your assigned coaching roster" : ""}
      </div>

      {members.length === 0 ? (
        <div className="admin-table-wrap" style={{ padding: "3rem", textAlign: "center" }}>
          <p style={{ fontSize: "0.875rem", color: "var(--color-muted-fg)", marginBottom: "0.375rem" }}>
            No members found
          </p>
          <p style={{ fontSize: "0.75rem", color: "var(--color-muted-fg)" }}>
            Try clearing one or more filters, or search by a different email, name, course, or ID.
          </p>
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Member</th>
                <th className="hidden sm:table-cell">Status</th>
                <th className="hidden md:table-cell">Access</th>
                <th className="hidden lg:table-cell">Health</th>
                <th className="hidden lg:table-cell">Courses</th>
                <th className="hidden lg:table-cell">Points</th>
                <th className="hidden xl:table-cell">Queue</th>
                <th className="hidden xl:table-cell">Coach</th>
                <th className="hidden md:table-cell">Last seen</th>
                <th className="hidden lg:table-cell">Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => {
                const lastSeen = member.last_seen_at ?? member.last_practiced_at;
                return (
                  <tr key={member.id}>
                    <td>
                      <Link
                        href={`/admin/members/${member.id}`}
                        style={{
                          fontWeight: 700,
                          color: "var(--color-foreground)",
                          textDecoration: "none",
                          display: "block",
                        }}
                      >
                        {member.email}
                      </Link>
                      {member.name ? (
                        <span style={{ fontSize: "0.75rem", color: "var(--color-muted-fg)", display: "block", marginTop: "0.1rem" }}>
                          {member.name}
                        </span>
                      ) : null}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginTop: "0.35rem" }}>
                        {member.launch_cohort && member.launch_cohort !== "live" ? (
                          <span className="admin-badge admin-badge--review">
                            {member.launch_cohort === "alpha" ? "Alpha" : "Beta"}
                          </span>
                        ) : null}
                        {!member.stripe_customer_id ? (
                          <span className="admin-badge admin-badge--past-due">No Stripe</span>
                        ) : null}
                        {!member.password_set ? (
                          <span className="admin-badge admin-badge--draft">No password</span>
                        ) : null}
                        {member.legacy_member_ref ? (
                          <span className="admin-badge admin-badge--review">Legacy</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="hidden sm:table-cell">
                      <span className={STATUS_BADGE[member.subscription_status] ?? STATUS_BADGE.inactive}>
                        {STATUS_LABEL[member.subscription_status] ?? member.subscription_status}
                      </span>
                      {member.subscription_tier ? (
                        <span
                          className={TIER_BADGE[member.subscription_tier] ?? "admin-badge admin-badge--l1"}
                          style={{ marginLeft: "0.35rem" }}
                        >
                          {TIER_LABEL[member.subscription_tier] ?? member.subscription_tier}
                        </span>
                      ) : null}
                    </td>
                    <td className="hidden md:table-cell">
                      <span className={ACCESS_BADGE[member.access_type] ?? "admin-badge"}>
                        {ACCESS_LABEL[member.access_type] ?? member.access_type}
                      </span>
                    </td>
                    <td className="hidden lg:table-cell">
                      {member.health_status ? (
                        <span
                          className={
                            member.health_status === "at_risk"
                              ? "admin-badge admin-badge--past-due"
                              : member.health_status === "watch"
                                ? "admin-badge admin-badge--review"
                                : "admin-badge admin-badge--active"
                          }
                        >
                          {HEALTH_LABEL[member.health_status]}
                        </span>
                      ) : (
                        <span style={{ color: "var(--color-muted-fg)", fontSize: "0.75rem" }}>—</span>
                      )}
                    </td>
                    <td className="hidden lg:table-cell">
                      <span style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                        {member.active_course_count}
                      </span>
                    </td>
                    <td className="hidden lg:table-cell">
                      <span style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                        {member.points_balance}
                      </span>
                    </td>
                    <td className="hidden xl:table-cell">
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                        <span
                          className={
                            member.followup_status === "needs_followup"
                              ? "admin-badge admin-badge--past-due"
                              : member.followup_status === "waiting_on_member"
                                ? "admin-badge admin-badge--review"
                                : "admin-badge admin-badge--inactive"
                          }
                        >
                          {FOLLOWUP_LABEL[member.followup_status] ?? member.followup_status}
                        </span>
                        {member.needs_attention ? (
                          <span className="admin-badge admin-badge--review">Needs attention</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="hidden xl:table-cell" style={{ fontSize: "0.75rem", color: "var(--color-muted-fg)" }}>
                      {member.assigned_coach_name ?? "—"}
                    </td>
                    <td className="hidden md:table-cell" style={{ fontSize: "0.75rem", color: "var(--color-muted-fg)" }}>
                      {formatRelativeDate(lastSeen)}
                    </td>
                    <td className="hidden lg:table-cell" style={{ fontSize: "0.75rem", color: "var(--color-muted-fg)" }}>
                      {formatDate(member.created_at)}
                    </td>
                    <td>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                        <Link href={`/admin/members/${member.id}`} className="admin-btn admin-btn--outline" style={{ fontSize: "0.72rem", padding: "0.35rem 0.55rem" }}>
                          Open
                        </Link>
                        <Link href={`/admin/members/${member.id}?tab=billing`} className="admin-btn admin-btn--outline" style={{ fontSize: "0.72rem", padding: "0.35rem 0.55rem" }}>
                          Billing
                        </Link>
                        <Link href={`/admin/members/${member.id}?tab=access`} className="admin-btn admin-btn--outline" style={{ fontSize: "0.72rem", padding: "0.35rem 0.55rem" }}>
                          Access
                        </Link>
                        <Link href={`/admin/members/${member.id}?tab=notes#note-form`} className="admin-btn admin-btn--outline" style={{ fontSize: "0.72rem", padding: "0.35rem 0.55rem" }}>
                          Note
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 ? (
        <div style={{ marginTop: "1rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: "0.75rem", color: "var(--color-muted-fg)" }}>
            Page {page} of {totalPages} · {total} total
          </span>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {page > 1 ? (
              <Link href={buildUrl({ page: String(page - 1) })} className="admin-btn admin-btn--outline">
                ← Prev
              </Link>
            ) : null}
            {page < totalPages ? (
              <Link href={buildUrl({ page: String(page + 1) })} className="admin-btn admin-btn--outline">
                Next →
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
