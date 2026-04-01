"use client";

import { MemberTopNav } from "@/components/member/MemberTopNav";
import { MemberAudioProvider } from "@/components/member/audio/MemberAudioProvider";
import { PersistentAudioPlayer } from "@/components/member/PersistentAudioPlayer";

interface MemberShellClientProps {
  streak: number;
  tier: string | null;
  memberName?: string | null;
  children: React.ReactNode;
}

export function MemberShellClient({
  streak,
  tier,
  memberName,
  children,
}: MemberShellClientProps) {
  return (
    <MemberAudioProvider>
      <div className="member-shell min-h-dvh">
        <MemberTopNav streak={streak} tier={tier} memberName={memberName} />
        <main className="member-shell__content flex-1">{children}</main>
        <PersistentAudioPlayer />
      </div>
    </MemberAudioProvider>
  );
}
