"use client";

/**
 * app/(member)/account/coaching/session/[id]/session-room-client.tsx
 *
 * Client boundary for the SessionRoom component.
 * Wraps the Livekit components (which require browser APIs).
 * Shows PostSessionPanel after disconnection.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SessionRoom } from "@/components/coaching/SessionRoom";
import { PostSessionPanel } from "@/components/coaching/PostSessionPanel";

type Props = {
  bookingId: string;
  scheduledAt: string;
  durationMinutes: number;
  coachName: string;
  memberName: string | null;
  role: "member" | "coach";
};

export function SessionRoomClient({
  bookingId,
  scheduledAt,
  durationMinutes,
  coachName,
  memberName,
  role,
}: Props) {
  const router = useRouter();
  const [showPostSession, setShowPostSession] = useState(false);

  if (showPostSession) {
    return (
      <PostSessionPanel
        bookingId={bookingId}
        role={role}
        coachName={coachName}
        memberName={memberName}
        onComplete={() => {
          // Give Supabase a moment then refresh so status shows "completed"
          setTimeout(() => router.refresh(), 500);
        }}
      />
    );
  }

  return (
    <SessionRoom
      bookingId={bookingId}
      scheduledAt={scheduledAt}
      durationMinutes={durationMinutes}
      coachName={coachName}
      memberName={memberName}
      role={role}
      onEnd={() => {
        setShowPostSession(true);
      }}
    />
  );
}
