import "./load-local-env";
import { expect, test } from "@playwright/test";
import { enrollInOnboardingSequence } from "@/lib/onboarding/enroll";
import {
  cancelPaymentRecoverySequence,
  enrollInPaymentRecoverySequence,
} from "@/lib/payment-recovery/enroll";
import { enrollInWinbackSequence } from "@/lib/winback/enroll";
import {
  clearLifecycleSequenceRows,
  getLifecycleSequenceRows,
  getMemberBillingState,
  MEMBER_EMAIL,
} from "./helpers";

test.describe.configure({ mode: "serial" });

test.describe("cron timing and protection", () => {
  test("sequence enrollment timestamps line up with the Vercel cron windows", async () => {
    const member = await getMemberBillingState(MEMBER_EMAIL);
    const enrolledAt = new Date("2026-04-10T12:15:00.000Z");

    await clearLifecycleSequenceRows(member.id);

    await enrollInOnboardingSequence(member.id, MEMBER_EMAIL, enrolledAt);
    await enrollInPaymentRecoverySequence(member.id, MEMBER_EMAIL, enrolledAt);
    await enrollInWinbackSequence(member.id, MEMBER_EMAIL, enrolledAt);

    const onboarding = await getLifecycleSequenceRows("onboarding_sequence", member.id);
    const recovery = await getLifecycleSequenceRows("payment_recovery_sequence", member.id);
    const winback = await getLifecycleSequenceRows("winback_sequence", member.id);
    const normalize = (rows: Array<{ day: number; send_at: string }>) =>
      rows.map((row) => ({
        day: row.day,
        send_at: new Date(row.send_at).toISOString(),
      }));

    expect(normalize(onboarding)).toEqual([
      { day: 3, send_at: "2026-04-13T14:00:00.000Z" },
      { day: 7, send_at: "2026-04-17T14:00:00.000Z" },
      { day: 14, send_at: "2026-04-24T14:00:00.000Z" },
    ]);

    expect(normalize(recovery)).toEqual([
      { day: 3, send_at: "2026-04-13T15:00:00.000Z" },
      { day: 7, send_at: "2026-04-17T15:00:00.000Z" },
    ]);

    expect(normalize(winback)).toEqual([
      { day: 1, send_at: "2026-04-11T14:30:00.000Z" },
      { day: 14, send_at: "2026-04-24T14:30:00.000Z" },
      { day: 30, send_at: "2026-05-10T14:30:00.000Z" },
    ]);

    await cancelPaymentRecoverySequence(member.id);
    await clearLifecycleSequenceRows(member.id);
  });

  test("cron routes reject missing auth and accept the configured cron secret", async ({
    request,
  }) => {
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      throw new Error("CRON_SECRET is required for cron route verification.");
    }

    for (const path of [
      "/api/cron/onboarding-drip",
      "/api/cron/payment-recovery-drip",
      "/api/cron/winback-drip",
    ]) {
      const unauthorized = await request.get(path);
      expect(unauthorized.status(), `${path} should reject missing auth`).toBe(401);

      const authorized = await request.get(path, {
        headers: { authorization: `Bearer ${cronSecret}` },
      });
      expect(authorized.status(), `${path} should accept the cron secret`).toBe(200);
    }
  });
});
