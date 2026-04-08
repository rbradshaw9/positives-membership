/**
 * app/api/cron/payment-recovery-drip/route.ts
 *
 * Daily cron — sends pending payment recovery follow-up emails.
 * Vercel Cron: runs at 15:00 UTC (10:00 AM ET) every day.
 * Protected by CRON_SECRET.
 *
 * Sequence: Day 3 and Day 7 after initial payment failure.
 * Day 1 email is sent immediately by handle-subscription.ts.
 *
 * If the member pays before these fire, cancelPaymentRecoverySequence()
 * marks the rows as sent so this cron skips them.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { resend, FROM_ADDRESS, REPLY_TO } from "@/lib/email/resend";
import {
  paymentRecoveryDay3EmailHtml,
  paymentRecoveryDay3EmailText,
} from "@/lib/email/templates/payment-recovery-day3";
import {
  paymentRecoveryDay7EmailHtml,
  paymentRecoveryDay7EmailText,
} from "@/lib/email/templates/payment-recovery-day7";
import { generateBillingToken } from "@/lib/auth/billing-token";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

type PendingRow = {
  id: string;
  member_id: string;
  email: string;
  day: number;
  send_at: string;
};

type EmailPayload = { subject: string; html: string; text: string };

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const expectedToken = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || authHeader !== expectedToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: pending, error: fetchError } = await supabase
    .from("payment_recovery_sequence")
    .select("id, member_id, email, day, send_at")
    .lte("send_at", new Date().toISOString())
    .is("sent_at", null)
    .eq("failed", false)
    .order("send_at", { ascending: true })
    .limit(50);

  if (fetchError) {
    console.error("[Cron/Recovery] Failed to fetch pending rows:", fetchError.message);
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!pending || pending.length === 0) {
    return NextResponse.json({ processed: 0 });
  }

  // Batch-fetch member data (name, stripe_customer_id)
  const memberIds = [...new Set((pending as PendingRow[]).map((r) => r.member_id))];
  const { data: members } = await supabase
    .from("member")
    .select("id, name, stripe_customer_id, subscription_status")
    .in("id", memberIds);

  type MemberRow = {
    id: string;
    name: string | null;
    stripe_customer_id: string | null;
    subscription_status: string;
  };
  const memberMap = new Map<string, MemberRow>();
  (members ?? []).forEach((m: MemberRow) => memberMap.set(m.id, m));

  let sent = 0;
  let failed = 0;

  for (const row of pending as PendingRow[]) {
    const member = memberMap.get(row.member_id);

    // Skip if member has recovered payment — subscription status no longer past_due
    if (member && member.subscription_status !== "past_due") {
      await supabase
        .from("payment_recovery_sequence")
        .update({ sent_at: new Date().toISOString() })
        .eq("id", row.id);
      console.log(`[Cron/Recovery] Skipped day-${row.day} for ${row.email} — payment recovered`);
      continue;
    }

    const firstName = member?.name?.split(" ")[0] ?? row.email.split("@")[0];

    // Generate a fresh signed billing token for each email
    let updatePaymentUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://positives.life"}/account/billing`;
    if (member?.stripe_customer_id) {
      try {
        const token = generateBillingToken({
          stripeCustomerId: member.stripe_customer_id,
          email: row.email,
        });
        updatePaymentUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://positives.life"}/account/billing?token=${token}`;
      } catch (tokenErr) {
        console.error("[Cron/Recovery] Failed to generate billing token (using fallback):", tokenErr);
      }
    }

    const data = {
      firstName,
      amountDue: "your membership fee", // Actual amount not stored; use generic fallback
      updatePaymentUrl,
    };

    let payload: EmailPayload | null = null;
    switch (row.day) {
      case 3:
        payload = {
          subject: "A quick follow-up on your Positives payment",
          html: paymentRecoveryDay3EmailHtml(data),
          text: paymentRecoveryDay3EmailText(data),
        };
        break;
      case 7:
        payload = {
          subject: "Your Positives membership is at risk of cancellation",
          html: paymentRecoveryDay7EmailHtml(data),
          text: paymentRecoveryDay7EmailText(data),
        };
        break;
    }

    if (!payload) {
      console.warn(`[Cron/Recovery] Unknown day ${row.day} for row ${row.id}, skipping`);
      continue;
    }

    try {
      const { error: sendError } = await resend.emails.send(
        {
          from: FROM_ADDRESS,
          replyTo: REPLY_TO,
          to: row.email,
          subject: payload.subject,
          html: payload.html,
          text: payload.text,
        },
        { idempotencyKey: `payment-recovery-day${row.day}/${row.id}` },
      );

      if (sendError) throw new Error(sendError.message);

      await supabase
        .from("payment_recovery_sequence")
        .update({ sent_at: new Date().toISOString() })
        .eq("id", row.id);

      sent++;
      console.log(`[Cron/Recovery] Sent day-${row.day} recovery email to ${row.email}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await supabase
        .from("payment_recovery_sequence")
        .update({ failed: true, error_message: message })
        .eq("id", row.id);

      failed++;
      console.error(`[Cron/Recovery] Failed day-${row.day} for ${row.email}:`, message);
    }
  }

  return NextResponse.json({ processed: pending.length, sent, failed });
}
