"use client";

import { Suspense } from "react";
import { MemberTopNav } from "@/components/member/MemberTopNav";
import { MemberAudioProvider } from "@/components/member/audio/MemberAudioProvider";
import { PersistentAudioPlayer } from "@/components/member/PersistentAudioPlayer";
import { WelcomeModal } from "@/components/member/WelcomeModal";
import { InstallAppPrompt } from "@/components/member/InstallAppPrompt";

interface MemberShellClientProps {
  streak: number;
  tier: string | null;
  memberName?: string | null;
  communityPreviewEnabled?: boolean;
  needsPasswordSetup?: boolean;
  children: React.ReactNode;
}

export function MemberShellClient({
  streak,
  tier,
  memberName,
  communityPreviewEnabled = false,
  needsPasswordSetup = false,
  children,
}: MemberShellClientProps) {
  return (
    <MemberAudioProvider>
      <div className="member-shell min-h-dvh">
        <MemberTopNav
          streak={streak}
          tier={tier}
          memberName={memberName}
          communityPreviewEnabled={communityPreviewEnabled}
        />
        <InstallAppPrompt />
        <main className="member-shell__content flex-1">{children}</main>
        <PersistentAudioPlayer />
        {/* WelcomeModal self-activates from ?welcome=1 — no-ops otherwise */}
        <Suspense fallback={null}>
          <WelcomeModal needsPasswordSetup={needsPasswordSetup} />
        </Suspense>
      </div>
    </MemberAudioProvider>
  );
}
