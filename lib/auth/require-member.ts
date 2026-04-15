import { redirect } from "next/navigation";
import {
  getCurrentMemberProfile,
  type MemberProfile,
} from "@/lib/auth/member-profile";

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
    redirect("/join");
  }

  return member;
}
