import { getAdminClient } from "@/lib/supabase/admin";
import { getMemberRecentActivity, getMemberStats } from "@/lib/queries/get-admin-members";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";
import { config } from "@/lib/config";
import type { Tables } from "@/types/supabase";

export const MEMBER_CRM_PAGE_SIZE = 30;

export type MemberCrmStatusFilter =
  | "active"
  | "past_due"
  | "canceled"
  | "trialing"
  | "inactive"
  | "";

export type MemberCrmTierFilter =
  | "level_1"
  | "level_2"
  | "level_3"
  | "level_4"
  | "";

export type MemberCrmListFilters = {
  search?: string;
  status?: MemberCrmStatusFilter;
  tier?: MemberCrmTierFilter;
  health?: MemberHealthStatusFilter;
  attention?: MemberAttentionFilter;
  billing?: "linked" | "missing" | "";
  password?: "set" | "missing" | "";
  access?: "subscriber" | "course_only" | "inactive_no_courses" | "";
  entitlementSource?: CourseEntitlementSource | "";
  points?: "positive" | "zero" | "negative" | "";
  followup?: MemberFollowupStatus | "";
  assignedCoach?: string;
  lastSeen?: "7d" | "30d" | "90d" | "never" | "";
  page?: number;
};

export type MemberFollowupStatus =
  | "none"
  | "needs_followup"
  | "waiting_on_member"
  | "resolved";

export type MemberHealthStatusFilter = "healthy" | "watch" | "at_risk" | "";
export type MemberAttentionFilter = "needs_attention" | "clear" | "";

export type CourseEntitlementSource =
  | "purchase"
  | "migration"
  | "admin_grant"
  | "points_unlock"
  | "gift";

export type CourseEntitlementStatus =
  | "active"
  | "revoked"
  | "refunded"
  | "chargeback";

export type MemberCrmRow = Pick<
  Tables<"member">,
  | "id"
  | "email"
  | "name"
  | "subscription_status"
  | "subscription_tier"
  | "password_set"
  | "created_at"
  | "stripe_customer_id"
  | "paypal_email"
  | "fp_promoter_id"
  | "practice_streak"
  | "last_practiced_at"
> & {
  assigned_coach_id: string | null;
  assigned_coach_name: string | null;
  followup_status: MemberFollowupStatus;
  followup_at: string | null;
  followup_note: string | null;
  last_seen_at: string | null;
  first_login_at: string | null;
  legacy_member_ref: string | null;
  active_course_count: number;
  points_balance: number;
  access_type: "subscriber" | "course_only" | "inactive_no_courses";
  health_status: MemberHealthStatusFilter;
  engagement_status: "engaged" | "warming_up" | "inactive" | "";
  needs_attention: boolean;
};

export type MemberCrmDetailMember = Tables<"member"> & {
  assigned_coach_id: string | null;
  followup_status: MemberFollowupStatus;
  followup_at: string | null;
  followup_note: string | null;
  last_seen_at: string | null;
  first_login_at: string | null;
  legacy_member_ref: string | null;
};

export type CourseEntitlement = {
  id: string;
  member_id: string;
  course_id: string;
  source: CourseEntitlementSource;
  status: CourseEntitlementStatus;
  grant_note: string | null;
  revoke_note: string | null;
  legacy_source: string | null;
  legacy_ref: string | null;
  purchased_at: string | null;
  granted_at: string;
  revoked_at: string | null;
  course: {
    id: string;
    title: string;
    slug: string | null;
    status: string;
    points_price: number | null;
  } | null;
};

export type CourseGrantOption = {
  id: string;
  title: string;
  slug: string | null;
  status: string;
  tier_min: string | null;
  is_standalone_purchasable: boolean;
  price_cents: number | null;
  points_price: number | null;
};

export type PointsLedgerEntry = {
  id: string;
  member_id: string;
  delta: number;
  reason: string;
  description: string | null;
  course_id: string | null;
  content_id: string | null;
  created_by: string | null;
  created_at: string;
  course?: { title: string; slug: string | null } | null;
};

export type MemberAdminNote = {
  id: string;
  member_id: string;
  author_member_id: string | null;
  body: string;
  pinned: boolean;
  followup_status: MemberFollowupStatus | null;
  created_at: string;
  updated_at: string;
  author?: { email: string; name: string | null } | null;
};

export type MemberDocument = {
  id: string;
  member_id: string;
  uploaded_by: string | null;
  title: string;
  file_name: string | null;
  storage_path: string | null;
  external_url: string | null;
  content_type: string | null;
  size_bytes: number | null;
  internal_only: boolean;
  note: string | null;
  created_at: string;
};

