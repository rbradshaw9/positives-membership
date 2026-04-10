/**
 * app/api/cron/winback-drip/route.ts
 *
 * Daily cron — sends pending win-back emails to canceled members.
 * Vercel Cron: runs at 14:30 UTC (9:30 AM ET) every day.
 * Protected by CRON_SECRET.
 *
 * Sequence: Day 1, 14, 30 after cancellation.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { resend, FROM_ADDRESS, REPLY_TO } from "@/lib/email/resend";
import { winbackDay1EmailHtml, winbackDay1EmailText } from "@/lib/email/templates/winback-day1";
import { winbackDay14EmailHtml, winbackDay14EmailText } from "@/lib/email/templates/winback-day14";
import { winbackDay30EmailHtml, winbackDay30EmailText } from "@/lib/email/templates/winback-day30";
import { buildUnsubscribeUrl } from "@/lib/email/unsubscribe";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const REJOIN_URL = "https://positives.life/join";

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
    .from("winback_sequence")
    .select("id, member_id, email, day, send_at")
    .lte("send_at", new Date().toISOString())
    .is("sent_at", null)
    .eq("failed", false)
    .order("send_at", { ascending: true })
    .limit(50);

  if (fetchError) {
    console.error("[Cron/Winback] Failed to fetch pending rows:", fetchError.message);
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!pending || pending.length === 0) {
    return NextResponse.json({ processed: 0 });
  }

  // Batch-fetch first names
  const memberIds = [...new Set((pending as PendingRow[]).map((r) => r.member_id))];
  const { data: members } = await supabase
    .from("member")
    .select("id, name")
    .in("id", memberIds);

  const firstNameMap = new Map<string, string>();
  (members ?? []).forEach((m: { id: string; name: string | null }) => {
    if (m.name) firstNameMap.set(m.id, m.name.split(" ")[0]);
  });

  let sent = 0;
  let failed = 0;

  for (const row of pending as PendingRow[]) {
    const firstName = firstNameMap.get(row.member_id) ?? row.email.split("@")[0];
    const data = {
      firstName,
      rejoindUrl: REJOIN_URL,
      unsubscribeUrl: buildUnsubscribeUrl(row.email),
    };

    let payload: EmailPayload | null = null;
    switch (row.day) {
      case 1:
        payload = {
          subject: "We'll miss you.",
          html: winbackDay1EmailHtml(data),
          text: winbackDay1EmailText(data),
        };
        break;
      case 14:
        payload = {
          subject: "Two weeks. Still thinking of you.",
          html: winbackDay14EmailHtml(data),
          text: winbackDay14EmailText(data),
        };
        break;
      case 30:
        payload = {
          subject: "One last note.",
          html: winbackDay30EmailHtml(data),
          text: winbackDay30EmailText(data),
        };
        break;
    }

    if (!payload) {
      console.warn(`[Cron/Winback] Unknown day ${row.day} for row ${row.id}, skipping`);
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
        { idempotencyKey: `winback-day${row.day}/${row.id}` },
      );

      if (sendError) throw new Error(sendError.message);

      await supabase
        .from("winback_sequence")
        .update({ sent_at: new Date().toISOString() })
        .eq("id", row.id);

      sent++;
      console.log(`[Cron/Winback] Sent day-${row.day} email to ${row.email}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await supabase
        .from("winback_sequence")
        .update({ failed: true, error_message: message })
        .eq("id", row.id);

      failed++;
      console.error(`[Cron/Winback] Failed day-${row.day} for ${row.email}:`, message);
    }
  }

  return NextResponse.json({ processed: pending.length, sent, failed });
}
