/**
 * lib/payment-recovery/enroll.ts
 *
 * Enroll a past-due member in the payment recovery follow-up sequence.
 * Called from handlePaymentFailed (after the immediate Day 1 email fires).
 *
 * Schedules Day 3 and Day 7 follow-up emails.
 * Safe to call multiple times — UNIQUE(member_id, day) ignores duplicates.
 *
 * Note: If the member pays before these fire, the cron updates their
 * member status — but we should also cancel pending rows on recovery.
 * See: cancelPaymentRecoverySequence() below.
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const RECOVERY_DAYS = [3, 7] as const;

export async function enrollInPaymentRecoverySequence(
  memberId: string,
  email: string,
  failedAt = new Date(),
): Promise<void> {
  const rows = RECOVERY_DAYS.map((day) => {
    const sendAt = new Date(failedAt);
    sendAt.setDate(sendAt.getDate() + day);
    sendAt.setUTCHours(14, 0, 0, 0); // 9:00 AM ET = 14:00 UTC
    return { member_id: memberId, email, day, send_at: sendAt.toISOString() };
  });

  const { error } = await supabase
    .from("payment_recovery_sequence")
    .upsert(rows, { onConflict: "member_id,day", ignoreDuplicates: true });

  if (error) {
    console.error("[Recovery] Failed to enroll in payment recovery sequence:", error.message);
  } else {
    console.log(
      `[Recovery] Enrolled ${email} — follow-up emails scheduled for days ${RECOVERY_DAYS.join(", ")}`,
    );
  }
}

/**
 * Cancel any pending recovery emails when payment is recovered.
 * Called from handlePaymentSucceeded to suppress follow-up emails.
 * Marks remaining rows as sent (by setting sent_at) so the cron skips them.
 */
export async function cancelPaymentRecoverySequence(memberId: string): Promise<void> {
  const { error } = await supabase
    .from("payment_recovery_sequence")
    .update({ sent_at: new Date().toISOString() })
    .eq("member_id", memberId)
    .is("sent_at", null);

  if (error) {
    console.error("[Recovery] Failed to cancel recovery sequence:", error.message);
  } else {
    console.log(`[Recovery] Recovery sequence canceled for member ${memberId} (payment recovered)`);
  }
}
