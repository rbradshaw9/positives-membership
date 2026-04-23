"use server";

import { revalidatePath } from "next/cache";
import { config } from "@/lib/config";
import { addCommentToAsanaTask, createAsanaTaskForBetaFeedback } from "@/lib/integrations/asana";
import { memberHasAdminRoleKey, requireAdminPermission } from "@/lib/auth/require-admin";
import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";
import {
  isBetaFeedbackCommentVisibility,
  isBetaFeedbackCategory,
  isBetaFeedbackSeverity,
  isBetaFeedbackStatus,
} from "@/lib/beta-feedback/shared";

type ActionState = {
  success?: string;
  error?: string;
};

function clean(value: FormDataEntryValue | null) {
  const text = value?.toString().trim() ?? "";
  return text.length > 0 ? text : null;
}

async function logAudit(params: {
  actorId: string;
  memberId: string;
  targetId: string;
  reason: string | null;
  metadata: Record<string, unknown>;
}) {
  const supabase = asLooseSupabaseClient(getAdminClient());
  const { error } = await supabase.from("member_audit_log").insert({
    actor_member_id: params.actorId,
    target_member_id: params.memberId,
    action: "beta_feedback.updated",
    target_type: "beta_feedback_submission",
    target_id: params.targetId,
    reason: params.reason,
    metadata: params.metadata,
  });

  if (error) {
    console.error("[beta-feedback] audit insert failed:", error.message);
  }
}

type ExistingFeedbackRecord = {
  id: string;
  member_id: string | null;
  status: string;
  severity: string;
  category: string;
  assigned_member_id: string | null;
  triage_notes: string | null;
  approved_for_development: boolean;
  approved_for_development_at: string | null;
  approved_for_development_by_member_id: string | null;
  asana_task_gid: string | null;
  asana_task_url: string | null;
  summary: string;
  details: string;
  expected_behavior: string | null;
  page_url: string | null;
  page_path: string | null;
  browser_name: string | null;
  os_name: string | null;
  device_type: string | null;
  member_email: string;
  member_name: string | null;
};

async function getExistingFeedback(feedbackId: string) {
  const supabase = asLooseSupabaseClient(getAdminClient());
  const { data, error } = await supabase
    .from("beta_feedback_submission")
    .select<ExistingFeedbackRecord>(
      "id, member_id, status, severity, category, assigned_member_id, triage_notes, approved_for_development, approved_for_development_at, approved_for_development_by_member_id, asana_task_gid, asana_task_url, summary, details, expected_behavior, page_url, page_path, browser_name, os_name, device_type, member_email, member_name"
    )
    .eq("id", feedbackId)
    .maybeSingle();

  return { data, error };
}

export async function updateBetaFeedbackSubmission(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const actor = await requireAdminPermission("notes.write");
  const isSuperAdmin = await memberHasAdminRoleKey(actor.id, "super_admin");
  const feedbackId = clean(formData.get("feedbackId"));
  const status = clean(formData.get("status"));
  const severity = clean(formData.get("severity"));
  const category = clean(formData.get("category"));
  const assignedMemberId = clean(formData.get("assignedMemberId"));
  const triageNotes = clean(formData.get("triageNotes"));
  const approvedForDevelopment = formData.get("approvedForDevelopment") === "on";

  if (!feedbackId) {
    return { error: "Missing feedback record." };
  }

  if (!status || !isBetaFeedbackStatus(status)) {
    return { error: "Choose a valid queue status." };
  }

  if (!severity || !isBetaFeedbackSeverity(severity)) {
    return { error: "Choose a valid severity level." };
  }

  if (!category || !isBetaFeedbackCategory(category)) {
    return { error: "Choose a valid category." };
  }

  if (approvedForDevelopment && !triageNotes) {
    return { error: "Add a short internal note before approving this for development." };
  }

  const supabase = asLooseSupabaseClient(getAdminClient());
  const { data: existing, error: existingError } = await getExistingFeedback(feedbackId);

  if (existingError || !existing) {
    console.error("[beta-feedback] existing fetch failed:", existingError?.message);
    return { error: "We couldn't load that feedback record." };
  }

  if (approvedForDevelopment !== existing.approved_for_development && !isSuperAdmin) {
    return { error: "Only a super admin can approve feedback for development." };
  }

  const resolvedAt =
    status === "resolved" || status === "closed" ? new Date().toISOString() : null;
  const approvalChanged = approvedForDevelopment !== existing.approved_for_development;
  const approvedForDevelopmentAt = approvedForDevelopment
    ? existing.approved_for_development_at ?? new Date().toISOString()
    : null;
  const approvedForDevelopmentByMemberId = approvedForDevelopment
    ? existing.approved_for_development_by_member_id ?? actor.id
    : null;
  const approvalCreatedTask =
    approvalChanged && approvedForDevelopment && !existing.asana_task_gid && isSuperAdmin;

  let asanaTaskGid = existing.asana_task_gid;
  let asanaTaskUrl = existing.asana_task_url;
  let asanaTaskCreatedAt = null as string | null;

  if (approvalCreatedTask) {
    const queueUrl = `${config.app.url.replace(/\/$/, "")}/admin/beta-feedback`;
    const asanaResult = await createAsanaTaskForBetaFeedback({
      feedbackId: existing.id,
      memberEmail: existing.member_email,
      memberName: existing.member_name,
      summary: existing.summary,
      details: existing.details,
      expectedBehavior: existing.expected_behavior,
      category,
      severity,
      pageUrl: existing.page_url,
      pagePath: existing.page_path,
      browserName: existing.browser_name,
      osName: existing.os_name,
      deviceType: existing.device_type,
      triageNotes,
      approvalNotes: triageNotes,
      adminQueueUrl: queueUrl,
    });

    if (!asanaResult.created) {
      return { error: `Approval saved blocked: ${asanaResult.reason ?? "Asana task creation failed."}` };
    }

    asanaTaskGid = asanaResult.taskGid;
    asanaTaskUrl = asanaResult.taskUrl;
    asanaTaskCreatedAt = new Date().toISOString();
  }

  const { error } = await supabase
    .from("beta_feedback_submission")
    .update({
      status,
      severity,
      category,
      assigned_member_id: assignedMemberId,
      triage_notes: triageNotes,
      approved_for_development: approvedForDevelopment,
      approved_for_development_at: approvedForDevelopmentAt,
      approved_for_development_by_member_id: approvedForDevelopmentByMemberId,
      asana_task_gid: asanaTaskGid,
      asana_task_url: asanaTaskUrl,
      asana_task_created_at: asanaTaskCreatedAt ?? undefined,
      resolved_at: resolvedAt,
    })
    .eq("id", feedbackId);

  if (error) {
    console.error("[beta-feedback] update failed:", error.message);
    return { error: "We couldn't save those triage updates just yet." };
  }

  if (existing.member_id) {
    await logAudit({
      actorId: actor.id,
      memberId: existing.member_id,
      targetId: feedbackId,
      reason: triageNotes,
      metadata: {
        previous: {
          status: existing.status,
          severity: existing.severity,
          category: existing.category,
          assigned_member_id: existing.assigned_member_id,
          triage_notes: existing.triage_notes,
          approved_for_development: existing.approved_for_development,
          approved_for_development_at: existing.approved_for_development_at,
          approved_for_development_by_member_id:
            existing.approved_for_development_by_member_id,
        },
        next: {
          status,
          severity,
          category,
          assigned_member_id: assignedMemberId,
          triage_notes: triageNotes,
          approved_for_development: approvedForDevelopment,
          approved_for_development_at: approvedForDevelopmentAt,
          approved_for_development_by_member_id: approvedForDevelopmentByMemberId,
          asana_task_gid: asanaTaskGid,
          asana_task_url: asanaTaskUrl,
        },
        approval_changed: approvalChanged,
        asana_task_created: approvalCreatedTask,
      },
    });
  }

  revalidatePath("/admin/beta-feedback");
  return {
    success: approvalCreatedTask
      ? "Feedback approved and sent to Asana."
      : "Feedback triage updated.",
  };
}

