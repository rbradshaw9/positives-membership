"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdminPermission } from "@/lib/auth/require-admin";
import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";

type ActionResult = { error?: string; success?: string };

function clean(value: FormDataEntryValue | null) {
  const text = value?.toString().trim() ?? "";
  return text.length > 0 ? text : null;
}

function enrollmentPath(courseId: string, params: Record<string, string | null | undefined> = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }
  const suffix = query.size > 0 ? `?${query.toString()}` : "";
  return `/admin/courses/${courseId}/enrollments${suffix}`;
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
    console.error("[admin/course-enrollments] audit insert failed:", error.message);
  }
}

async function writeActivity(params: {
  memberId: string;
  eventType: string;
  metadata?: Record<string, unknown>;
}) {
  const supabase = asLooseSupabaseClient(getAdminClient());
  const { error } = await supabase.from("activity_event").insert({
    member_id: params.memberId,
    event_type: params.eventType,
    metadata: params.metadata ?? {},
  });

  if (error) {
    console.error("[admin/course-enrollments] activity insert failed:", error.message);
  }
}

export async function grantCourseEnrollment(formData: FormData) {
  const actor = await requireAdminPermission("courses.grant");
  const courseId = clean(formData.get("courseId"));
  const rawEmail = clean(formData.get("memberEmail"));
  const grantNote = clean(formData.get("grantNote"));

  if (!courseId || !rawEmail) {
    redirect(enrollmentPath(courseId ?? "", { error: "missing_grant" }));
  }

  const authorization = requireClientAuthorization(formData, "grantNote");
  if (authorization.error || !authorization.reason || !grantNote) {
    redirect(enrollmentPath(courseId, { error: "authorization_required" }));
  }

  const email = rawEmail.toLowerCase();
  const supabase = asLooseSupabaseClient(getAdminClient());

  const { data: course, error: courseError } = await supabase
    .from("course")
    .select<{ id: string; title: string }>("id, title")
    .eq("id", courseId)
    .maybeSingle();

  if (courseError || !course) {
    console.error("[admin/course-enrollments] course lookup failed:", courseError?.message);
    redirect("/admin/courses?error=not_found");
  }

  const { data: member, error: memberError } = await supabase
    .from("member")
    .select<{ id: string; email: string; name: string | null }>("id, email, name")
    .eq("email", email)
    .maybeSingle();

  if (memberError || !member) {
    if (memberError) {
      console.error("[admin/course-enrollments] member lookup failed:", memberError.message);
    }
    redirect(enrollmentPath(courseId, { error: "member_not_found" }));
  }

  const { data: existing } = await supabase
    .from("course_entitlement")
    .select<{ id: string; status: string }>("id, status")
    .eq("member_id", member.id)
    .eq("course_id", courseId)
    .eq("status", "active")
    .maybeSingle();

  if (existing?.id) {
    redirect(enrollmentPath(courseId, { error: "already_enrolled" }));
  }

  const { data: newEntitlement, error: grantError } = await supabase
    .from("course_entitlement")
    .insert({
      member_id: member.id,
      course_id: courseId,
      source: "admin_grant",
      status: "active",
      granted_by: actor.id,
      grant_note: grantNote,
    })
    .select<{ id: string }>("id")
    .single();

  if (grantError || !newEntitlement) {
    console.error("[admin/course-enrollments] course grant failed:", grantError?.message);
    redirect(enrollmentPath(courseId, { error: "grant_failed" }));
  }

  await Promise.all([
    logAudit({
      actorId: actor.id,
      memberId: member.id,
      action: "course.granted",
      targetType: "course",
      targetId: courseId,
      reason: grantNote,
      metadata: { entitlement_id: newEntitlement.id, source: "admin_grant", course_title: course.title },
    }),
    writeActivity({
      memberId: member.id,
      eventType: "admin_course_granted",
      metadata: { course_id: courseId, entitlement_id: newEntitlement.id },
    }),
  ]);

  revalidatePath(`/admin/courses/${courseId}/enrollments`);
  revalidatePath(`/admin/courses/${courseId}`);
  revalidatePath(`/admin/members/${member.id}`);
  revalidatePath("/admin/courses");
  revalidatePath("/my-courses");
  redirect(enrollmentPath(courseId, { success: "granted" }));
}