export type MemberAccessOverride = {
  id: string;
  member_id: string;
  starts_at: string;
  ends_at: string | null;
  reason: string;
  active: boolean;
  created_at: string;
};

export type MemberAuditEntry = {
  id: string;
  actor_member_id: string | null;
  target_member_id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  reason: string | null;
  metadata: unknown;
  created_at: string;
};

export type AdminRoleRow = {
  role_key: string;
  role_name: string;
  permissions: string[];
};

export type AvailableAdminRole = {
  id: string;
  key: string;
  name: string;
  description: string | null;
};

type RawMember = MemberCrmRow;

function hasActiveMemberAccess(status: string | null | undefined) {
  return status === "active" || status === "trialing";
}

function computeAccessType(
  member: Pick<RawMember, "subscription_status">,
  activeCourseCount: number
): MemberCrmRow["access_type"] {
  if (hasActiveMemberAccess(member.subscription_status)) return "subscriber";
  if (activeCourseCount > 0) return "course_only";
  return "inactive_no_courses";
}

function matchesLastSeenFilter(member: RawMember, filter: MemberCrmListFilters["lastSeen"]) {
  if (!filter) return true;
  const last = member.last_seen_at ?? member.last_practiced_at;
  if (filter === "never") return !last;
  if (!last) return false;
  const days = Math.floor((Date.now() - new Date(last).getTime()) / 86_400_000);
  if (filter === "7d") return days <= 7;
  if (filter === "30d") return days <= 30;
  if (filter === "90d") return days <= 90;
  return true;
}

function normalizeSearch(search?: string) {
  return search?.trim().toLowerCase() ?? "";
}

function memberMatchesSearch(
  member: RawMember,
  search: string,
  entitlementByMember: Map<string, CourseEntitlement[]>
) {
  if (!search) return true;

  const fields = [
    member.id,
    member.email,
    member.name,
    member.stripe_customer_id,
    member.legacy_member_ref,
  ]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());

  if (fields.some((value) => value.includes(search))) return true;

  const entitlements = entitlementByMember.get(member.id) ?? [];
  return entitlements.some((entitlement) => {
    const courseTitle = entitlement.course?.title?.toLowerCase() ?? "";
    const legacyRef = entitlement.legacy_ref?.toLowerCase() ?? "";
    return courseTitle.includes(search) || legacyRef.includes(search);
  });
}

async function fetchEntitlementsForMembers(memberIds: string[]) {
  if (memberIds.length === 0) return [];
  const supabase = asLooseSupabaseClient(getAdminClient());
  const { data, error } = await supabase
    .from("course_entitlement")
    .select<CourseEntitlement[]>(
      "id, member_id, course_id, source, status, grant_note, revoke_note, legacy_source, legacy_ref, purchased_at, granted_at, revoked_at, course:course_id(id, title, slug, status, points_price)"
    )
    .in("member_id", memberIds)
    .order("granted_at", { ascending: false });

  if (error) {
    console.error("[member-crm] entitlement fetch failed:", error.message);
    return [];
  }

  return (data ?? []) as CourseEntitlement[];
}

async function fetchPointBalances(memberIds: string[]) {
  const balances = new Map<string, number>();
  if (memberIds.length === 0) return balances;
  const supabase = asLooseSupabaseClient(getAdminClient());
  const { data, error } = await supabase
    .from("member_points_ledger")
    .select<{ member_id: string; delta: number }[]>("member_id, delta")
    .in("member_id", memberIds);

  if (error) {
    console.error("[member-crm] points fetch failed:", error.message);
    return balances;
  }

  for (const row of data ?? []) {
    balances.set(row.member_id, (balances.get(row.member_id) ?? 0) + Number(row.delta));
  }
  return balances;
}

async function fetchCoachNames(coachIds: string[]) {
  const uniqueIds = [...new Set(coachIds.filter(Boolean))];
  const names = new Map<string, string>();
  if (uniqueIds.length === 0) return names;

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("member")
    .select("id, email, name")
    .in("id", uniqueIds);

  if (error) {
    console.error("[member-crm] coach fetch failed:", error.message);
    return names;
  }

  for (const row of data ?? []) {
    names.set(row.id, row.name || row.email);
  }
  return names;
}

