"use client";

/**
 * app/(member)/account/coaching/session/[id]/post-session-wrapper.tsx
 *
 * Thin client wrapper for PostSessionPanel when rendered from the server page
 * (expired session path). Provides the onComplete → router.refresh() callback
 * so the UI updates after the member or coach submits their notes.
 */

import { useRouter } from "next/navigation";
import { PostSessionPanel } from "@/components/coaching/PostSessionPanel";

type Props = {
  bookingId: string;
  role: "coach" | "member";
  coachName?: string;
  memberName?: string | null;
};

export function PostSessionWrapper({ bookingId, role, coachName, memberName }: Props) {
  const router = useRouter();
  return (
    <PostSessionPanel
      bookingId={bookingId}
      role={role}
      coachName={coachName}
      memberName={memberName}
      onComplete={() => {
        // Small delay lets Supabase settle before refresh
        setTimeout(() => router.refresh(), 500);
      }}
    />
  );
}
