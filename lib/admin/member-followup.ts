import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";

export type MemberFollowupStatus =
  | "none"
  | "needs_followup"
  | "waiting_on_member"
  | "resolved";

export type MemberFollowupTask = {
  id: string;
  member_id: string;
  owner_member_id: string | null;
  status: Exclude<MemberFollowupStatus, "none">;
  due_at: string | null;
  category: string | null;
  summary: string;
  details: string | null;
  created_by: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  owner?: { id: string; email: string; name: string | null } | null;
  creator?: { id: string; email: string; name: string | null } | null;
};

export async function getMemberFollowupTasks(memberId: string, limit = 12) {
  const supabase = asLooseSupabaseClient(getAdminClient());
  const { data, error } = await supabase
    .from("member_followup_task")
    .select<MemberFollowupTask[]>(
      "id, member_id, owner_member_id, status, due_at, category, summary, details, created_by, completed_at, created_at, updated_at, owner:owner_member_id(id, email, name), creator:created_by(id, email, name)"
    )
    .eq("member_id", memberId)
    .order("completed_at", { ascending: true, nullsFirst: true })
    .order("due_at", { ascending: true, nullsFirst: true })
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[member-followup] task query failed:", error.message);
    return [];
  }

  return (data ?? []) as MemberFollowupTask[];
}

export async function getCurrentOpenFollowupTask(memberId: string) {
  const supabase = asLooseSupabaseClient(getAdminClient());
  const { data, error } = await supabase
    .from("member_followup_task")
    .select<MemberFollowupTask[]>(
      "id, member_id, owner_member_id, status, due_at, category, summary, details, created_by, completed_at, created_at, updated_at, owner:owner_member_id(id, email, name), creator:created_by(id, email, name)"
    )
    .eq("member_id", memberId)
    .in("status", ["needs_followup", "waiting_on_member"])
    .order("due_at", { ascending: true, nullsFirst: true })
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[member-followup] current task lookup failed:", error.message);
    return null;
  }

  return (data as MemberFollowupTask | null) ?? null;
}

export async function syncMemberFollowupSummary(memberId: string) {
  const supabase = asLooseSupabaseClient(getAdminClient());
  const currentTask = await getCurrentOpenFollowupTask(memberId);

  const updates = currentTask
    ? {
        followup_status: currentTask.status,
        followup_note: currentTask.summary,
        followup_at: currentTask.due_at ?? currentTask.updated_at,
      }
    : {
        followup_status: "none" as const,
        followup_note: null,
        followup_at: null,
      };

  const { error } = await supabase.from("member").update(updates).eq("id", memberId);
  if (error) {
    console.error("[member-followup] summary sync failed:", error.message);
  }

  return currentTask;
}