export async function addBetaFeedbackComment(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const actor = await requireAdminPermission("notes.write");
  const isSuperAdmin = await memberHasAdminRoleKey(actor.id, "super_admin");
  const feedbackId = clean(formData.get("feedbackId"));
  const visibility = clean(formData.get("visibility"));
  const body = clean(formData.get("body"));
  const alsoSendToAsana = formData.get("alsoSendToAsana") === "on";

  if (!feedbackId) {
    return { error: "Missing feedback record." };
  }

  if (!visibility || !isBetaFeedbackCommentVisibility(visibility)) {
    return { error: "Choose whether this note is internal or visible to the member." };
  }

  if (!body || body.length < 4) {
    return { error: "Add a little more detail to the note." };
  }

  if (alsoSendToAsana && !isSuperAdmin) {
    return { error: "Only a super admin can send clarification notes to Asana." };
  }

  const { data: existing, error: existingError } = await getExistingFeedback(feedbackId);
  if (existingError || !existing) {
    console.error("[beta-feedback] existing fetch failed:", existingError?.message);
    return { error: "We couldn't load that feedback record." };
  }

  if (alsoSendToAsana && !existing.asana_task_gid) {
    return { error: "Approve this feedback first so there is an Asana task to update." };
  }

  const supabase = asLooseSupabaseClient(getAdminClient());
  const { data: insertedComment, error } = await supabase
    .from("beta_feedback_comment")
    .insert({
      feedback_submission_id: feedbackId,
      author_member_id: actor.id,
      author_name: null,
      author_email: actor.email ?? null,
      author_kind: "admin",
      visibility,
      body,
      metadata: {
        sent_to_asana: false,
      },
    })
    .select<{ id: string }>("id")
    .single();

  if (error) {
    console.error("[beta-feedback] comment insert failed:", error.message);
    return { error: "We couldn't save that note just yet." };
  }

  await supabase
    .from("beta_feedback_submission")
    .update({
      updated_at: new Date().toISOString(),
    })
    .eq("id", feedbackId);

  let asanaMessage = "";
  if (alsoSendToAsana && existing.asana_task_gid) {
    const asanaResult = await addCommentToAsanaTask(
      existing.asana_task_gid,
      [
        "Super admin clarification note:",
        body,
        "",
        `Feedback source: ${existing.id}`,
      ].join("\n")
    );

    if (!asanaResult.added) {
      return {
        error: `The note was saved here, but Asana sync failed: ${asanaResult.reason ?? "unknown error"}`,
      };
    }

    asanaMessage = " Note also added to Asana.";

    if (insertedComment?.id) {
      await supabase
        .from("beta_feedback_comment")
        .update({
          metadata: {
            sent_to_asana: true,
          },
        })
        .eq("id", insertedComment.id);
    }
  }

  if (existing.member_id) {
    await logAudit({
      actorId: actor.id,
      memberId: existing.member_id,
      targetId: feedbackId,
      reason: body,
      metadata: {
        comment_visibility: visibility,
        sent_to_asana: alsoSendToAsana && Boolean(existing.asana_task_gid),
      },
    });
  }

  revalidatePath("/admin/beta-feedback");
  revalidatePath("/today");
  revalidatePath("/community");
  revalidatePath("/account");
  return {
    success:
      visibility === "member"
        ? `Reply added for the member.${asanaMessage}`
        : `Internal note saved.${asanaMessage}`,
  };
}
