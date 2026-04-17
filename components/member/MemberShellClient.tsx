"use client";

import { Suspense } from "react";
import { MemberTopNav } from "@/components/member/MemberTopNav";
import { MemberAudioProvider } from "@/components/member/audio/MemberAudioProvider";
import { PersistentAudioPlayer } from "@/components/member/PersistentAudioPlayer";
import { WelcomeModal } from "@/components/member/WelcomeModal";
import { InstallAppPrompt } from "@/components/member/InstallAppPrompt";
import { BetaFeedbackWidget } from "@/components/member/BetaFeedbackWidget";
import { BetaWelcomeBanner } from "@/components/member/BetaWelcomeBanner";

interface MemberShellClientProps {
  streak: number;
  tier: string | null;
  memberName?: string | null;
  memberEmail?: string | null;
  memberAvatarUrl?: string | null;
  communityPreviewEnabled?: boolean;
  betaFeedbackEnabled?: boolean;
  betaWelcomeEnabled?: boolean;
  needsPasswordSetup?: boolean;
  marketingOptedOut?: boolean;
  showAdminNav?: boolean;
  children: React.ReactNode;
}

export function MemberShellClient({
  streak,
  tier,
  memberName,
  memberEmail,
  memberAvatarUrl,
  communityPreviewEnabled = false,
  betaFeedbackEnabled = true,
  betaWelcomeEnabled = false,
  needsPasswordSetup = false,
  marketingOptedOut = false,
  showAdminNav = false,
  children,
}: MemberShellClientProps) {
  return (
    <MemberAudioProvider>
      <div className="member-shell min-h-dvh">
        <MemberTopNav
          streak={streak}
          tier={tier}
          memberName={memberName}
          memberAvatarUrl={memberAvatarUrl}
          communityPreviewEnabled={communityPreviewEnabled}
          showAdminNav={showAdminNav}
        />
        <InstallAppPrompt />
        {betaWelcomeEnabled ? <BetaWelcomeBanner memberName={memberName} /> : null}
        <main className="member-shell__content flex-1">{children}</main>
        <PersistentAudioPlayer />
        {betaFeedbackEnabled ? (
          <BetaFeedbackWidget memberEmail={memberEmail ?? null} memberName={memberName ?? null} />
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
