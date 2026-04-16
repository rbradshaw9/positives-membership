"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdminPermission } from "@/lib/auth/require-admin";
import {
  ADMIN_PERMISSION_KEYS,
  isAdminPermissionKey,
  type AdminPermissionKey,
} from "@/lib/admin/permissions";
import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";

function clean(value: FormDataEntryValue | null) {
  const text = value?.toString().trim() ?? "";
  return text.length > 0 ? text : null;
}

export async function updateAdminRolePermissions(formData: FormData) {
  const actor = await requireAdminPermission("roles.manage");
  const roleId = clean(formData.get("roleId"));
  const reason = clean(formData.get("reason"));
  const confirmed = formData.get("clientAuthorizationConfirmed") === "on";
  const selected = formData
    .getAll("permissions")
    .map((value) => value.toString())
    .filter(isAdminPermissionKey);

  if (!roleId) redirect("/admin/roles?error=missing_role");
  if (!confirmed) redirect("/admin/roles?error=missing_authorization");
  if (!reason || reason.length < 3) redirect("/admin/roles?error=missing_reason");

  const supabase = asLooseSupabaseClient(getAdminClient());
  const { data: role, error: roleError } = await supabase
    .from("admin_role")
    .select<{ id: string; key: string; name: string }>("id, key, name")
    .eq("id", roleId)
    .maybeSingle();

  if (roleError || !role) {
    console.error("[admin/roles] role lookup failed:", roleError?.message);
    redirect("/admin/roles?error=role_not_found");
  }

  const permissions = new Set<AdminPermissionKey>(selected);

  if (role.key === "super_admin") {
    // Avoid an accidental admin lockout. ADMIN_EMAILS still bypasses permissions,
    // but Super Admin should remain the full-permission role by definition.
    for (const permission of ADMIN_PERMISSION_KEYS) permissions.add(permission);
  }

  const nextPermissions = [...permissions];

  const { error: deleteError } = await supabase
    .from("admin_role_permission")
    .delete()
    .eq("role_id", role.id);

  if (deleteError) {
    console.error("[admin/roles] permission delete failed:", deleteError.message);
    redirect("/admin/roles?error=update_failed");
  }

  if (nextPermissions.length > 0) {
    const { error: insertError } = await supabase.from("admin_role_permission").insert(
      nextPermissions.map((permission) => ({
        role_id: role.id,
        permission,
      }))
    );

    if (insertError) {
      console.error("[admin/roles] permission insert failed:", insertError.message);
      redirect("/admin/roles?error=update_failed");
    }
  }

  await supabase.from("member_audit_log").insert({
    actor_member_id: actor.id,
    target_member_id: actor.id,
    action: "admin_role.permissions_updated",
    target_type: "admin_role",
    target_id: role.id,
    reason,
    metadata: {
      role_key: role.key,
      role_name: role.name,
      permissions: nextPermissions,
      client_authorization_confirmed: true,
    },
  });

  revalidatePath("/admin/roles");
  redirect("/admin/roles?success=role_updated");
}
