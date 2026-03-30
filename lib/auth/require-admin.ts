import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { config } from "@/lib/config";

/**
 * lib/auth/require-admin.ts
 * Server-side access guard for admin routes.
 *
 * Redirects to /login if:
 * - no authenticated session exists
 * - user email is not in ADMIN_EMAILS env var
 *
 * This is a lightweight bootstrap guard. In production, replace with
 * a role-based check from the member table (e.g. member.role = 'admin').
 */
export async function requireAdmin() {
  const user = await getSession();

  if (!user) {
    redirect("/login");
  }

  const adminEmails = config.app.adminEmails;

  if (!adminEmails.includes(user.email ?? "")) {
    // Not an admin — redirect to member dashboard
    redirect("/dashboard");
  }

  return user;
}
