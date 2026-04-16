import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";
import type { MemberFollowupTask, MemberFollowupStatus } from "@/lib/admin/member-followup";

export type MemberBillingSummary = {
  member_id: string;
  stripe_customer_id: string | null;
  currency: string;
  first_paid_at: string | null;
  last_paid_at: string | null;
  lifetime_value_cents: number;
  subscription_lifetime_value_cents: number;
  course_lifetime_value_cents: number;
  successful_payment_count: number;
  failed_payment_count: number;
  refund_total_cents: number;
  chargeback_count: number;
  active_subscription_price_id: string | null;
  active_subscription_amount_cents: number | null;
  active_subscription_interval: string | null;
  created_at: string;
  updated_at: string;
};

export type MemberHealthStatus = "healthy" | "watch" | "at_risk";
export type MemberEngagementStatus = "engaged" | "warming_up" | "inactive";

export type MemberHealthSnapshot = {
  member_id: string;
  health_status: MemberHealthStatus;
  engagement_status: MemberEngagementStatus;
  risk_flags: string[];
  last_meaningful_activity_at: string | null;
  practice_days_30: number;
  logins_30: number;
  listens_30: number;
  journal_entries_30: number;
  course_progress_events_30: number;
  created_at: string;
  computed_at: string;
};

export type MemberCrmInsightSubject = {
  id: string;
  email: string;
  subscription_status: string | null;
  subscription_tier: string | null;
  password_set: boolean | null;
  last_practiced_at: string | null;
  last_seen_at: string | null;
  first_login_at: string | null;
  paypal_email: string | null;
  fp_promoter_id: number | null;
  stripe_customer_id: string | null;
  email_unsubscribed: boolean | null;
  assigned_coach_id: string | null;
  followup_status: MemberFollowupStatus;
  followup_note: string | null;
  followup_at: string | null;
};

export type MemberNeedsAttentionCard = {
  key: string;
  label: string;
  detail: string;
  tab: "overview" | "activity" | "access" | "billing" | "communication" | "notes" | "documents" | "admin-access";
  severity: "urgent" | "watch";
};

export type MemberRecommendedAction = {
  label: string;
  detail: string;
  tab: MemberNeedsAttentionCard["tab"];
};

