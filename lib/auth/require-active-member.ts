import { redirect } from "next/navigation";
import { hasActiveMemberAccess } from "@/lib/subscription/access";
import {
  getCurrentMemberProfile,
  type MemberProfile,
} from "@/lib/auth/member-profile";
import { isBootstrapAdminEmail, memberHasAnyAdminRole } from "@/lib/auth/require-admin";
import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";

/**
 * lib/auth/require-active-member.ts
 * Server-side access guard for protected member routes.
 *
 * Redirect logic:
 * - Unauthenticated (no session)                        → /login
 * - Authenticated, no member row, is staff              → /admin
 * - Authenticated, no member row, not staff             → /join
 * - Authenticated, past_due                             → /account/billing
 * - Authenticated, inactive + staff platform_access     → passes through
 * - Authenticated, canceled/inactive, no platform access → /inactive
 * - Authenticated, active or trialing                   → returns MemberProfile
 */
export async function requireActiveMember(): Promise<MemberProfile> {
  const { user, member, authError, memberError } = await getCurrentMemberProfile();

  if (authError || !user) {
    redirect("/login");
  }

  if (memberError || !member) {
    const isStaff =
      isBootstrapAdminEmail(user.email) || (await memberHasAnyAdminRole(user.id));
    redirect(isStaff ? "/admin" : "/join");
  }

  if (member.subscription_status === "past_due") {
    redirect("/account/billing");
  }

  if (!hasActiveMemberAccess(member.subscription_status)) {
    // Check if an admin has granted this staff member platform access.
    const supabase = asLooseSupabaseClient(getAdminClient());
    const { data: access } = await supabase
      .from("admin_user_role")
      .select<{ platform_access: boolean }[]>("platform_access")
      .eq("member_id", user.id)
      .eq("platform_access", true)
      .limit(1);

    if (!access?.length) {
      redirect("/inactive");
    }
  }

  return member;
}
