import { redirect } from "next/navigation";
import { hasActiveMemberAccess } from "@/lib/subscription/access";
import {
  getCurrentMemberProfile,
  type MemberProfile,
} from "@/lib/auth/member-profile";

/**
 * lib/auth/require-active-member.ts
 * Server-side access guard for protected member routes.
 *
 * Redirect logic:
 * - Unauthenticated (no session)           → /login
 * - Authenticated, no member row           → /join
 *   (brief race on first sign-in before trigger runs)
 * - Authenticated, past_due                → /account
 *   (must be able to reach billing portal to fix payment)
 * - Authenticated, canceled/inactive       → /join
 * - Authenticated, active or trialing subscription → returns MemberProfile
 *
 * Returns password_set so the calling layout can conditionally render
 * the nudge banner without a second round-trip to Supabase.
 *
 * /join is now the conversion surface (was /subscribe).
 * Use at the top of protected Server Component layouts/pages.
 */
export async function requireActiveMember(): Promise<MemberProfile> {
  const { user, member, authError, memberError } = await getCurrentMemberProfile();

  if (authError || !user) {
    redirect("/login");
  }

  if (memberError || !member) {
    // Member row missing — trigger may not have run yet (first sign-in race).
    // User IS authenticated, so redirect to /join not /login.
    redirect("/join");
  }

  if (member.subscription_status === "past_due") {
    // Past due members must reach /account/billing to fix their payment.
    // That route creates a Stripe Billing Portal session and redirects
    // them directly into Stripe — no additional steps.
    redirect("/account/billing");
  }

  if (!hasActiveMemberAccess(member.subscription_status)) {
    // Canceled or otherwise inactive — send to conversion page.
    redirect("/join");
  }

  return member;
}
