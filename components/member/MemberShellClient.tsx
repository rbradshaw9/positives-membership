"use client";

import { MemberTopNav } from "@/components/member/MemberTopNav";
import { MemberAudioProvider } from "@/components/member/audio/MemberAudioProvider";
import { PersistentAudioPlayer } from "@/components/member/PersistentAudioPlayer";

interface MemberShellClientProps {
  streak: number;
  tier: string | null;
  children: React.ReactNode;
}

export function MemberShellClient({
  streak,
  tier,
  children,
}: MemberShellClientProps) {
  return (
    <MemberAudioProvider>
      <div className="member-shell min-h-dvh">
        <MemberTopNav streak={streak} tier={tier} />
        <main className="flex-1 pb-44 md:pb-32">{children}</main>
        <PersistentAudioPlayer />
      </div>
    </MemberAudioProvider>
  );
}
