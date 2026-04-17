import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";
import {
  type BetaFeedbackCategory,
  type BetaFeedbackSeverity,
  type BetaFeedbackStatus,
} from "@/lib/beta-feedback/shared";

export type AdminBetaFeedbackRecord = {
  id: string;
  created_at: string;
  updated_at: string;
  member_id: string | null;
  member_email: string;
  member_name: string | null;
  summary: string;
  details: string;
  expected_behavior: string | null;
  category: BetaFeedbackCategory;
  severity: BetaFeedbackSeverity;
  status: BetaFeedbackStatus;
  page_path: string | null;
  page_url: string | null;
  app_release: string | null;
  browser_name: string | null;
  os_name: string | null;
  device_type: string | null;
  viewport_width: number | null;
  viewport_height: number | null;
  user_agent: string | null;
  timezone: string | null;
  loom_url: string | null;
  screenshot_storage_path: string | null;
  screenshot_file_name: string | null;
  screenshot_content_type: string | null;
  screenshot_size_bytes: number | null;
  assigned_member_id: string | null;
  triage_notes: string | null;
  stripe_customer_id: string | null;
  subscription_tier: string | null;
  subscription_status: string | null;
  metadata: Record<string, unknown>;
  resolved_at: string | null;
  member?: { id: string; email: string; name: string | null } | null;
  assignee?: { id: string; email: string; name: string | null } | null;
};

export type AdminBetaFeedbackFilters = {
  status?: BetaFeedbackStatus | "";
  severity?: BetaFeedbackSeverity | "";
  category?: BetaFeedbackCategory | "";
  assigned?: "mine" | "unassigned" | "";
  search?: string;
  actorId?: string;
};

function escapeSearch(value: string) {
  return value.replace(/[,%]/g, " ").trim();
}

export async function getAdminBetaFeedbackQueue(filters: AdminBetaFeedbackFilters = {}) {
  const supabase = asLooseSupabaseClient(getAdminClient());
  let query = supabase
    .from("beta_feedback_submission")
    .select<AdminBetaFeedbackRecord[]>(
      "id, created_at, updated_at, member_id, member_email, member_name, summary, details, expected_behavior, category, severity, status, page_path, page_url, app_release, browser_name, os_name, device_type, viewport_width, viewport_height, user_agent, timezone, loom_url, screenshot_storage_path, screenshot_file_name, screenshot_content_type, screenshot_size_bytes, assigned_member_id, triage_notes, stripe_customer_id, subscription_tier, subscription_status, metadata, resolved_at, member:member_id(id, email, name), assignee:assigned_member_id(id, email, name)"
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.severity) query = query.eq("severity", filters.severity);
  if (filters.category) query = query.eq("category", filters.category);
  if (filters.assigned === "mine" && filters.actorId) {
    query = query.eq("assigned_member_id", filters.actorId);
  }
  if (filters.assigned === "unassigned") {
    query = query.is("assigned_member_id", null);
  }
  if (filters.search) {
    const search = escapeSearch(filters.search);
    if (search) {
      query = query.or(
        `member_email.ilike.%${search}%,member_name.ilike.%${search}%,summary.ilike.%${search}%,details.ilike.%${search}%`
      );
    }
  }

  const { data, error } = await query;
  if (error) {
    console.error("[beta-feedback] queue query failed:", error.message);
    return [];
  }

  return (data ?? []) as AdminBetaFeedbackRecord[];
}