function toIsoDaysAgo(days: number) {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

function maxIso(values: Array<string | null | undefined>) {
  const candidates = values.filter(Boolean).map((value) => new Date(String(value)).getTime());
  if (candidates.length === 0) return null;
  return new Date(Math.max(...candidates)).toISOString();
}

function daysSince(iso: string | null) {
  if (!iso) return Number.POSITIVE_INFINITY;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

export async function getMemberBillingSummary(memberId: string) {
  const supabase = asLooseSupabaseClient(getAdminClient());
  const { data, error } = await supabase
    .from("member_billing_summary")
    .select<MemberBillingSummary>("*")
    .eq("member_id", memberId)
    .maybeSingle();

  if (error) {
    console.error("[member-crm] billing summary lookup failed:", error.message);
    return null;
  }

  return (data as MemberBillingSummary | null) ?? null;
}

export async function refreshMemberHealthSnapshot(member: MemberCrmInsightSubject) {
  const supabase = asLooseSupabaseClient(getAdminClient());
  const sinceIso = toIsoDaysAgo(30);

  const [
    progressResult,
    sessionStartResult,
    listenEventResult,
    journalResult,
    courseProgressResult,
    latestActivityResult,
  ] = await Promise.all([
    supabase
      .from("progress")
      .select<{ listened_at: string }[]>("listened_at")
      .eq("member_id", member.id)
      .gte("listened_at", sinceIso),
    supabase
      .from("activity_event")
      .select<{ occurred_at: string }[]>("occurred_at")
      .eq("member_id", member.id)
      .eq("event_type", "session_start")
      .gte("occurred_at", sinceIso),
    supabase
      .from("activity_event")
      .select<{ occurred_at: string }[]>("occurred_at")
      .eq("member_id", member.id)
      .in("event_type", ["daily_listened", "course_lesson_completed", "course_completed"])
      .gte("occurred_at", sinceIso),
    supabase
      .from("journal")
      .select<{ created_at: string; updated_at: string }[]>("created_at, updated_at")
      .eq("member_id", member.id)
      .gte("created_at", sinceIso),
    supabase
      .from("course_progress")
      .select<{ updated_at: string }[]>("updated_at")
      .eq("member_id", member.id)
      .gte("updated_at", sinceIso),
    supabase
      .from("activity_event")
      .select<{ occurred_at: string }>("occurred_at")
      .eq("member_id", member.id)
      .order("occurred_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const practiceDays = new Set(
    (progressResult.data ?? []).map((row) => row.listened_at.slice(0, 10))
  ).size;
  const logins30 = (sessionStartResult.data ?? []).length;
  const listens30 =
    new Set((progressResult.data ?? []).map((row) => row.listened_at.slice(0, 10))).size +
    (listenEventResult.data ?? []).length;
  const journalEntries30 = (journalResult.data ?? []).length;
  const courseProgressEvents30 = (courseProgressResult.data ?? []).length;

  const lastMeaningfulActivityAt = maxIso([
    member.last_seen_at,
    member.last_practiced_at,
    latestActivityResult.data?.occurred_at ?? null,
    ...((journalResult.data ?? []).flatMap((row) => [row.created_at, row.updated_at])),
    ...((courseProgressResult.data ?? []).map((row) => row.updated_at)),
    ...((progressResult.data ?? []).map((row) => row.listened_at)),
  ]);

  const riskFlags: string[] = [];
  if (member.subscription_status === "past_due") riskFlags.push("past_due");
  if (!member.password_set) riskFlags.push("no_password");
  if (!member.first_login_at) riskFlags.push("no_first_login");
  if (member.fp_promoter_id && !member.paypal_email) riskFlags.push("affiliate_missing_payout_email");

  const idleDays = daysSince(lastMeaningfulActivityAt);
  if (idleDays > 21) riskFlags.push("inactive_21d");
  else if (idleDays > 10) riskFlags.push("drifting");

  let engagementStatus: MemberEngagementStatus = "warming_up";
  if (idleDays > 21 || (logins30 === 0 && listens30 === 0 && journalEntries30 === 0)) {
    engagementStatus = "inactive";
  } else if (practiceDays >= 4 || logins30 >= 4 || listens30 >= 5 || journalEntries30 >= 3) {
    engagementStatus = "engaged";
  }

  let healthStatus: MemberHealthStatus = "healthy";
  if (riskFlags.includes("past_due") || riskFlags.includes("inactive_21d")) {
    healthStatus = "at_risk";
  } else if (
    riskFlags.includes("no_password") ||
    riskFlags.includes("no_first_login") ||
    riskFlags.includes("drifting") ||
    engagementStatus !== "engaged"
  ) {
    healthStatus = "watch";
  }

  const snapshot = {
    member_id: member.id,
    health_status: healthStatus,
    engagement_status: engagementStatus,
    risk_flags: riskFlags,
    last_meaningful_activity_at: lastMeaningfulActivityAt,
    practice_days_30: practiceDays,
    logins_30: logins30,
    listens_30: listens30,
    journal_entries_30: journalEntries30,
    course_progress_events_30: courseProgressEvents30,
    computed_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("member_health_snapshot")
    .upsert(snapshot, { onConflict: "member_id" });

  if (error) {
    console.error("[member-crm] health snapshot upsert failed:", error.message);
  }

  return {
    ...snapshot,
    created_at: snapshot.computed_at,
  } satisfies MemberHealthSnapshot;
}

export function deriveNeedsAttention(args: {
  member: MemberCrmInsightSubject;
  billingSummary: MemberBillingSummary | null;
  healthSnapshot: MemberHealthSnapshot | null;
  currentFollowupTask: MemberFollowupTask | null;
}) {
  const { member, billingSummary, healthSnapshot, currentFollowupTask } = args;
  const cards: MemberNeedsAttentionCard[] = [];

  if (member.subscription_status === "past_due") {
    cards.push({
      key: "past_due",
      label: "Billing needs attention",
      detail: "The member is currently past due and may need recovery or outreach.",
      tab: "billing",
      severity: "urgent",
    });
  }

  if (member.stripe_customer_id && !billingSummary) {
    cards.push({
      key: "billing_summary_missing",
      label: "Billing summary needs sync",
      detail: "Stripe is linked, but the local LTV/payment snapshot has not been backfilled yet.",
      tab: "billing",
      severity: "watch",
    });
  }

  if (!member.password_set) {
    cards.push({
      key: "no_password",
      label: "Password not set",
      detail: "The member is still relying on magic-link access or never completed password setup.",
      tab: "communication",
      severity: "watch",
    });
  }

  if (!member.first_login_at) {
    cards.push({
      key: "no_first_login",
      label: "No first meaningful login yet",
      detail: "This member still looks like an onboarding/support rescue candidate.",
      tab: "overview",
      severity: "watch",
    });
  }

  if (currentFollowupTask?.due_at && daysSince(currentFollowupTask.due_at) > 0) {
    cards.push({
      key: "overdue_followup",
      label: "Follow-up overdue",
      detail: "There is an open follow-up task whose due date has already passed.",
      tab: "notes",
      severity: "urgent",
    });
  }

  if (member.fp_promoter_id && !member.paypal_email) {
    cards.push({
      key: "missing_payout_email",
      label: "Affiliate payout email missing",
      detail: "This affiliate can promote, but payouts are blocked until a PayPal email is added.",
      tab: "communication",
      severity: "watch",
    });
  }

  if (healthSnapshot?.risk_flags.includes("inactive_21d") || healthSnapshot?.engagement_status === "inactive") {
    cards.push({
      key: "inactive",
      label: "Engagement has cooled off",
      detail: "Recent activity has dropped enough that this member may need retention or coaching outreach.",
      tab: "activity",
      severity: "watch",
    });
  } else if (healthSnapshot?.risk_flags.includes("drifting")) {
    cards.push({
      key: "drifting",
      label: "Member is drifting",
      detail: "Usage is slowing down and is worth a check-in before it turns into churn risk.",
      tab: "activity",
      severity: "watch",
    });
  }

  return cards;
}

export function deriveRecommendedNextAction(args: {
  member: MemberCrmInsightSubject;
  billingSummary: MemberBillingSummary | null;
  healthSnapshot: MemberHealthSnapshot | null;
  currentFollowupTask: MemberFollowupTask | null;
  needsAttention: MemberNeedsAttentionCard[];
}) {
  const { member, currentFollowupTask, healthSnapshot, needsAttention } = args;

  if (needsAttention.some((card) => card.key === "past_due")) {
    return {
      label: "Handle billing recovery first",
      detail: "Review the billing state, confirm Stripe is healthy, and guide the member through restoring access.",
      tab: "billing",
    } satisfies MemberRecommendedAction;
  }

  if (currentFollowupTask) {
    return {
      label: "Resolve the open follow-up",
      detail: currentFollowupTask.summary,
      tab: "notes",
    } satisfies MemberRecommendedAction;
  }

  if (!member.first_login_at) {
    return {
      label: "Treat this as an onboarding rescue",
      detail: "Confirm access, reassure the member, and point them to the fastest first win inside Positives.",
      tab: "overview",
    } satisfies MemberRecommendedAction;
  }

  if (healthSnapshot?.engagement_status === "inactive") {
    return {
      label: "Re-engage the practice gently",
      detail: "A coach/support note or a guided reminder toward Today or Practice is probably the highest-value move.",
      tab: "activity",
    } satisfies MemberRecommendedAction;
  }

  if (member.fp_promoter_id && !member.paypal_email) {
    return {
      label: "Help the affiliate finish payout setup",
      detail: "Get the PayPal payout email on file so referrals can convert into payable commissions cleanly.",
      tab: "communication",
    } satisfies MemberRecommendedAction;
  }

  return {
    label: "Review access and recent momentum",
    detail: "The member looks mostly healthy, so the next best move is to confirm access, course ownership, and any support context.",
    tab: "access",
  } satisfies MemberRecommendedAction;
}
