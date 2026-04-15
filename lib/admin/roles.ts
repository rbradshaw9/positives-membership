import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";
import type { AdminPermissionKey } from "./permissions";

export type AdminRoleManagementRow = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  permissions: AdminPermissionKey[];
  assignedCount: number;
};

export type AdminPermissionOverrideRow = {
  permission: AdminPermissionKey;
  allowed: boolean;
  updated_at: string;
};

export async function getAdminRoleManagementRows(): Promise<AdminRoleManagementRow[]> {
  const supabase = asLooseSupabaseClient(getAdminClient());

  const [{ data: roles, error: rolesError }, { data: permissions }, { data: assignments }] =
    await Promise.all([
      supabase
        .from("admin_role")
        .select<{ id: string; key: string; name: string; description: string | null }[]>(
          "id, key, name, description"
        )
        .order("name", { ascending: true }),
      supabase
        .from("admin_role_permission")
        .select<{ role_id: string; permission: AdminPermissionKey }[]>("role_id, permission"),
      supabase.from("admin_user_role").select<{ role_id: string }[]>("role_id"),
    ]);

  if (rolesError) {
    console.error("[admin/roles] role fetch failed:", rolesError.message);
    return [];
  }

  const permissionsByRole = new Map<string, AdminPermissionKey[]>();
  for (const permission of permissions ?? []) {
    const list = permissionsByRole.get(permission.role_id) ?? [];
    list.push(permission.permission);
    permissionsByRole.set(permission.role_id, list);
  }

  const assignedCounts = new Map<string, number>();
  for (const assignment of assignments ?? []) {
    assignedCounts.set(assignment.role_id, (assignedCounts.get(assignment.role_id) ?? 0) + 1);
  }

  return (roles ?? []).map((role) => ({
    ...role,
    permissions: permissionsByRole.get(role.id) ?? [],
    assignedCount: assignedCounts.get(role.id) ?? 0,
  }));
}

export async function getAdminPermissionOverridesForMember(
  memberId: string
): Promise<AdminPermissionOverrideRow[]> {
  const supabase = asLooseSupabaseClient(getAdminClient());
  const { data, error } = await supabase
    .from("admin_user_permission_override")
    .select<AdminPermissionOverrideRow[]>("permission, allowed, updated_at")
    .eq("member_id", memberId)
    .order("permission", { ascending: true });

  if (error) {
    console.error("[admin/roles] permission override fetch failed:", error.message);
    return [];
  }

  return data ?? [];
}