export async function revokeCourseEnrollment(formData: FormData) {
  const actor = await requireAdminPermission("courses.revoke");
  const courseId = clean(formData.get("courseId"));
  const entitlementId = clean(formData.get("entitlementId"));
  const revokeNote = clean(formData.get("revokeNote"));

  if (!courseId || !entitlementId) {
    redirect(enrollmentPath(courseId ?? "", { error: "missing_revoke" }));
  }

  const authorization = requireClientAuthorization(formData, "revokeNote");
  if (authorization.error || !authorization.reason || !revokeNote) {
    redirect(enrollmentPath(courseId, { error: "authorization_required" }));
  }

  const supabase = asLooseSupabaseClient(getAdminClient());
  const { data: entitlement } = await supabase
    .from("course_entitlement")
    .select<{ id: string; member_id: string; course_id: string; status: string }>(
      "id, member_id, course_id, status"
    )
    .eq("id", entitlementId)
    .eq("course_id", courseId)
    .maybeSingle();

  if (!entitlement?.id) {
    redirect(enrollmentPath(courseId, { error: "entitlement_not_found" }));
  }

  if (entitlement.status !== "active") {
    redirect(enrollmentPath(courseId, { error: "already_inactive" }));
  }

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
    console.error("[admin/course-enrollments] course revoke failed:", error.message);
    redirect(enrollmentPath(courseId, { error: "revoke_failed" }));
  }

  await Promise.all([
    logAudit({
      actorId: actor.id,
      memberId: entitlement.member_id,
      action: "course.revoked",
      targetType: "course_entitlement",
      targetId: entitlementId,
      reason: revokeNote,
      metadata: { course_id: entitlement.course_id },
    }),
    writeActivity({
      memberId: entitlement.member_id,
      eventType: "admin_course_revoked",
      metadata: { course_id: entitlement.course_id, entitlement_id: entitlementId },
    }),
  ]);

  revalidatePath(`/admin/courses/${courseId}/enrollments`);
  revalidatePath(`/admin/courses/${courseId}`);
  revalidatePath(`/admin/members/${entitlement.member_id}`);
  revalidatePath("/my-courses");
  redirect(enrollmentPath(courseId, { success: "revoked" }));
}

export async function restoreCourseEnrollment(formData: FormData) {
  const actor = await requireAdminPermission("courses.grant");
  const courseId = clean(formData.get("courseId"));
  const entitlementId = clean(formData.get("entitlementId"));
  const restoreNote = clean(formData.get("restoreNote"));

  if (!courseId || !entitlementId) {
    redirect(enrollmentPath(courseId ?? "", { error: "missing_restore" }));
  }

  const authorization = requireClientAuthorization(formData, "restoreNote");
  if (authorization.error || !authorization.reason || !restoreNote) {
    redirect(enrollmentPath(courseId, { error: "authorization_required" }));
  }

  const supabase = asLooseSupabaseClient(getAdminClient());
  const { data: entitlement } = await supabase
    .from("course_entitlement")
    .select<{ id: string; member_id: string; course_id: string; status: string }>(
      "id, member_id, course_id, status"
    )
    .eq("id", entitlementId)
    .eq("course_id", courseId)
    .maybeSingle();

  if (!entitlement?.id) {
    redirect(enrollmentPath(courseId, { error: "entitlement_not_found" }));
  }

  if (entitlement.status === "active") {
    redirect(enrollmentPath(courseId, { error: "already_enrolled" }));
  }

  if (entitlement.status !== "revoked") {
    redirect(enrollmentPath(courseId, { error: "managed_by_payment" }));
  }

  const { data: activeDuplicate } = await supabase
    .from("course_entitlement")
    .select<{ id: string }>("id")
    .eq("member_id", entitlement.member_id)
    .eq("course_id", courseId)
    .eq("status", "active")
    .maybeSingle();

  if (activeDuplicate?.id) {
    redirect(enrollmentPath(courseId, { error: "already_enrolled" }));
  }

  const { error } = await supabase
    .from("course_entitlement")
    .update({
      status: "active",
      granted_by: actor.id,
      grant_note: restoreNote,
      revoked_by: null,
      revoke_note: null,
      revoked_at: null,
      granted_at: new Date().toISOString(),
    })
    .eq("id", entitlementId);

  if (error) {
    console.error("[admin/course-enrollments] course restore failed:", error.message);
    redirect(enrollmentPath(courseId, { error: "restore_failed" }));
  }

  await Promise.all([
    logAudit({
      actorId: actor.id,
      memberId: entitlement.member_id,
      action: "course.grant_restored",
      targetType: "course_entitlement",
      targetId: entitlementId,
      reason: restoreNote,
      metadata: { course_id: entitlement.course_id },
    }),
    writeActivity({
      memberId: entitlement.member_id,
      eventType: "admin_course_grant_restored",
      metadata: { course_id: entitlement.course_id, entitlement_id: entitlementId },
    }),
  ]);

  revalidatePath(`/admin/courses/${courseId}/enrollments`);
  revalidatePath(`/admin/courses/${courseId}`);
  revalidatePath(`/admin/members/${entitlement.member_id}`);
  revalidatePath("/my-courses");
  redirect(enrollmentPath(courseId, { success: "restored" }));
}