async function fetchHealthSnapshots(memberIds: string[]) {
  const snapshots = new Map<string, {
    health_status: Exclude<MemberHealthStatusFilter, "">;
    engagement_status: "engaged" | "warming_up" | "inactive";
    risk_flags: string[];
  }>();
  if (memberIds.length === 0) return snapshots;

  const supabase = asLooseSupabaseClient(getAdminClient());
  const { data, error } = await supabase
    .from("member_health_snapshot")
    .select<{ member_id: string; health_status: "healthy" | "watch" | "at_risk"; engagement_status: "engaged" | "warming_up" | "inactive"; risk_flags: string[] }[]>(
      "member_id, health_status, engagement_status, risk_flags"
    )
    .in("member_id", memberIds);

  if (error) {
    console.error("[member-crm] health snapshot fetch failed:", error.message);
    return snapshots;
  }

  for (const row of data ?? []) snapshots.set(row.member_id, row);
  return snapshots;
}

async function fetchBillingSummaryPresence(memberIds: string[]) {
  const present = new Set<string>();
  if (memberIds.length === 0) return present;

  const supabase = asLooseSupabaseClient(getAdminClient());
  const { data, error } = await supabase
    .from("member_billing_summary")
    .select<{ member_id: string }[]>("member_id")
    .in("member_id", memberIds);

  if (error) {
    console.error("[member-crm] billing summary presence fetch failed:", error.message);
    return present;
  }

  for (const row of data ?? []) present.add(row.member_id);
  return present;
}

export async function getMemberCrmList(filters: MemberCrmListFilters = {}): Promise<{
  members: MemberCrmRow[];
  total: number;
  page: number;
  totalPages: number;
}> {
  const supabase = asLooseSupabaseClient(getAdminClient());
  const page = Math.max(1, filters.page ?? 1);

  let query = supabase
    .from("member")
    .select<RawMember[]>(
      "id, email, name, subscription_status, subscription_tier, password_set, created_at, stripe_customer_id, paypal_email, fp_promoter_id, practice_streak, last_practiced_at, assigned_coach_id, followup_status, followup_at, followup_note, last_seen_at, first_login_at, legacy_member_ref"
    )
    .order("created_at", { ascending: false })
    .limit(2000);

  if (filters.status) query = query.eq("subscription_status", filters.status);
  if (filters.tier) query = query.eq("subscription_tier", filters.tier);
  if (filters.billing === "linked") query = query.not("stripe_customer_id", "is", null);
  if (filters.billing === "missing") query = query.is("stripe_customer_id", null);
  if (filters.password === "set") query = query.eq("password_set", true);
  if (filters.password === "missing") query = query.eq("password_set", false);
  if (filters.followup) query = query.eq("followup_status", filters.followup);
  if (filters.assignedCoach === "unassigned") query = query.is("assigned_coach_id", null);
  if (filters.assignedCoach && filters.assignedCoach !== "unassigned") {
    query = query.eq("assigned_coach_id", filters.assignedCoach);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[member-crm] member list failed:", error.message);
    return { members: [], total: 0, page, totalPages: 0 };
  }

  const rawMembers = (data ?? []) as RawMember[];
  const memberIds = rawMembers.map((member) => member.id);
  const [entitlements, pointBalances, coachNames, healthSnapshots, billingSummaryPresence] = await Promise.all([
    fetchEntitlementsForMembers(memberIds),
    fetchPointBalances(memberIds),
    fetchCoachNames(rawMembers.map((member) => member.assigned_coach_id).filter(Boolean) as string[]),
    fetchHealthSnapshots(memberIds),
    fetchBillingSummaryPresence(memberIds),
  ]);

  const entitlementByMember = new Map<string, CourseEntitlement[]>();
  for (const entitlement of entitlements) {
    const list = entitlementByMember.get(entitlement.member_id) ?? [];
    list.push(entitlement);
    entitlementByMember.set(entitlement.member_id, list);
  }

  const search = normalizeSearch(filters.search);
  const enriched = rawMembers
    .map((member) => {
      const activeEntitlements = (entitlementByMember.get(member.id) ?? []).filter(
        (entitlement) => entitlement.status === "active"
      );
      const pointsBalance = pointBalances.get(member.id) ?? 0;
      const healthSnapshot = healthSnapshots.get(member.id);
      const needsAttention =
        member.subscription_status === "past_due" ||
        !member.password_set ||
        member.followup_status === "needs_followup" ||
        (member.followup_status === "waiting_on_member" && !!member.followup_at) ||
        (member.fp_promoter_id !== null && !member.paypal_email) ||
        (Boolean(member.stripe_customer_id) && !billingSummaryPresence.has(member.id)) ||
        (healthSnapshot?.health_status ?? "healthy") !== "healthy";
      return {
        ...member,
        followup_status: member.followup_status ?? "none",
        assigned_coach_name: member.assigned_coach_id
          ? coachNames.get(member.assigned_coach_id) ?? null
          : null,
        active_course_count: activeEntitlements.length,
        points_balance: pointsBalance,
        access_type: computeAccessType(member, activeEntitlements.length),
        health_status: healthSnapshot?.health_status ?? "",
        engagement_status: healthSnapshot?.engagement_status ?? "",
        needs_attention: needsAttention,
      } satisfies MemberCrmRow;
    })
    .filter((member) => memberMatchesSearch(member, search, entitlementByMember))
    .filter((member) => !filters.access || member.access_type === filters.access)
    .filter((member) => !filters.health || member.health_status === filters.health)
    .filter((member) => {
      if (!filters.attention) return true;
      return filters.attention === "needs_attention" ? member.needs_attention : !member.needs_attention;
    })
    .filter((member) => matchesLastSeenFilter(member, filters.lastSeen))
    .filter((member) => {
      if (!filters.entitlementSource) return true;
      return (entitlementByMember.get(member.id) ?? []).some(
        (entitlement) =>
          entitlement.status === "active" && entitlement.source === filters.entitlementSource
      );
    })
    .filter((member) => {
      if (!filters.points) return true;
      if (filters.points === "positive") return member.points_balance > 0;
      if (filters.points === "zero") return member.points_balance === 0;
      if (filters.points === "negative") return member.points_balance < 0;
      return true;
    });

  const total = enriched.length;
  const totalPages = Math.max(1, Math.ceil(total / MEMBER_CRM_PAGE_SIZE));
  const start = (page - 1) * MEMBER_CRM_PAGE_SIZE;

  return {
    members: enriched.slice(start, start + MEMBER_CRM_PAGE_SIZE),
    total,
    page,
    totalPages,
  };
}

