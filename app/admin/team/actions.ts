"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminPermission } from "@/lib/auth/require-admin";
import { isAdminPermissionKey } from "@/lib/admin/permissions";
import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";

function clean(value: FormDataEntryValue | null) {
  const text = value?.toString().trim() ?? "";
  return text.length > 0 ? text : null;
}

/** Assign a role to a member by email. Creates the member lookup by email. */
export async function assignAdminRole(formData: FormData) {
  const actor = await requireAdminPermission("roles.manage");
  const email = clean(formData.get("email"))?.toLowerCase();
  const roleId = clean(formData.get("roleId"));

  if (!email || !roleId) redirect("/admin/team?error=missing_fields");

  const supabase = asLooseSupabaseClient(getAdminClient());

  const { data: member, error: memberError } = await supabase
    .from("member")
    .select<{ id: string }>("id")
    .eq("email", email)
    .maybeSingle();

  if (memberError || !member) redirect("/admin/team?error=member_not_found");

  const { error } = await supabase
    .from("admin_user_role")
    .insert({ member_id: member!.id, role_id: roleId, assigned_by: actor.id })
    .select();

  if (error) {
    if (error.code === "23505") redirect("/admin/team?error=already_assigned");
    console.error("[admin/team] role assign failed:", error.message);
    redirect("/admin/team?error=assign_failed");
  }

  await supabase.from("member_audit_log").insert({
    actor_member_id: actor.id,
    target_member_id: member!.id,
    action: "admin_user_role.assigned",
    target_type: "admin_user_role",
    target_id: roleId,
    metadata: { email, role_id: roleId },
  });

  revalidatePath("/admin/team");
  redirect("/admin/team?success=role_assigned");
}

/** Remove a role from a member. */
export async function removeAdminRole(formData: FormData) {
  const actor = await requireAdminPermission("roles.manage");
  const memberId = clean(formData.get("memberId"));
  const roleId = clean(formData.get("roleId"));

  if (!memberId || !roleId) redirect("/admin/team?error=missing_fields");

  const supabase = asLooseSupabaseClient(getAdminClient());

  const { error } = await supabase
    .from("admin_user_role")
    .delete()
    .eq("member_id", memberId)
    .eq("role_id", roleId);

  if (error) {
    console.error("[admin/team] role remove failed:", error.message);
    redirect("/admin/team?error=remove_failed");
  }

  await supabase.from("member_audit_log").insert({
    actor_member_id: actor.id,
    target_member_id: memberId,
    action: "admin_user_role.removed",
    target_type: "admin_user_role",
    target_id: roleId,
    metadata: { role_id: roleId },
  });

  revalidatePath("/admin/team");
  redirect("/admin/team?success=role_removed");
}

/** Set or update a per-user permission override. */
export async function setPermissionOverride(formData: FormData) {
  const actor = await requireAdminPermission("roles.manage");
  const memberId = clean(formData.get("memberId"));
  const permission = clean(formData.get("permission"));
  const allowed = formData.get("allowed") === "true";

  if (!memberId || !permission || !isAdminPermissionKey(permission)) {
    redirect("/admin/team?error=invalid_override");
  }

  const supabase = asLooseSupabaseClient(getAdminClient());

  const { error } = await supabase
    .from("admin_user_permission_override")
    .upsert(
      { member_id: memberId, permission, allowed, updated_by: actor.id, updated_at: new Date().toISOString() },
      { onConflict: "member_id,permission" }
    );

  if (error) {
    console.error("[admin/team] override upsert failed:", error.message);
    redirect("/admin/team?error=override_failed");
  }

  await supabase.from("member_audit_log").insert({
    actor_member_id: actor.id,
    target_member_id: memberId,
    action: "admin_user_permission_override.set",
    target_type: "admin_user_permission_override",
    target_id: permission,
    metadata: { permission, allowed },
  });

  revalidatePath("/admin/team");
  redirect(`/admin/team?success=override_set`);
}

/** Remove a per-user permission override (revert to role default). */
export async function removePermissionOverride(formData: FormData) {
  const actor = await requireAdminPermission("roles.manage");
  const memberId = clean(formData.get("memberId"));
  const permission = clean(formData.get("permission"));

  if (!memberId || !permission) redirect("/admin/team?error=missing_fields");

  const supabase = asLooseSupabaseClient(getAdminClient());

  await supabase
    .from("admin_user_permission_override")
    .delete()
    .eq("member_id", memberId)
    .eq("permission", permission);

  await supabase.from("member_audit_log").insert({
    actor_member_id: actor.id,
    target_member_id: memberId,
    action: "admin_user_permission_override.removed",
    target_type: "admin_user_permission_override",
    target_id: permission,
    metadata: { permission },
  });

  revalidatePath("/admin/team");
  redirect(`/admin/team?success=override_removed`);
}

/** Grant or revoke member platform access for a staff account. */
export async function setPlatformAccess(formData: FormData) {
  const actor = await requireAdminPermission("roles.manage");
  const memberId = clean(formData.get("memberId"));
  const grant = formData.get("grant") === "true";

  if (!memberId) redirect("/admin/team?error=missing_fields");

  const supabase = asLooseSupabaseClient(getAdminClient());

  // Update all role assignments for this member
  const { error } = await supabase
    .from("admin_user_role")
    .update({ platform_access: grant })
    .eq("member_id", memberId!);

  if (error) {
    console.error("[admin/team] platform_access update failed:", error.message);
    redirect("/admin/team?error=assign_failed");
  }

  await supabase.from("member_audit_log").insert({
    actor_member_id: actor.id,
    target_member_id: memberId!,
    action: grant ? "admin_user_role.platform_access_granted" : "admin_user_role.platform_access_revoked",
    target_type: "admin_user_role",
    target_id: memberId!,
    metadata: { grant },
  });

  revalidatePath("/admin/team");
  redirect(`/admin/team?success=${grant ? "platform_access_granted" : "platform_access_revoked"}`);
}
