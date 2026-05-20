"use server";

import { createClient } from "@/lib/supabase/server";
import { resolvePostLoginDestination } from "@/lib/auth/post-login-destination";
import { isBootstrapAdminEmail, memberHasAnyAdminRole } from "@/lib/auth/require-admin";

/**
 * Server-action wrapper around resolvePostLoginDestination.
 * Called from LoginClient after a successful sign-in so we can run
 * server-only checks (ADMIN_EMAILS env var, admin_user_role table) before
 * falling back to the subscription-based routing.
 *
 * Without this, users with admin/coach roles but no member subscription
 * would be redirected to /join after login.
 */
export async function serverResolvePostLoginDestination(
  next: string | null | undefined
): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return "/login";

  // Staff accounts (bootstrap admin email or any admin_user_role row) bypass
  // the subscription gate and land on /admin instead of /join.
  if (
    isBootstrapAdminEmail(user.email) ||
    (await memberHasAnyAdminRole(user.id))
  ) {
    return "/admin";
  }

  return resolvePostLoginDestination(supabase, next);
}
