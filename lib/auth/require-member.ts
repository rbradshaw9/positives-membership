import { redirect } from "next/navigation";
import {
  getCurrentMemberProfile,
  type MemberProfile,
} from "@/lib/auth/member-profile";
import { isBootstrapAdminEmail, memberHasAnyAdminRole } from "@/lib/auth/require-admin";

/**
 * Authenticated member guard without requiring an active subscription.
 *
 * Use this for account/library shells where course-only members should still
 * access purchased or granted courses. Subscription-only pages should keep
 * requireActiveMember().
 */
export async function requireMember(): Promise<MemberProfile> {
  const { user, member, authError, memberError } = await getCurrentMemberProfile();

  if (authError || !user) {
    redirect("/login");
  }

  if (memberError || !member) {
    // Staff accounts (admins, coaches) don't have member rows. Send them to
    // /admin rather than the new-user join page.
    const isStaff =
      isBootstrapAdminEmail(user.email) || (await memberHasAnyAdminRole(user.id));
    redirect(isStaff ? "/admin" : "/join");
  }

  return member;
}
