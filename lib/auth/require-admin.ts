import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import {
  ADMIN_PERMISSION_KEYS,
  isAdminPermissionKey,
  type AdminPermissionKey,
} from "@/lib/admin/permissions";
import { config } from "@/lib/config";
import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";

/**
 * lib/auth/require-admin.ts
 * Server-side access guard for admin routes.
 *
 * Redirects to /login if:
 * - no authenticated session exists
 * - user email is not in ADMIN_EMAILS env var
 *
 * ADMIN_EMAILS remains a bootstrap fallback. Role-based admin access is read
 * from admin_user_role/admin_role_permission once roles are seeded.
 */
export function isBootstrapAdminEmail(email?: string | null) {
  const normalizedEmail = email?.trim().toLowerCase() ?? "";
  return config.app.adminEmails.includes(normalizedEmail);
}

export async function requireAdmin() {
  const user = await getSession();

  if (!user) {
    redirect("/login");
  }

  if (!isBootstrapAdminEmail(user.email)) {
    const hasRole = await memberHasAnyAdminRole(user.id);
    if (!hasRole) {
      // Not an admin — return them to the member app entry point.
      redirect("/today");
    }
  }

  return user;
}

async function memberHasAnyAdminRole(memberId: string): Promise<boolean> {
  const supabase = asLooseSupabaseClient(getAdminClient());
  const { data, error } = await supabase
    .from("admin_user_role")
    .select<{ role_id: string }[]>("role_id")
    .eq("member_id", memberId)
    .limit(1);

  if (error) {
    console.error("[requireAdmin] role lookup failed:", error.message);
    return false;
  }

  return (data ?? []).length > 0;
}

export async function getAdminPermissionSet(
  memberId: string,
  email?: string | null
): Promise<Set<AdminPermissionKey>> {
  if (isBootstrapAdminEmail(email)) {
    return new Set(ADMIN_PERMISSION_KEYS);
  }

  const supabase = asLooseSupabaseClient(getAdminClient());
  const { data: overrideRows } = await supabase
    .from("admin_user_permission_override")
    .select<{ permission: string; allowed: boolean }[]>("permission, allowed")
    .eq("member_id", memberId);

  const overrideMap = new Map<AdminPermissionKey, boolean>();
  for (const row of overrideRows ?? []) {
    if (isAdminPermissionKey(row.permission)) {
      overrideMap.set(row.permission, Boolean(row.allowed));
    }
  }

  const { data: roles, error: roleError } = await supabase
    .from("admin_user_role")
    .select<{ role_id: string }[]>("role_id")
    .eq("member_id", memberId);

  if (roleError || !roles?.length) {
    if (roleError) console.error("[requireAdmin] permission set role lookup failed:", roleError.message);
    return new Set(
      [...overrideMap.entries()]
        .filter(([, allowed]) => allowed)
        .map(([permission]) => permission)
    );
  }

  const { data: rolePermissions, error: permissionError } = await supabase
    .from("admin_role_permission")
    .select<{ permission: string }[]>("permission")
    .in("role_id", roles.map((role: { role_id: string }) => role.role_id));

  if (permissionError) {
    console.error("[requireAdmin] permission set lookup failed:", permissionError.message);
  }

  const permissionSet = new Set<AdminPermissionKey>();
  for (const row of rolePermissions ?? []) {
    if (isAdminPermissionKey(row.permission)) {
      permissionSet.add(row.permission);
    }
  }

  for (const [permission, allowed] of overrideMap.entries()) {
    if (allowed) permissionSet.add(permission);
    else permissionSet.delete(permission);
  }

  return permissionSet;
}

export async function hasAdminPermission(
  memberId: string,
  permission: string,
  email?: string | null
): Promise<boolean> {
  if (!isAdminPermissionKey(permission)) {
    return false;
  }

  const permissionSet = await getAdminPermissionSet(memberId, email);
  return permissionSet.has(permission);
}

export async function requireAdminPermission(permission: string) {
  const user = await requireAdmin();
  const allowed = await hasAdminPermission(user.id, permission, user.email);

  if (!allowed) {
    redirect("/admin/members?error=permission_denied");
  }

  return user;
}
