"use client";

/**
 * app/(member)/account/coaching/session/[id]/session-room-client.tsx
 *
 * Client boundary for the SessionRoom component.
 * Wraps the Livekit components (which require browser APIs).
 */

import { SessionRoom } from "@/components/coaching/SessionRoom";
import { useRouter } from "next/navigation";

type Props = {
  bookingId: string;
  scheduledAt: string;
  durationMinutes: number;
  coachName: string;
  role: "member" | "coach";
};

export function SessionRoomClient({
  bookingId,
  scheduledAt,
  durationMinutes,
  coachName,
  role,
}: Props) {
  const router = useRouter();

  return (
    <SessionRoom
      bookingId={bookingId}
      scheduledAt={scheduledAt}
      durationMinutes={durationMinutes}
      coachName={coachName}
      role={role}
      onEnd={() => {
        // Refresh the page when session ends so status updates
        router.refresh();
      }}
    />
  );
}
