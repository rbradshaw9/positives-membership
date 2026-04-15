import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
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
export async function requireAdmin() {
  const user = await getSession();

  if (!user) {
    redirect("/login");
  }

  const adminEmails = config.app.adminEmails;
  const normalizedEmail = user.email?.trim().toLowerCase() ?? "";

  if (!adminEmails.includes(normalizedEmail)) {
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

export async function hasAdminPermission(
  memberId: string,
  permission: string,
  email?: string | null
): Promise<boolean> {
  const normalizedEmail = email?.trim().toLowerCase() ?? "";
  if (config.app.adminEmails.includes(normalizedEmail)) return true;

  const supabase = asLooseSupabaseClient(getAdminClient());
  const { data: override } = await supabase
    .from("admin_user_permission_override")
    .select<{ allowed: boolean }>("allowed")
    .eq("member_id", memberId)
    .eq("permission", permission)
    .maybeSingle();

  if (override) return Boolean(override.allowed);

  const { data: roles, error: roleError } = await supabase
    .from("admin_user_role")
    .select<{ role_id: string }[]>("role_id")
    .eq("member_id", memberId);

  if (roleError || !roles?.length) {
    if (roleError) console.error("[requireAdmin] permission role lookup failed:", roleError.message);
    return false;
  }

  const { data: rolePermissions, error: permissionError } = await supabase
    .from("admin_role_permission")
    .select<{ permission: string }[]>("permission")
    .in("role_id", roles.map((role: { role_id: string }) => role.role_id))
    .eq("permission", permission);

  if (permissionError) {
    console.error("[requireAdmin] permission lookup failed:", permissionError.message);
    return false;
  }

  return (rolePermissions ?? []).length > 0;
}

export async function requireAdminPermission(permission: string) {
  const user = await requireAdmin();
  const allowed = await hasAdminPermission(user.id, permission, user.email);

  if (!allowed) {
    redirect("/admin/members?error=permission_denied");
  }

  return user;
}
