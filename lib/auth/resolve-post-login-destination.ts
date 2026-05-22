import { hasActiveMemberAccess } from "@/lib/subscription/access";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";
import { isBootstrapAdminEmail, memberHasAnyAdminRole } from "@/lib/auth/require-admin";
import type { Enums } from "@/types/supabase";

type AuthUser = { id: string; email?: string | null };

type SupabaseLike = {
  auth: { getUser: () => Promise<{ data: { user: AuthUser | null } }> };
  from: (table: string) => unknown;
};

function safePath(path: string | null | undefined): string {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return "/today";
  return path;
}

/**
 * Canonical post-login routing logic shared by:
 * - lib/auth/post-login-destination-server.ts (server action, called from LoginClient)
 * - app/login/page.tsx (server component, for already-authenticated users)
 * - app/auth/callback/route.ts (magic-link handler)
 *
 * Routing priority:
 *   no user           → /login
 *   admin / staff     → /admin
 *   no member row     → /join       (genuinely new, never subscribed)
 *   past_due          → /account/billing
 *   canceled/inactive → /inactive   (returning member, lapsed)
 *   active/trialing   → safePath(next) — default /today
 */
export async function resolvePostLoginDestination(
  supabaseClient: SupabaseLike,
  next: string | null | undefined
): Promise<string> {
  const {
    data: { user },
  } = await supabaseClient.auth.getUser();

  if (!user) return "/login";

  if (isBootstrapAdminEmail(user.email) || (await memberHasAnyAdminRole(user.id))) {
    return "/admin";
  }

  const supabase = asLooseSupabaseClient(supabaseClient);
  const { data: member } = await supabase
    .from("member")
    .select<{ id: string; subscription_status: Enums<"subscription_status"> | null }>(
      "id, subscription_status"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (!member) return "/join";
  if (member.subscription_status === "past_due") return "/account/billing";
  if (!hasActiveMemberAccess(member.subscription_status)) {
    const { count } = await supabase
      .from("course_entitlement")
      .select("id", { count: "exact", head: true })
      .eq("member_id", member.id)
      .eq("status", "active");

    if (count && count > 0) {
      const destination = safePath(next);
      return destination.startsWith("/library") ||
        destination.startsWith("/my-courses") ||
        destination.startsWith("/courses") ||
        destination.startsWith("/account")
        ? destination
        : "/library";
    }

    return "/inactive";
  }
  return safePath(next);
}
