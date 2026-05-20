"use server";

import { createClient } from "@/lib/supabase/server";
import { isBootstrapAdminEmail, memberHasAnyAdminRole } from "@/lib/auth/require-admin";

function safePath(path: string | null | undefined): string {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return "/today";
  return path;
}

/**
 * Determines where to send a user after a successful sign-in.
 * Called from LoginClient (client component) as a server action.
 *
 * Rule: login just authenticates — it does not subscription-gate.
 * Page-level guards (requireMember, requireActiveMember) handle access.
 * The only routing decision made here is staff vs. member landing page.
 */
export async function serverResolvePostLoginDestination(
  next: string | null | undefined
): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return "/login";

  if (
    isBootstrapAdminEmail(user.email) ||
    (await memberHasAnyAdminRole(user.id))
  ) {
    return "/admin";
  }

  return safePath(next);
}
