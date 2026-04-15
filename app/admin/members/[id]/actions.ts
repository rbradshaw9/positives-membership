"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdminPermission } from "@/lib/auth/require-admin";
import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";
import { applyAdminPlanChange } from "@/server/services/stripe/admin-plan-change";

type ActionResult = { error?: string };
type IdRow = { id: string };
const MEMBER_DOCUMENT_BUCKET = "member-documents";
const MAX_MEMBER_DOCUMENT_BYTES = 10 * 1024 * 1024;

const FOLLOWUP_STATUSES = new Set([
  "none",
  "needs_followup",
  "waiting_on_member",
  "resolved",
]);

function clean(value: FormDataEntryValue | null) {
  const text = value?.toString().trim() ?? "";
  return text.length > 0 ? text : null;
}

function getUploadedFile(formData: FormData, key: string) {
  const value = formData.get(key);
  if (value instanceof File && value.size > 0) return value;
  return null;
}

function sanitizeFileName(fileName: string) {
  const cleaned = fileName
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
  return cleaned || "document";
}

function memberPath(memberId: string, success?: string, hash?: string) {
  const path = success
    ? `/admin/members/${memberId}?success=${encodeURIComponent(success)}`
    : `/admin/members/${memberId}`;
  return hash ? `${path}#${hash}` : path;
}

function memberBillingPath(memberId: string, params: Record<string, string | null | undefined> = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }
  const suffix = query.size > 0 ? `?${query.toString()}` : "";
  return `/admin/members/${memberId}${suffix}#billing`;
}

function requireClientAuthorization(formData: FormData, reasonFieldName: string): ActionResult & {
  reason?: string;
} {
  const confirmed = formData.get("clientAuthorizationConfirmed") === "on";
  const reason = clean(formData.get(reasonFieldName));

  if (!confirmed) {
    return {
      error:
        "Confirm that this change is authorized by the member/client or approved by the team before saving.",
    };
  }

  if (!reason || reason.length < 3) {
    return { error: "Add a short note explaining why this change is being made." };
  }

  return { reason };
}