export async function getAdminAssignableMembers(): Promise<{ id: string; label: string }[]> {
  const supabase = asLooseSupabaseClient(getAdminClient());
  const bootstrapAdminEmails = config.app.adminEmails;

  const { data: roleRows, error: roleError } = await supabase
    .from("admin_role")
    .select<{ id: string }[]>("id")
    .in("key", ["super_admin", "admin", "coach"]);

  if (roleError) {
    console.error("[member-crm] assignable role fetch failed:", roleError.message);
    return [];
  }

  const roleIds = (roleRows ?? []).map((role: { id: string }) => role.id);
  const memberIds = new Set<string>();

  if (roleIds.length > 0) {
    const { data: assignments, error: assignmentError } = await supabase
      .from("admin_user_role")
      .select<{ member_id: string }[]>("member_id")
      .in("role_id", roleIds);

    if (assignmentError) {
      console.error("[member-crm] assignable role assignment fetch failed:", assignmentError.message);
      return [];
    }

    for (const assignment of assignments ?? []) {
      memberIds.add(assignment.member_id);
    }
  }

  const membersById = new Map<string, { id: string; email: string; name: string | null }>();

  if (memberIds.size > 0) {
    const { data, error } = await supabase
      .from("member")
      .select<{ id: string; email: string; name: string | null }[]>("id, email, name")
      .in("id", [...memberIds]);

    if (error) {
      console.error("[member-crm] assignable members failed:", error.message);
      return [];
    }

    for (const member of data ?? []) membersById.set(member.id, member);
  }

  if (bootstrapAdminEmails.length > 0) {
    const { data, error } = await supabase
      .from("member")
      .select<{ id: string; email: string; name: string | null }[]>("id, email, name")
      .in("email", bootstrapAdminEmails);

    if (error) {
      console.error("[member-crm] bootstrap assignable members failed:", error.message);
      return [];
    }

    for (const member of data ?? []) membersById.set(member.id, member);
  }

  return [...membersById.values()]
    .sort((a, b) => a.email.localeCompare(b.email))
    .map((member) => ({
    id: member.id,
    label: member.name ? `${member.name} (${member.email})` : member.email,
  }));
}

