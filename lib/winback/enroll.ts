/**
 * lib/winback/enroll.ts
 *
 * Enroll a canceled member in the win-back drip sequence.
 * Called once from handleSubscriptionDeleted.
 *
 * Schedules emails at days 1, 14, and 30 after cancellation.
 * Safe to call multiple times — UNIQUE(member_id, day) ignores duplicates.
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const WINBACK_DAYS = [1, 14, 30] as const;

export async function enrollInWinbackSequence(
  memberId: string,
  email: string,
  canceledAt = new Date(),
): Promise<void> {
  const rows = WINBACK_DAYS.map((day) => {
    const sendAt = new Date(canceledAt);
    sendAt.setDate(sendAt.getDate() + day);
    sendAt.setUTCHours(14, 0, 0, 0); // 9:00 AM ET = 14:00 UTC
    return { member_id: memberId, email, day, send_at: sendAt.toISOString() };
  });

  const { error } = await supabase
    .from("winback_sequence")
    .upsert(rows, { onConflict: "member_id,day", ignoreDuplicates: true });

  if (error) {
    console.error("[Winback] Failed to enroll member in winback sequence:", error.message);
  } else {
    console.log(
      `[Winback] Enrolled ${email} — emails scheduled for days ${WINBACK_DAYS.join(", ")} after cancellation`,
    );
  }
}
