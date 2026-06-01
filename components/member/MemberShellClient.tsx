"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { MemberTopNav } from "@/components/member/MemberTopNav";
import { MemberAudioProvider } from "@/components/member/audio/MemberAudioProvider";
import { PersistentAudioPlayer } from "@/components/member/PersistentAudioPlayer";
import { WelcomeModal } from "@/components/member/WelcomeModal";
import { InstallAppPrompt } from "@/components/member/InstallAppPrompt";
import { BetaFeedbackWidget } from "@/components/member/BetaFeedbackWidget";
import { BetaWelcomeBanner } from "@/components/member/BetaWelcomeBanner";
import { ImpersonationBanner } from "@/components/member/ImpersonationBanner";
import { MemberOnboardingTour } from "@/components/onboarding/MemberOnboardingTour";
import type { MemberTourStatus } from "@/lib/onboarding/member-tour";
import type { MemberBetaFeedbackThread } from "@/lib/beta-feedback/data";

interface MemberShellClientProps {
  streak: number;
  tier: string | null;
  launchCohort?: string | null;
  memberName?: string | null;
  memberEmail?: string | null;
  memberAvatarUrl?: string | null;
  communityUnreadCount?: number;
  betaFeedbackThreads?: MemberBetaFeedbackThread[];
  betaFeedbackUnreadCount?: number;
  communityPreviewEnabled?: boolean;
  betaFeedbackEnabled?: boolean;
  betaWelcomeEnabled?: boolean;
  needsPasswordSetup?: boolean;
  marketingOptedOut?: boolean;
  showAdminNav?: boolean;
  isImpersonating?: boolean;
  onboardingTourStatus?: MemberTourStatus | null;
  shouldAutoStartOnboardingTour?: boolean;
  children: React.ReactNode;
}

export function MemberShellClient({
  streak,
  tier,
  launchCohort,
  memberName,
  memberEmail,
  memberAvatarUrl,
  communityUnreadCount = 0,
  betaFeedbackThreads = [],
  betaFeedbackUnreadCount = 0,
  communityPreviewEnabled = false,
  betaFeedbackEnabled = true,
  betaWelcomeEnabled = false,
  needsPasswordSetup = false,
  marketingOptedOut = false,
  showAdminNav = false,
  isImpersonating = false,
  onboardingTourStatus = null,
  shouldAutoStartOnboardingTour = false,
  children,
}: MemberShellClientProps) {
  const isEarlyReleaseMember = launchCohort === "alpha" || launchCohort === "beta";
  const pathname = usePathname();
  const isLiveEventRoute = /^\/events\/[^/]+\/live$/.test(pathname);

  return (
    <MemberAudioProvider>
      <div className="member-shell min-h-dvh">
        <MemberTopNav
          streak={streak}
          tier={tier}
          memberName={memberName}
          memberAvatarUrl={memberAvatarUrl}
          communityUnreadCount={communityUnreadCount}
          communityPreviewEnabled={communityPreviewEnabled}
          showAdminNav={showAdminNav}
        />
        {isImpersonating ? <ImpersonationBanner memberName={memberName} /> : null}
        {!isLiveEventRoute ? <InstallAppPrompt /> : null}
        {betaWelcomeEnabled && isEarlyReleaseMember && !isLiveEventRoute ? (
          <BetaWelcomeBanner memberName={memberName} />
        ) : null}
        <main className="member-shell__content flex-1">{children}</main>
        <PersistentAudioPlayer />
        {!isLiveEventRoute ? (
          <MemberOnboardingTour
            initialStatus={onboardingTourStatus}
            shouldAutoStart={shouldAutoStartOnboardingTour}
          />
        ) : null}
        {betaFeedbackEnabled && isEarlyReleaseMember ? (
          <BetaFeedbackWidget
            memberEmail={memberEmail ?? null}
            memberName={memberName ?? null}
            initialThreads={betaFeedbackThreads}
            initialUnreadCount={betaFeedbackUnreadCount}
          />
        ) : null}
        {/* WelcomeModal self-activates from ?welcome=1 — no-ops otherwise */}
        <Suspense fallback={null}>
          <WelcomeModal
            needsPasswordSetup={needsPasswordSetup}
            marketingOptedOut={marketingOptedOut}
          />
        </Suspense>
      </div>
    </MemberAudioProvider>
  );
}
