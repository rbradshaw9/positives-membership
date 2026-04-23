import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";
import type {
  BetaFeedbackCategory,
  BetaFeedbackCommentVisibility,
  BetaFeedbackSeverity,
  BetaFeedbackStatus,
} from "@/lib/beta-feedback/shared";

export type BetaFeedbackCommentRecord = {
  id: string;
  created_at: string;
  updated_at: string;
  feedback_submission_id: string;
  author_member_id: string | null;
  author_name: string | null;
  author_email: string | null;
  author_kind: string;
  visibility: BetaFeedbackCommentVisibility;
  body: string;
  metadata: Record<string, unknown>;
};

export type MemberBetaFeedbackThread = {
  id: string;
  created_at: string;
  updated_at: string;
  summary: string;
  details: string;
  expected_behavior: string | null;
  category: BetaFeedbackCategory;
  severity: BetaFeedbackSeverity;
  status: BetaFeedbackStatus;
  member_last_viewed_at: string | null;
  approved_for_development: boolean;
  comments: BetaFeedbackCommentRecord[];
  unreadReplyCount: number;
};

export async function getBetaFeedbackCommentsMap(
  feedbackIds: string[],
  visibility: "all" | BetaFeedbackCommentVisibility = "all"
) {
  if (feedbackIds.length === 0) {
    return new Map<string, BetaFeedbackCommentRecord[]>();
  }

  const supabase = asLooseSupabaseClient(getAdminClient());
  let query = supabase
    .from("beta_feedback_comment")
    .select<BetaFeedbackCommentRecord[]>(
      "id, created_at, updated_at, feedback_submission_id, author_member_id, author_name, author_email, author_kind, visibility, body, metadata"
    )
    .in("feedback_submission_id", feedbackIds)
    .order("created_at", { ascending: true });

  if (visibility !== "all") {
    query = query.eq("visibility", visibility);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[beta-feedback] comment lookup failed:", error.message);
    return new Map<string, BetaFeedbackCommentRecord[]>();
  }

  const grouped = new Map<string, BetaFeedbackCommentRecord[]>();
  for (const row of data ?? []) {
    const existing = grouped.get(row.feedback_submission_id) ?? [];
    existing.push(row);
    grouped.set(row.feedback_submission_id, existing);
  }

  return grouped;
}

export async function getMemberBetaFeedbackThreads(memberId: string) {
  const supabase = asLooseSupabaseClient(getAdminClient());
  const { data, error } = await supabase
    .from("beta_feedback_submission")
    .select<
      Array<{
        id: string;
        created_at: string;
        updated_at: string;
        summary: string;
        details: string;
        expected_behavior: string | null;
        category: BetaFeedbackCategory;
        severity: BetaFeedbackSeverity;
        status: BetaFeedbackStatus;
        member_last_viewed_at: string | null;
        approved_for_development: boolean;
      }>
    >(
      "id, created_at, updated_at, summary, details, expected_behavior, category, severity, status, member_last_viewed_at, approved_for_development"
    )
    .eq("member_id", memberId)
    .order("updated_at", { ascending: false })
    .limit(12);

  if (error) {
    console.error("[beta-feedback] member thread lookup failed:", error.message);
    return { threads: [] as MemberBetaFeedbackThread[], unreadCount: 0 };
  }

  const rows = data ?? [];
  const commentsMap = await getBetaFeedbackCommentsMap(
    rows.map((row) => row.id),
    "member"
  );

  const threads = rows.map((row) => {
    const comments = commentsMap.get(row.id) ?? [];
    const unreadReplyCount = comments.filter((comment) => {
      if (comment.author_member_id === memberId) return false;
      if (!row.member_last_viewed_at) return true;
      return new Date(comment.created_at).getTime() > new Date(row.member_last_viewed_at).getTime();
    }).length;

    return {
      ...row,
      comments,
      unreadReplyCount,
    };
  });

  return {
    threads,
    unreadCount: threads.reduce((sum, thread) => sum + thread.unreadReplyCount, 0),
  };
}
