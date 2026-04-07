/**
 * app/api/cron/onboarding-drip/route.ts
 *
 * Daily cron job — processes pending onboarding drip emails.
 *
 * Vercel Cron: runs at 14:00 UTC (9:00 AM ET) every day.
 * Protected by CRON_SECRET — Vercel injects Authorization: Bearer <secret>
 * automatically for configured cron jobs.
 *
 * Flow:
 *  1. Query onboarding_sequence rows where send_at <= now() AND sent_at IS NULL AND failed = false
 *  2. For each row, render the appropriate template and send via Resend
 *  3. Mark sent_at on success; mark failed + error_message on error
 *
 * The job processes at most 50 rows per run to stay within Vercel's
 * 10s serverless timeout. Overflow processes on the next daily run.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { resend, FROM_ADDRESS, REPLY_TO } from "@/lib/email/resend";
import { day3EmailHtml, day3EmailText } from "@/lib/email/templates/onboarding-day3";
import { day7EmailHtml, day7EmailText } from "@/lib/email/templates/onboarding-day7";
import { day14EmailHtml, day14EmailText } from "@/lib/email/templates/onboarding-day14";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const DASHBOARD_URL = "https://positives.life/dashboard";

type PendingRow = {
  id: string;
  member_id: string;
  email: string;
  day: number;
  send_at: string;
};

type EmailPayload = {
  subject: string;
  html: string;
  text: string;
};

function buildEmail(row: PendingRow): EmailPayload | null {
  const firstName = row.email.split("@")[0]; // Fallback — real name not stored here
  const data = { firstName, dashboardUrl: DASHBOARD_URL };

  switch (row.day) {
    case 3:
      return {
        subject: "How's the practice feeling?",
        html: day3EmailHtml(data),
        text: day3EmailText(data),
      };
    case 7:
      return {
        subject: "You've made it a week.",
        html: day7EmailHtml(data),
        text: day7EmailText(data),
      };
    case 14:
      return {
        subject: "Two weeks. That's a real habit.",
        html: day14EmailHtml(data),
        text: day14EmailText(data),
      };
    default:
      return null;
  }
}

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  const expectedToken = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || authHeader !== expectedToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch due rows
  const { data: pending, error: fetchError } = await supabase
    .from("onboarding_sequence")
    .select("id, member_id, email, day, send_at")
    .lte("send_at", new Date().toISOString())
    .is("sent_at", null)
    .eq("failed", false)
    .order("send_at", { ascending: true })
    .limit(50);

  if (fetchError) {
    console.error("[Cron] Failed to fetch pending drip rows:", fetchError.message);
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!pending || pending.length === 0) {
    return NextResponse.json({ processed: 0 });
  }

  // Fetch first names from member table in one query
  const memberIds = [...new Set((pending as PendingRow[]).map((r) => r.member_id))];
  const { data: members } = await supabase
    .from("member")
    .select("id, first_name")
    .in("id", memberIds);

  const firstNameMap = new Map<string, string>();
  (members ?? []).forEach((m: { id: string; first_name: string | null }) => {
    if (m.first_name) firstNameMap.set(m.id, m.first_name);
  });

  let sent = 0;
  let failed = 0;

  for (const row of pending as PendingRow[]) {
    const firstName = firstNameMap.get(row.member_id) ?? row.email.split("@")[0];
    const data = { firstName, dashboardUrl: DASHBOARD_URL };

    let payload: EmailPayload | null = null;
    switch (row.day) {
      case 3:
        payload = {
          subject: "How's the practice feeling?",
          html: day3EmailHtml(data),
          text: day3EmailText(data),
        };
        break;
      case 7:
        payload = {
          subject: "You've made it a week.",
          html: day7EmailHtml(data),
          text: day7EmailText(data),
        };
        break;
      case 14:
        payload = {
          subject: "Two weeks. That's a real habit.",
          html: day14EmailHtml(data),
          text: day14EmailText(data),
        };
        break;
    }

    if (!payload) {
      console.warn(`[Cron] Unknown day ${row.day} for row ${row.id}, skipping`);
      continue;
    }

    try {
      const { error: sendError } = await resend.emails.send({
        from: FROM_ADDRESS,
        replyTo: REPLY_TO,
        to: row.email,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      });

      if (sendError) throw new Error(sendError.message);

      await supabase
        .from("onboarding_sequence")
        .update({ sent_at: new Date().toISOString() })
        .eq("id", row.id);

      sent++;
      console.log(`[Cron] Sent day-${row.day} email to ${row.email}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await supabase
        .from("onboarding_sequence")
        .update({ failed: true, error_message: message })
        .eq("id", row.id);

      failed++;
      console.error(`[Cron] Failed to send day-${row.day} to ${row.email}:`, message);
    }
  }

  return NextResponse.json({ processed: pending.length, sent, failed });
}
