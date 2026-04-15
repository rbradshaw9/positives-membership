import { createClient } from "@/lib/supabase/server";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";
import { hasActiveMemberAccess } from "@/lib/subscription/access";

type PointsLedgerReason =
  | "daily_practice"
  | "journal_entry"
  | "course_lesson_complete"
  | "course_complete"
  | "community_post"
  | "community_reply"
  | "event_attended"
  | "course_unlock"
  | "admin_adjustment"
  | "reversal";

type AwardMemberPointsInput = {
  memberId: string;
  delta: number;
  reason: PointsLedgerReason;
  description: string;
  idempotencyKey: string;
  courseId?: string | null;
  contentId?: string | null;
  activityEventId?: string | null;
  metadata?: Record<string, unknown>;
};

export const POINT_VALUES = {
  dailyPractice: 1,
  journalEntry: 1,
  courseLessonComplete: 1,
  courseComplete: 10,
  communityPost: 2,
  communityReply: 1,
  eventAttended: 5,
} as const;

export const POINT_DAILY_CAPS: Partial<Record<PointsLedgerReason, number>> = {
  daily_practice: 1,
  journal_entry: 3,
  community_post: 4,
  community_reply: 3,
  event_attended: 10,
} as const;

async function memberCanEarnPoints(memberId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("member")
    .select("subscription_status")
    .eq("id", memberId)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("[points] member lookup failed:", error.message);
    return false;
  }

  return hasActiveMemberAccess(data.subscription_status);
}

async function getAwardableDelta(input: AwardMemberPointsInput): Promise<number> {
  const dailyCap = POINT_DAILY_CAPS[input.reason];
  if (!dailyCap) return input.delta;

  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);

  const supabase = asLooseSupabaseClient(await createClient());
  const { data, error } = await supabase
    .from("member_points_ledger")
    .select<{ delta: number }[]>("delta")
    .eq("member_id", input.memberId)
    .eq("reason", input.reason)
    .gt("delta", 0)
    .gte("created_at", startOfToday.toISOString());

  if (error) {
    console.error("[points] cap lookup failed:", error.message);
    return input.delta;
  }

  const alreadyEarned = (data ?? []).reduce(
    (sum: number, row: { delta: number }) => sum + Number(row.delta),
    0
  );
  const remaining = Math.max(0, dailyCap - alreadyEarned);
  return Math.min(input.delta, remaining);
}

export async function awardMemberPoints(input: AwardMemberPointsInput): Promise<void> {
  if (input.delta <= 0) return;

  const canEarn = await memberCanEarnPoints(input.memberId);
  if (!canEarn) return;

  const awardableDelta = await getAwardableDelta(input);
  if (awardableDelta <= 0) return;

  const supabase = asLooseSupabaseClient(await createClient());
  const { error } = await supabase.from("member_points_ledger").insert({
    member_id: input.memberId,
    delta: awardableDelta,
    reason: input.reason,
    description: input.description,
    course_id: input.courseId ?? null,
    content_id: input.contentId ?? null,
    activity_event_id: input.activityEventId ?? null,
    idempotency_key: input.idempotencyKey,
    metadata: {
      ...(input.metadata ?? {}),
      requested_delta: input.delta,
      daily_cap: POINT_DAILY_CAPS[input.reason] ?? null,
    },
  });

  if (error && error.code !== "23505") {
    console.error("[points] award failed:", error.message);
  }
}

export async function getMemberPointsBalance(memberId: string): Promise<number> {
  const supabase = asLooseSupabaseClient(await createClient());
  const { data, error } = await supabase
    .from("member_points_ledger")
    .select<{ delta: number }[]>("delta")
    .eq("member_id", memberId);

  if (error) {
    console.error("[points] balance lookup failed:", error.message);
    return 0;
  }

  return (data ?? []).reduce((sum: number, row: { delta: number }) => sum + Number(row.delta), 0);
}
