"use server";

import { revalidatePath } from "next/cache";
import { requireAdminPermission } from "@/lib/auth/require-admin";
import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";
import {
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

export async function updateBetaFeedbackSubmission(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const actor = await requireAdminPermission("notes.write");
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
  const { data: existing, error: existingError } = await supabase
    .from("beta_feedback_submission")
    .select<{
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
    }>("id, member_id, status, severity, category, assigned_member_id, triage_notes, approved_for_development, approved_for_development_at, approved_for_development_by_member_id")
    .eq("id", feedbackId)
    .maybeSingle();

  if (existingError || !existing) {
    console.error("[beta-feedback] existing fetch failed:", existingError?.message);
    return { error: "We couldn't load that feedback record." };
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
        },
        approval_changed: approvalChanged,
      },
    });
  }

  revalidatePath("/admin/beta-feedback");
  return { success: "Feedback triage updated." };
}
