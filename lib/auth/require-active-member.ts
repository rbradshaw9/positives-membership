import { redirect } from "next/navigation";
import { hasActiveMemberAccess } from "@/lib/subscription/access";
import {
  getCurrentMemberProfile,
  type MemberProfile,
} from "@/lib/auth/member-profile";
import { isBootstrapAdminEmail, memberHasAnyAdminRole } from "@/lib/auth/require-admin";

/**
 * lib/auth/require-active-member.ts
 * Server-side access guard for protected member routes.
 *
 * Redirect logic:
 * - Unauthenticated (no session)              → /login
 * - Authenticated, no member row, is staff    → /admin
 * - Authenticated, no member row, not staff   → /join  (genuinely new user)
 * - Authenticated, past_due                   → /account/billing
 * - Authenticated, canceled/inactive          → /inactive
 * - Authenticated, active or trialing         → returns MemberProfile
 */
export async function requireActiveMember(): Promise<MemberProfile> {
  const { user, member, authError, memberError } = await getCurrentMemberProfile();

  if (authError || !user) {
    redirect("/login");
  }

  if (memberError || !member) {
    // No member row — could be a staff account or a race on first sign-in.
    const isStaff =
      isBootstrapAdminEmail(user.email) || (await memberHasAnyAdminRole(user.id));
    redirect(isStaff ? "/admin" : "/join");
  }

  if (member.subscription_status === "past_due") {
    redirect("/account/billing");
  }

  if (!hasActiveMemberAccess(member.subscription_status)) {
    // Has a member row but subscription is canceled or inactive.
    // Send to the dedicated inactive page, not the new-user join flow.
    redirect("/inactive");
  }

  return member;
}