export async function getMemberCrmDetail(memberId: string) {
  const supabase = asLooseSupabaseClient(getAdminClient());

  const [
    memberResult,
    entitlements,
    pointBalanceMap,
    pointsResult,
    notesResult,
    documentsResult,
    overridesResult,
    auditResult,
    coursesResult,
    activity,
    stats,
    roles,
  ] = await Promise.all([
    supabase.from("member").select<MemberCrmDetailMember>("*").eq("id", memberId).single(),
    fetchEntitlementsForMembers([memberId]),
    fetchPointBalances([memberId]),
    supabase
      .from("member_points_ledger")
      .select<PointsLedgerEntry[]>("id, member_id, delta, reason, description, course_id, content_id, created_by, created_at, course:course_id(title, slug)")
      .eq("member_id", memberId)
      .order("created_at", { ascending: false })
      .limit(25),
    supabase
      .from("member_admin_note")
      .select<MemberAdminNote[]>("id, member_id, author_member_id, body, pinned, followup_status, created_at, updated_at, author:author_member_id(email, name)")
      .eq("member_id", memberId)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(25),
    supabase
      .from("member_document")
      .select<MemberDocument[]>("*")
      .eq("member_id", memberId)
      .order("created_at", { ascending: false })
      .limit(25),
    supabase
      .from("member_access_override")
      .select<MemberAccessOverride[]>("*")
      .eq("member_id", memberId)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("member_audit_log")
      .select<MemberAuditEntry[]>("*")
      .eq("target_member_id", memberId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("course")
      .select<CourseGrantOption[]>("id, title, slug, status, tier_min, is_standalone_purchasable, price_cents, points_price")
      .order("title", { ascending: true }),
    getMemberRecentActivity(memberId, 25),
    getMemberStats(memberId),
    getAdminRolesForMember(memberId),
  ]);

  if (memberResult.error || !memberResult.data) {
    console.error("[member-crm] member detail failed:", memberResult.error?.message);
    return null;
  }

  const activeCourseIds = new Set(
    entitlements
      .filter((entitlement) => entitlement.status === "active")
      .map((entitlement) => entitlement.course_id)
  );

  const allCourses = (coursesResult.data ?? []) as CourseGrantOption[];
  const grantableCourses = allCourses.filter((course) => !activeCourseIds.has(course.id));

  return {
    member: memberResult.data as MemberCrmDetailMember,
    entitlements,
    pointBalance: pointBalanceMap.get(memberId) ?? 0,
    points: ((pointsResult.data ?? []) as PointsLedgerEntry[]),
    notes: ((notesResult.data ?? []) as MemberAdminNote[]),
    documents: ((documentsResult.data ?? []) as MemberDocument[]),
    overrides: ((overridesResult.data ?? []) as MemberAccessOverride[]),
    audit: ((auditResult.data ?? []) as MemberAuditEntry[]),
    grantableCourses,
    allCourses,
    activity,
    stats,
    roles,
  };
}

export async function getAdminRolesForMember(memberId: string): Promise<AdminRoleRow[]> {
  const supabase = asLooseSupabaseClient(getAdminClient());

  const { data: assignments, error } = await supabase
    .from("admin_user_role")
    .select<{ role_id: string }[]>("role_id")
    .eq("member_id", memberId);

  if (error) {
    console.error("[member-crm] role fetch failed:", error.message);
    return [];
  }

  const roleIds = (assignments ?? []).map((row: { role_id: string }) => row.role_id);
  if (roleIds.length === 0) return [];

  const [{ data: roleRows }, { data: permissionRows }] = await Promise.all([
    supabase.from("admin_role").select<{ id: string; key: string; name: string }[]>("id, key, name").in("id", roleIds),
    supabase.from("admin_role_permission").select<{ role_id: string; permission: string }[]>("role_id, permission").in("role_id", roleIds),
  ]);

  const permissionsByRole = new Map<string, string[]>();
  for (const permission of permissionRows ?? []) {
    const list = permissionsByRole.get(permission.role_id) ?? [];
    list.push(String(permission.permission));
    permissionsByRole.set(permission.role_id, list);
  }

  return (roleRows ?? []).map((role: { id: string; key: string; name: string }) => ({
    role_key: role.key,
    role_name: role.name,
    permissions: permissionsByRole.get(role.id) ?? [],
  }));
}

export async function getAvailableAdminRoles(): Promise<AvailableAdminRole[]> {
  const supabase = asLooseSupabaseClient(getAdminClient());
  const { data, error } = await supabase
    .from("admin_role")
    .select<AvailableAdminRole[]>("id, key, name, description")
    .order("name", { ascending: true });

  if (error) {
    console.error("[member-crm] available roles fetch failed:", error.message);
    return [];
  }

  return (data ?? []) as AvailableAdminRole[];
}