async function logAudit(params: {
  actorId: string;
  memberId: string;
  action: string;
  targetType?: string;
  targetId?: string | null;
  reason?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const supabase = asLooseSupabaseClient(getAdminClient());
  const { error } = await supabase.from("member_audit_log").insert({
    actor_member_id: params.actorId,
    target_member_id: params.memberId,
    action: params.action,
    target_type: params.targetType ?? "member",
    target_id: params.targetId ?? null,
    reason: params.reason ?? null,
    metadata: params.metadata ?? {},
  });

  if (error) {
    console.error("[admin/member-actions] audit insert failed:", error.message);
  }
}

async function writeActivity(params: {
  memberId: string;
  eventType: string;
  contentId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const supabase = asLooseSupabaseClient(getAdminClient());
  const { error } = await supabase.from("activity_event").insert({
    member_id: params.memberId,
    event_type: params.eventType,
    content_id: params.contentId ?? null,
    metadata: params.metadata ?? {},
  });

  if (error) {
    console.error("[admin/member-actions] activity insert failed:", error.message);
  }
}

export async function updateMemberCrmProfile(formData: FormData): Promise<ActionResult> {
  const actor = await requireAdminPermission("members.update_profile");
  const memberId = clean(formData.get("memberId"));
  if (!memberId) return { error: "Missing member." };

  const authorization = requireClientAuthorization(formData, "changeReason");
  if (authorization.error || !authorization.reason) return { error: authorization.error };

  const name = clean(formData.get("name"));
  const timezone = clean(formData.get("timezone"));
  const assignedCoachId = clean(formData.get("assignedCoachId"));
  const followupStatus = clean(formData.get("followupStatus"));
  const followupNote = clean(formData.get("followupNote"));

  if (followupStatus && !FOLLOWUP_STATUSES.has(followupStatus)) {
    return { error: "Invalid follow-up status." };
  }

  const updates = {
    name,
    timezone: timezone ?? "America/New_York",
    assigned_coach_id: assignedCoachId,
    followup_status: followupStatus ?? "none",
    followup_note: followupNote,
    followup_at: followupStatus && followupStatus !== "none" ? new Date().toISOString() : null,
  };

  const supabase = asLooseSupabaseClient(getAdminClient());
  const { error } = await supabase.from("member").update(updates).eq("id", memberId);
  if (error) {
    console.error("[admin/member-actions] profile update failed:", error.message);
    return { error: "Could not update member." };
  }

  await logAudit({
    actorId: actor.id,
    memberId,
    action: "member.profile_updated",
    reason: authorization.reason,
    metadata: { ...updates, client_authorization_confirmed: true },
  });

  revalidatePath(`/admin/members/${memberId}`);
  redirect(memberPath(memberId, "profile_updated", "access"));
}

export async function previewMemberPlanChange(formData: FormData): Promise<ActionResult> {
  await requireAdminPermission("members.manage_billing");
  const memberId = clean(formData.get("memberId"));
  const targetKey = clean(formData.get("targetKey"));

  if (!memberId || !targetKey) return { error: "Choose a member and target plan." };

  redirect(memberBillingPath(memberId, { planTarget: targetKey }));
}

export async function applyMemberPlanChange(formData: FormData): Promise<ActionResult> {
  const actor = await requireAdminPermission("members.manage_billing");
  const memberId = clean(formData.get("memberId"));
  const targetKey = clean(formData.get("targetKey"));

  if (!memberId || !targetKey) return { error: "Choose a member and target plan." };

  const authorization = requireClientAuthorization(formData, "changeReason");
  if (authorization.error || !authorization.reason) return { error: authorization.error };

  const supabase = asLooseSupabaseClient(getAdminClient());
  const { data: member, error: memberError } = await supabase
    .from("member")
    .select<{ stripe_customer_id: string | null }>("stripe_customer_id")
    .eq("id", memberId)
    .maybeSingle();

  if (memberError || !member) {
    console.error("[admin/member-actions] plan change member lookup failed:", memberError?.message);
    return { error: "Could not load member billing record." };
  }

  const result = await applyAdminPlanChange({
    memberId,
    actorId: actor.id,
    stripeCustomerId: member.stripe_customer_id,
    targetKey,
    reason: authorization.reason,
  });

  if (!result.ok) return { error: result.error };

  await logAudit({
    actorId: actor.id,
    memberId,
    action: result.kind === "upgrade" ? "billing.plan_upgraded" : "billing.plan_change_scheduled",
    targetType: "stripe_subscription",
    targetId: result.subscriptionId,
    reason: authorization.reason,
    metadata: {
      target_key: result.targetKey,
      current_plan_name: result.currentPlanName,
      target_plan_name: result.targetPlanName,
      amount_due_cents: result.amountDueCents,
      currency: result.currency,
      effective_label: result.effectiveLabel,
      next_billing_label: result.nextBillingLabel,
      client_authorization_confirmed: true,
    },
  });

  revalidatePath(`/admin/members/${memberId}`);
  revalidatePath("/admin/members");
  redirect(memberBillingPath(memberId, {
    success: result.kind === "upgrade" ? "plan_upgraded" : "plan_change_scheduled",
  }));
}

export async function grantCourseToMember(formData: FormData): Promise<ActionResult> {
  const actor = await requireAdminPermission("courses.grant");
  const memberId = clean(formData.get("memberId"));
  const courseId = clean(formData.get("courseId"));
  const grantNote = clean(formData.get("grantNote"));

  if (!memberId || !courseId) return { error: "Missing member or course." };
  const authorization = requireClientAuthorization(formData, "grantNote");
  if (authorization.error || !authorization.reason) return { error: authorization.error };
  if (!grantNote || grantNote.length < 3) {
    return { error: "A short reason is required to grant course access." };
  }

  const supabase = asLooseSupabaseClient(getAdminClient());
  const { data: existing } = await supabase
    .from("course_entitlement")
    .select<IdRow>("id")
    .eq("member_id", memberId)
    .eq("course_id", courseId)
    .eq("status", "active")
    .maybeSingle();

  if (existing?.id) return { error: "This member already has active access." };

  const { data, error } = await supabase
    .from("course_entitlement")
    .insert({
      member_id: memberId,
      course_id: courseId,
      source: "admin_grant",
      status: "active",
      granted_by: actor.id,
      grant_note: grantNote,
    })
    .select<IdRow>("id")
    .single();

  if (error || !data) {
    console.error("[admin/member-actions] course grant failed:", error?.message);
    return { error: "Could not grant course access." };
  }

  await Promise.all([
    logAudit({
      actorId: actor.id,
      memberId,
      action: "course.granted",
      targetType: "course",
      targetId: courseId,
      reason: grantNote,
      metadata: { entitlement_id: data.id, source: "admin_grant" },
    }),
    writeActivity({
      memberId,
      eventType: "admin_course_granted",
      metadata: { course_id: courseId, entitlement_id: data.id },
    }),
  ]);

  revalidatePath(`/admin/members/${memberId}`);
  revalidatePath("/admin/members");
  revalidatePath("/library");
  redirect(memberPath(memberId, "course_granted", "courses"));
}

export async function revokeCourseEntitlement(formData: FormData): Promise<ActionResult> {
  const actor = await requireAdminPermission("courses.revoke");
  const memberId = clean(formData.get("memberId"));
  const entitlementId = clean(formData.get("entitlementId"));
  const revokeNote = clean(formData.get("revokeNote"));

  if (!memberId || !entitlementId) return { error: "Missing entitlement." };
  const authorization = requireClientAuthorization(formData, "revokeNote");
  if (authorization.error || !authorization.reason) return { error: authorization.error };
  if (!revokeNote || revokeNote.length < 3) {
    return { error: "A short reason is required to revoke course access." };
  }

  const supabase = asLooseSupabaseClient(getAdminClient());
  const { data: entitlement } = await supabase
    .from("course_entitlement")
    .select<{ id: string; course_id: string; status: string }>("id, course_id, status")
    .eq("id", entitlementId)
    .eq("member_id", memberId)
    .maybeSingle();

  if (!entitlement?.id) return { error: "Entitlement not found." };
  if (entitlement.status !== "active") return { error: "Entitlement is already inactive." };

  const { error } = await supabase
    .from("course_entitlement")
    .update({
      status: "revoked",
      revoked_by: actor.id,
      revoke_note: revokeNote,
      revoked_at: new Date().toISOString(),
    })
    .eq("id", entitlementId);

  if (error) {
    console.error("[admin/member-actions] course revoke failed:", error.message);
    return { error: "Could not revoke course access." };
  }

  await Promise.all([
    logAudit({
      actorId: actor.id,
      memberId,
      action: "course.revoked",
      targetType: "course_entitlement",
      targetId: entitlementId,
      reason: revokeNote,
      metadata: { course_id: entitlement.course_id },
    }),
    writeActivity({
      memberId,
      eventType: "admin_course_revoked",
      metadata: { course_id: entitlement.course_id, entitlement_id: entitlementId },
    }),
  ]);

  revalidatePath(`/admin/members/${memberId}`);
  revalidatePath("/admin/members");
  revalidatePath("/library");
  redirect(memberPath(memberId, "course_revoked", "courses"));
}

export async function adjustMemberPoints(formData: FormData): Promise<ActionResult> {
  const actor = await requireAdminPermission("points.adjust");
  const memberId = clean(formData.get("memberId"));
  const rawDelta = clean(formData.get("delta"));
  const description = clean(formData.get("description"));

  if (!memberId || !rawDelta) return { error: "Missing member or point amount." };
  const authorization = requireClientAuthorization(formData, "description");
  if (authorization.error || !authorization.reason) return { error: authorization.error };
  const delta = Number.parseInt(rawDelta, 10);
  if (!Number.isFinite(delta) || delta === 0) return { error: "Enter a non-zero point amount." };
  if (!description || description.length < 3) {
    return { error: "A reason is required for point adjustments." };
  }

  const supabase = asLooseSupabaseClient(getAdminClient());
  const { error } = await supabase.from("member_points_ledger").insert({
    member_id: memberId,
    delta,
    reason: "admin_adjustment",
    description,
    created_by: actor.id,
    metadata: { source: "admin_member_crm" },
  });

  if (error) {
    console.error("[admin/member-actions] points adjustment failed:", error.message);
    return { error: "Could not adjust points." };
  }

  await logAudit({
    actorId: actor.id,
    memberId,
    action: "points.adjusted",
    targetType: "points",
    reason: description,
    metadata: { delta },
  });

  revalidatePath(`/admin/members/${memberId}`);
  revalidatePath("/admin/members");
  redirect(memberPath(memberId, "points_adjusted", "points"));
}

export async function addMemberAdminNote(formData: FormData): Promise<ActionResult> {
  const actor = await requireAdminPermission("notes.write");
  const memberId = clean(formData.get("memberId"));
  const body = clean(formData.get("body"));
  const pinned = formData.get("pinned") === "on";

  if (!memberId || !body || body.length < 3) {
    return { error: "Write a note before saving." };
  }

  const supabase = asLooseSupabaseClient(getAdminClient());
  const { data, error } = await supabase
    .from("member_admin_note")
    .insert({
      member_id: memberId,
      author_member_id: actor.id,
      body,
      pinned,
    })
    .select<IdRow>("id")
    .single();

  if (error || !data) {
    console.error("[admin/member-actions] note insert failed:", error?.message);
    return { error: "Could not save note." };
  }

  await logAudit({
    actorId: actor.id,
    memberId,
    action: "note.added",
    targetType: "member_admin_note",
    targetId: data.id,
    reason: pinned ? "Pinned internal note" : "Internal note",
  });

  revalidatePath(`/admin/members/${memberId}`);
  redirect(memberPath(memberId, "note_added", "notes"));
}

export async function addMemberDocumentReference(formData: FormData): Promise<ActionResult> {
  const actor = await requireAdminPermission("documents.write");
  const memberId = clean(formData.get("memberId"));
  const title = clean(formData.get("title"));
  const externalUrl = clean(formData.get("externalUrl"));
  const note = clean(formData.get("note"));
  const file = getUploadedFile(formData, "documentFile");

  if (!memberId || !title) return { error: "Document title is required." };
  if (!externalUrl && !file) return { error: "Add a document file or link." };

  const authorization = requireClientAuthorization(formData, "documentReason");
  if (authorization.error || !authorization.reason) return { error: authorization.error };

  if (file && file.size > MAX_MEMBER_DOCUMENT_BYTES) {
    return { error: "Document uploads are limited to 10 MB." };
  }

  const supabase = asLooseSupabaseClient(getAdminClient());
  let storagePath: string | null = null;
  let fileName: string | null = null;
  let contentType: string | null = null;
  let sizeBytes: number | null = null;

  if (file) {
    fileName = sanitizeFileName(file.name);
    contentType = file.type || "application/octet-stream";
    sizeBytes = file.size;
    storagePath = `${memberId}/${randomUUID()}-${fileName}`;

    const upload = await supabase.storage
      .from(MEMBER_DOCUMENT_BUCKET)
      .upload(storagePath, Buffer.from(await file.arrayBuffer()), {
        contentType,
        upsert: false,
      });

    if (upload.error) {
      console.error("[admin/member-actions] document upload failed:", upload.error.message);
      return { error: "Could not upload document." };
    }
  }

  const { data, error } = await supabase
    .from("member_document")
    .insert({
      member_id: memberId,
      uploaded_by: actor.id,
      title,
      external_url: externalUrl,
      storage_path: storagePath,
      file_name: fileName,
      content_type: contentType,
      size_bytes: sizeBytes,
      internal_only: true,
      note,
    })
    .select<IdRow>("id")
    .single();

  if (error || !data) {
    console.error("[admin/member-actions] document insert failed:", error?.message);
    return { error: "Could not save document." };
  }

  await logAudit({
    actorId: actor.id,
    memberId,
    action: "document.added",
    targetType: "member_document",
    targetId: data.id,
    reason: authorization.reason,
    metadata: {
      external_url: externalUrl,
      storage_path: storagePath,
      file_name: fileName,
      content_type: contentType,
      size_bytes: sizeBytes,
      client_authorization_confirmed: true,
    },
  });

  revalidatePath(`/admin/members/${memberId}`);
  redirect(memberPath(memberId, "document_added", "documents"));
}

export async function unlockCourseWithPointsForMember(formData: FormData): Promise<ActionResult> {
  const actor = await requireAdminPermission("points.adjust");
  const memberId = clean(formData.get("memberId"));
  const courseId = clean(formData.get("courseId"));
  const rawCost = clean(formData.get("pointsCost"));
  const note = clean(formData.get("note")) ?? "Admin points unlock";

  if (!memberId || !courseId || !rawCost) return { error: "Missing unlock details." };
  const authorization = requireClientAuthorization(formData, "note");
  if (authorization.error || !authorization.reason) return { error: authorization.error };
  const cost = Number.parseInt(rawCost, 10);
  if (!Number.isFinite(cost) || cost <= 0) return { error: "Invalid point cost." };

  const supabase = asLooseSupabaseClient(getAdminClient());
  const { data: pointRows, error: pointError } = await supabase
    .from("member_points_ledger")
    .select<{ delta: number }[]>("delta")
    .eq("member_id", memberId);

  if (pointError) {
    console.error("[admin/member-actions] points lookup failed:", pointError.message);
    return { error: "Could not verify points balance." };
  }

  const balance = (pointRows ?? []).reduce((sum: number, row: { delta: number }) => sum + row.delta, 0);
  if (balance < cost) return { error: "Member does not have enough points." };

  const { data: entitlement } = await supabase
    .from("course_entitlement")
    .select<IdRow>("id")
    .eq("member_id", memberId)
    .eq("course_id", courseId)
    .eq("status", "active")
    .maybeSingle();

  if (entitlement?.id) return { error: "Member already has this course." };

  const { data: newEntitlement, error: grantError } = await supabase
    .from("course_entitlement")
    .insert({
      member_id: memberId,
      course_id: courseId,
      source: "points_unlock",
      status: "active",
      granted_by: actor.id,
      grant_note: note,
    })
    .select<IdRow>("id")
    .single();

  if (grantError || !newEntitlement) {
    console.error("[admin/member-actions] points unlock grant failed:", grantError?.message);
    return { error: "Could not unlock course." };
  }

  const { error: ledgerError } = await supabase.from("member_points_ledger").insert({
    member_id: memberId,
    delta: -cost,
    reason: "course_unlock",
    description: note,
    course_id: courseId,
    created_by: actor.id,
    metadata: { entitlement_id: newEntitlement.id },
  });

  if (ledgerError) {
    console.error("[admin/member-actions] points unlock ledger failed:", ledgerError.message);
    return { error: "Course was granted, but the points ledger failed. Review member audit." };
  }

  await Promise.all([
    logAudit({
      actorId: actor.id,
      memberId,
      action: "course.unlocked_with_points",
      targetType: "course",
      targetId: courseId,
      reason: note,
      metadata: { points_cost: cost, entitlement_id: newEntitlement.id },
    }),
    writeActivity({
      memberId,
      eventType: "course_unlocked",
      metadata: { course_id: courseId, points_cost: cost },
    }),
  ]);

  revalidatePath(`/admin/members/${memberId}`);
  revalidatePath("/library");
  redirect(memberPath(memberId, "course_unlocked", "courses"));
}

export async function assignAdminRoleToMember(formData: FormData): Promise<ActionResult> {
  const actor = await requireAdminPermission("roles.manage");
  const memberId = clean(formData.get("memberId"));
  const roleId = clean(formData.get("roleId"));

  if (!memberId || !roleId) return { error: "Missing member or role." };

  const supabase = asLooseSupabaseClient(getAdminClient());
  const { error } = await supabase.from("admin_user_role").upsert(
    {
      member_id: memberId,
      role_id: roleId,
      assigned_by: actor.id,
    },
    { onConflict: "member_id,role_id" }
  );

  if (error) {
    console.error("[admin/member-actions] role assign failed:", error.message);
    return { error: "Could not assign role." };
  }

  await logAudit({
    actorId: actor.id,
    memberId,
    action: "admin_role.assigned",
    targetType: "admin_role",
    targetId: roleId,
    reason: "Admin role assignment",
  });

  revalidatePath(`/admin/members/${memberId}`);
  redirect(memberPath(memberId, "role_assigned", "communication"));
}

export async function removeAdminRoleFromMember(formData: FormData): Promise<ActionResult> {
  const actor = await requireAdminPermission("roles.manage");
  const memberId = clean(formData.get("memberId"));
  const roleKey = clean(formData.get("roleKey"));

  if (!memberId || !roleKey) return { error: "Missing member or role." };

  const supabase = asLooseSupabaseClient(getAdminClient());
  const { data: role } = await supabase
    .from("admin_role")
    .select<IdRow>("id")
    .eq("key", roleKey)
    .maybeSingle();

  if (!role?.id) return { error: "Role not found." };

  const { error } = await supabase
    .from("admin_user_role")
    .delete()
    .eq("member_id", memberId)
    .eq("role_id", role.id);

  if (error) {
    console.error("[admin/member-actions] role remove failed:", error.message);
    return { error: "Could not remove role." };
  }

  await logAudit({
    actorId: actor.id,
    memberId,
    action: "admin_role.removed",
    targetType: "admin_role",
    targetId: role.id,
    reason: "Admin role removal",
    metadata: { role_key: roleKey },
  });

  revalidatePath(`/admin/members/${memberId}`);
  redirect(memberPath(memberId, "role_removed", "communication"));
}
