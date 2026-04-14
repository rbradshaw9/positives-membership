import { getAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/types/supabase";

/**
 * lib/queries/get-admin-members.ts
 * Server-side queries for the admin member management pages.
 *
 * Sprint 12 — Admin member list + detail views.
 * All queries use the anon client (member table has permissive read for authenticated users,
 * and requireAdmin() at the layout level ensures only admins reach these routes).
 *
 * For mutations that bypass RLS, use the service-role client in an action file.
 * These are read-only queries — no mutations here.
 */

// ─────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────

export type AdminMemberRow = Pick<
  Tables<"member">,
  | "id"
  | "email"
  | "name"
  | "subscription_status"
  | "subscription_tier"
  | "practice_streak"
  | "last_practiced_at"
  | "password_set"
  | "created_at"
  | "stripe_customer_id"
>;

export type AdminMemberDetail = Tables<"member">;

export type AdminActivityEvent = Pick<
  Tables<"activity_event">,
  "id" | "event_type" | "occurred_at" | "content_id"
>;

// ─────────────────────────────────────────────────
// Filters
// ─────────────────────────────────────────────────

export type MemberStatusFilter =
  | "active"
  | "past_due"
  | "canceled"
  | "trialing"
  | "inactive"
  | "";

export type MemberTierFilter =
  | "level_1"
  | "level_2"
  | "level_3"
  | "level_4"
  | "";

export type MemberBillingFilter = "linked" | "missing" | "";

export type MemberPasswordFilter = "set" | "missing" | "";

export type MemberListFilters = {
  search?: string;
  status?: MemberStatusFilter;
  tier?: MemberTierFilter;
  billing?: MemberBillingFilter;
  password?: MemberPasswordFilter;
  page?: number;
};

const PAGE_SIZE = 30;

async function countMembers(builder: PromiseLike<{ count: number | null; error: { message: string } | null }>) {
  const { count, error } = await builder;
  if (error) {
    console.error("[countMembers] Supabase error:", error.message);
    return 0;
  }

  return count ?? 0;
}

function countMemberRows() {
  const supabase = getAdminClient();
  return supabase.from("member").select("id", {
    count: "exact",
    head: true,
  });
}

// ─────────────────────────────────────────────────
// getMemberList
// ─────────────────────────────────────────────────

/**
 * Returns a paginated list of members with optional search and filtering.
 * Ordered by created_at descending (most recent first).
 */
export async function getMemberList(filters: MemberListFilters = {}): Promise<{
  members: AdminMemberRow[];
  total: number;
}> {
  const supabase = getAdminClient();

  const page = Math.max(1, filters.page ?? 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("member")
    .select(
      "id, email, name, subscription_status, subscription_tier, practice_streak, last_practiced_at, password_set, created_at, stripe_customer_id",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  // Search: match against email (and name if set)
  if (filters.search && filters.search.trim().length > 0) {
    const term = filters.search.trim();
    // ilike against email; if name column is populated, also match against name
    query = query.or(`email.ilike.%${term}%,name.ilike.%${term}%`);
  }

  // Status filter
  if (filters.status && filters.status.length > 0) {
    query = query.eq("subscription_status", filters.status);
  }

  // Tier filter
  if (filters.tier && filters.tier.length > 0) {
    query = query.eq("subscription_tier", filters.tier);
  }

  if (filters.billing === "linked") {
    query = query.not("stripe_customer_id", "is", null);
  }

  if (filters.billing === "missing") {
    query = query.is("stripe_customer_id", null);
  }

  if (filters.password === "set") {
    query = query.eq("password_set", true);
  }

  if (filters.password === "missing") {
    query = query.eq("password_set", false);
  }

  const { data, count, error } = await query;

  if (error) {
    console.error("[getMemberList] Supabase error:", error.message);
    return { members: [], total: 0 };
  }

  return {
    members: (data ?? []) as AdminMemberRow[],
    total: count ?? 0,
  };
}

export async function getAdminMemberOpsSnapshot(): Promise<{
  total: number;
  active: number;
  pastDue: number;
  trialing: number;
  missingStripe: number;
  missingPassword: number;
}> {
  const [
    total,
    active,
    pastDue,
    trialing,
    missingStripe,
    missingPassword,
  ] = await Promise.all([
    countMembers(countMemberRows()),
    countMembers(countMemberRows().eq("subscription_status", "active")),
    countMembers(countMemberRows().eq("subscription_status", "past_due")),
    countMembers(countMemberRows().eq("subscription_status", "trialing")),
    countMembers(countMemberRows().is("stripe_customer_id", null)),
    countMembers(countMemberRows().eq("password_set", false)),
  ]);

  return {
    total,
    active,
    pastDue,
    trialing,
    missingStripe,
    missingPassword,
  };
}

// ─────────────────────────────────────────────────
// getMemberDetail
// ─────────────────────────────────────────────────

/**
 * Returns the full member row for the detail view.
 */
export async function getMemberDetail(
  memberId: string
): Promise<AdminMemberDetail | null> {
  const supabase = getAdminClient();

  const { data, error } = await supabase
    .from("member")
    .select("*")
    .eq("id", memberId)
    .single();

  if (error) {
    console.error("[getMemberDetail] Supabase error:", error.message);
    return null;
  }

  return data;
}

// ─────────────────────────────────────────────────
// getMemberRecentActivity
// ─────────────────────────────────────────────────

/**
 * Returns the most recent N activity_event rows for a member.
 * Ordered by occurred_at descending.
 */
export async function getMemberRecentActivity(
  memberId: string,
  limit = 20
): Promise<AdminActivityEvent[]> {
  const supabase = getAdminClient();

  const { data, error } = await supabase
    .from("activity_event")
    .select("id, event_type, occurred_at, content_id")
    .eq("member_id", memberId)
    .order("occurred_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[getMemberRecentActivity] Supabase error:", error.message);
    return [];
  }

  return (data ?? []) as AdminActivityEvent[];
}

// ─────────────────────────────────────────────────
// getMemberStats
// ─────────────────────────────────────────────────

/**
 * Returns aggregate support stats for a member:
 * - total journal entries
 * - total completed listens
 */
export async function getMemberStats(memberId: string): Promise<{
  journalCount: number;
  listenCount: number;
}> {
  const supabase = getAdminClient();

  const [journalResult, progressResult] = await Promise.all([
    supabase
      .from("journal")
      .select("id", { count: "exact", head: true })
      .eq("member_id", memberId),
    supabase
      .from("progress")
      .select("id", { count: "exact", head: true })
      .eq("member_id", memberId)
      .eq("completed", true),
  ]);

  return {
    journalCount: journalResult.count ?? 0,
    listenCount: progressResult.count ?? 0,
  };
}

// ─────────────────────────────────────────────────
// getContentTitleMap
// ─────────────────────────────────────────────────

/**
 * Batch-resolves content IDs to titles for the activity timeline.
 * Takes a Set of content_id values (may include nulls — those are ignored).
 * Returns a Map<content_id, title> for O(1) lookup.
 *
 * Single query — no N+1. Degrades gracefully: missing IDs simply won't
 * appear in the map and the timeline falls back to the event label alone.
 */
export async function getContentTitleMap(
  contentIds: (string | null)[]
): Promise<Map<string, string>> {
  const ids = contentIds.filter((id): id is string => id !== null && id !== undefined);

  if (ids.length === 0) return new Map();

  const supabase = getAdminClient();

  const { data, error } = await supabase
    .from("content")
    .select("id, title")
    .in("id", [...new Set(ids)]); // deduplicate before querying

  if (error) {
    console.error("[getContentTitleMap] Supabase error:", error.message);
    return new Map();
  }

  return new Map((data ?? []).map((row) => [row.id, row.title]));
}
