/**
 * lib/onboarding/enroll.ts
 *
 * Enroll a new member in the onboarding drip sequence.
 * Called once, immediately after checkout activation.
 *
 * Inserts rows into `onboarding_sequence` for days 3, 7, and 14.
 * Day 0 (welcome email) is already sent directly by handle-checkout.ts.
 *
 * Safe to call multiple times — the UNIQUE(member_id, day) constraint
 * on onboarding_sequence means duplicate enrollments are silently ignored.
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const DRIP_DAYS = [3, 7, 14] as const;

/**
 * Schedule the onboarding drip sequence for a new member.
 *
 * @param memberId  - UUID from the `member` table
 * @param email     - The member's email address
 * @param enrolledAt - When the member activated (defaults to now)
 */
export async function enrollInOnboardingSequence(
  memberId: string,
  email: string,
  enrolledAt = new Date(),
): Promise<void> {
  const rows = DRIP_DAYS.map((day) => {
    const sendAt = new Date(enrolledAt);
    sendAt.setDate(sendAt.getDate() + day);
    // Send at 9:00 AM ET = 14:00 UTC (shift timestamp to 9am same calendar day)
    sendAt.setUTCHours(14, 0, 0, 0);

    return {
      member_id: memberId,
      email,
      day,
      send_at: sendAt.toISOString(),
    };
  });

  const { error } = await supabase
    .from("onboarding_sequence")
    .upsert(rows, { onConflict: "member_id,day", ignoreDuplicates: true });

  if (error) {
    // Non-fatal — log and continue. The member still activated successfully.
    console.error("[Onboarding] Failed to enroll member in drip sequence:", error.message);
  } else {
    console.log(
      `[Onboarding] Enrolled ${email} — drip emails scheduled for days ${DRIP_DAYS.join(", ")}`,
    );
  }
}
