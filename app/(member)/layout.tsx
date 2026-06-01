import { after } from "next/server";
import { cookies } from "next/headers";
import { requireMember } from "@/lib/auth/require-member";
import { PasswordNudgeBanner } from "@/components/member/PasswordNudgeBanner";
import { MemberShellClient } from "@/components/member/MemberShellClient";
import { ServiceWorkerRegistration } from "@/components/platform/ServiceWorkerRegistration";
import { config } from "@/lib/config";
import { MEMBER_ONBOARDING_TOUR_KEY, type MemberTourStatus } from "@/lib/onboarding/member-tour";
import { createClient } from "@/lib/supabase/server";
import { isStreakActive } from "@/lib/streak/compute-streak";
import { getEffectiveDate } from "@/lib/dates/effective-date";
import { trackFirstMemberLogin } from "@/lib/member/track-first-login";
import { getAdminPermissionSet } from "@/lib/auth/require-admin";
import { getCommunityUnreadCount } from "@/lib/queries/get-community-posts";
import { checkTierAccess } from "@/lib/auth/check-tier-access";
import { getMemberBetaFeedbackThreads } from "@/lib/beta-feedback/data";
import {
  IMPERSONATION_COOKIE_NAME,
  verifyImpersonationSessionToken,
} from "@/lib/auth/impersonation-session";

/**
 * app/(member)/layout.tsx
 * Sprint 9: replaces MemberHeader + bottom MemberNav with the unified
 * MemberTopNav (sticky top bar on desktop, bottom bar on mobile).
 *
 * main padding:
 *   - pt-0 (nav is sticky, page hero provides its own top space)
 *   - pb-24 on mobile (bottom bar), pb-8 on desktop (no bottom bar)
 */
export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const member = await requireMember();

  after(async () => {
    try {
      await trackFirstMemberLogin({
        memberId: member.id,
        email: member.email,
        firstLoginAt: member.first_login_at,
        lastSeenAt: member.last_seen_at,
      });
    } catch (error) {
      console.error(
        "[member-layout] deferred login tracking failed:",
        error instanceof Error ? error.message : String(error)
      );
    }
  });

  const showPasswordNudge = member.password_set === false;
  const marketingOptedOut = member.email_unsubscribed === true;
  const hasCommunityAccess = checkTierAccess(member.subscription_tier, "level_2");
  const adminPermissionSetPromise = getAdminPermissionSet(member.id, member.email);
  const onboardingTourPromise = createClient()
    .then((supabase) =>
      supabase
        .from("member_onboarding_tour")
        .select("status, last_step")
        .eq("member_id", member.id)
        .eq("tour_key", MEMBER_ONBOARDING_TOUR_KEY)
        .maybeSingle()
        .overrideTypes<{ status: MemberTourStatus; last_step: string | null }>()
    )
    .catch((error) => {
      console.error(
        "[member-layout] onboarding tour lookup failed:",
        error instanceof Error ? error.message : String(error)
      );
      return { data: null, error };
    });
  const communityUnreadCountPromise = hasCommunityAccess
    ? getCommunityUnreadCount(member.id)
    : Promise.resolve(0);
  const betaFeedbackInboxPromise =
    config.app.betaFeedbackEnabled &&
    (member.launch_cohort === "alpha" || member.launch_cohort === "beta")
      ? getMemberBetaFeedbackThreads(member.id)
      : Promise.resolve({ threads: [], unreadCount: 0 });

  const [adminPermissionSet, communityUnreadCount, betaFeedbackInbox, onboardingTourResult] = await Promise.all([
    adminPermissionSetPromise,
    communityUnreadCountPromise,
    betaFeedbackInboxPromise,
    onboardingTourPromise,
  ]);
  if (onboardingTourResult.error) {
    console.error("[member-layout] onboarding tour query failed:", onboardingTourResult.error.message);
  }
  const onboardingTourAvailable = !onboardingTourResult.error;
  const onboardingTourStatus =
    (onboardingTourResult.data?.status as MemberTourStatus | undefined) ?? null;
  const cookieStore = await cookies();
  const impersonationSession = verifyImpersonationSessionToken(
    cookieStore.get(IMPERSONATION_COOKIE_NAME)?.value
  );
  const isImpersonating =
    impersonationSession.ok && impersonationSession.payload.targetMemberId === member.id;
  const showAdminNav = adminPermissionSet.size > 0;

  // Only show a non-zero streak if the member practiced today or yesterday.
  // If they missed a day, show 0 — the DB value itself gets corrected on next listen.
  const today = getEffectiveDate();
  const streak = isStreakActive(member.last_practiced_at, today)
    ? (member.practice_streak ?? 0)
    : 0;

  return (
    <MemberShellClient
      streak={streak}
      tier={member.subscription_tier}
      launchCohort={member.launch_cohort}
      memberName={member.name}
      memberAvatarUrl={member.avatar_url}
      communityUnreadCount={communityUnreadCount}
      betaFeedbackThreads={betaFeedbackInbox.threads}
      betaFeedbackUnreadCount={betaFeedbackInbox.unreadCount}
      communityPreviewEnabled={config.app.communityPreviewEnabled}
      betaFeedbackEnabled={config.app.betaFeedbackEnabled}
      betaWelcomeEnabled={config.app.betaWelcomeEnabled}
      needsPasswordSetup={showPasswordNudge}
      marketingOptedOut={marketingOptedOut}
      showAdminNav={showAdminNav}
      isImpersonating={isImpersonating}
      memberEmail={member.email}
      onboardingTourStatus={onboardingTourStatus}
      shouldAutoStartOnboardingTour={
        onboardingTourAvailable &&
        !onboardingTourResult.data &&
        !member.first_login_at &&
        !isImpersonating
      }
    >
      <ServiceWorkerRegistration />
      {showPasswordNudge && <PasswordNudgeBanner />}
      {children}
    </MemberShellClient>
  );
}
