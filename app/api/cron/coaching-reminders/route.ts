/**
 * app/api/cron/coaching-reminders/route.ts
 *
 * Cron job: runs every 30 minutes via Vercel Cron.
 * Sends coaching session reminders:
 *   - 24h before: "Your session is tomorrow"
 *   - 1h before:  "Your session is in 1 hour"
 *
 * Tracks sent reminders via a sent_coaching_reminders flag on coaching_booking
 * (uses admin_note as a lightweight flags field until a proper table is added).
 */

import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";
import { sendPostmarkEmail } from "@/lib/email/postmark";

const CRON_SECRET = process.env.CRON_SECRET;

type BookingRow = {
  id: string;
  scheduled_at: string;
  duration_minutes: number;
  timezone: string;
  admin_note: string | null;
  member: { email: string; name: string | null } | null;
  coach: { display_name: string; member_id: string | null } | null;
};

function formatReminderTime(iso: string, timezone: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
    timeZoneName: "short",
  }).format(new Date(iso));
}

function buildReminderHtml(params: {
  memberName: string | null;
  coachName: string;
  sessionTime: string;
  joinUrl: string;
  isUrgent: boolean;
}): { subject: string; html: string; text: string } {
  const name = params.memberName ?? "there";
  const urgency = params.isUrgent ? "in 1 hour" : "tomorrow";
  const subject = `Your coaching session is ${urgency}`;
  const preheader = `${params.sessionTime} · Don't forget to join on time.`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${preheader}</div>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;">
        <tr><td style="background:#0f172a;padding:24px 32px;">
          <p style="margin:0;font-size:18px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;">Positives</p>
        </td></tr>
        <tr><td style="padding:32px 32px 20px;">
          <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#6366f1;text-transform:uppercase;letter-spacing:0.12em;">${params.isUrgent ? "Starting soon" : "Session reminder"}</p>
          <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#0f172a;line-height:1.3;">Your session is ${urgency}, ${name}.</h1>
          <p style="margin:0;font-size:15px;line-height:1.75;color:#64748b;">Don't forget — your coaching session with ${params.coachName} is coming up.</p>
        </td></tr>
        <tr><td style="padding:0 32px 20px;">
          <table width="100%" style="background:#f8fafc;border-radius:12px;padding:16px 20px;border:1px solid #e2e8f0;">
            <tr><td>
              <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em;">Session details</p>
              <p style="margin:0 0 4px;font-size:16px;font-weight:700;color:#0f172a;">With ${params.coachName}</p>
              <p style="margin:0;font-size:14px;color:#64748b;">${params.sessionTime}</p>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:0 32px 32px;">
          <a href="${params.joinUrl}" style="display:inline-block;background:#6366f1;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:12px 24px;border-radius:10px;">Join Session</a>
          <p style="margin:16px 0 0;font-size:12px;color:#94a3b8;">The room opens 30 minutes before your session starts.</p>
        </td></tr>
        <tr><td style="padding:16px 32px;border-top:1px solid #f1f5f9;">
          <p style="margin:0;font-size:12px;color:#94a3b8;">This reminder was sent to you because you have an upcoming coaching session on Positives.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = [
    `Your coaching session is ${urgency}, ${name}.`,
    "",
    `With: ${params.coachName}`,
    `When: ${params.sessionTime}`,
    "",
    `Join your session: ${params.joinUrl}`,
    "",
    "The room opens 30 minutes before your session starts.",
  ].join("\n");

  return { subject, html, text };
}

export async function GET(req: Request) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = asLooseSupabaseClient(getAdminClient());
  const now = new Date();

  // Windows for 24h reminder: sessions between 23.5h and 24.5h from now
  const h24Start = new Date(now.getTime() + 23.5 * 60 * 60 * 1000);
  const h24End = new Date(now.getTime() + 24.5 * 60 * 60 * 1000);

  // Windows for 1h reminder: sessions between 50min and 70min from now
  const h1Start = new Date(now.getTime() + 50 * 60 * 1000);
  const h1End = new Date(now.getTime() + 70 * 60 * 1000);

  const sent: string[] = [];
  const errors: string[] = [];

  async function processReminders(
    windowStart: Date,
    windowEnd: Date,
    flag: "24h" | "1h"
  ) {
    const { data: bookingsRaw } = await supabase
      .from("coaching_booking")
      .select("id, scheduled_at, duration_minutes, timezone, admin_note, member:member(email, name), coach:coach_profile(display_name, member_id)")
      .eq("status", "confirmed")
      .gte("scheduled_at", windowStart.toISOString())
      .lte("scheduled_at", windowEnd.toISOString());

    const bookings = (bookingsRaw as BookingRow[] | null) ?? [];

    for (const b of bookings) {
      const flagKey = `__sys:reminder_${flag}_sent`;
      const alreadySent = b.admin_note?.includes(flagKey);
      if (alreadySent) continue;

      const member = Array.isArray(b.member) ? b.member[0] : b.member;
      const coach = Array.isArray(b.coach) ? b.coach[0] : b.coach;
      if (!member?.email) continue;

      try {
        const sessionTime = formatReminderTime(b.scheduled_at, b.timezone || "America/New_York");
        const joinUrl = `https://positives.life/account/coaching/session/${b.id}`;

        const { subject, html, text } = buildReminderHtml({
          memberName: member.name,
          coachName: coach?.display_name ?? "Your Coach",
          sessionTime,
          joinUrl,
          isUrgent: flag === "1h",
        });

        await sendPostmarkEmail({
          to: member.email,
          subject,
          html,
          text,
          tag: `coaching-reminder-${flag}`,
          idempotencyKey: `reminder-${b.id}-${flag}`,
        });

        // Mark as sent by appending to admin_note
        const existingNote = b.admin_note ?? "";
        const newNote = existingNote
          ? `${existingNote} | ${flagKey}`
          : flagKey;

        await supabase
          .from("coaching_booking")
          .update({ admin_note: newNote })
          .eq("id", b.id);

        sent.push(`${flag}:${b.id}:${member.email}`);

        // Also send a reminder to the coach
        if (coach?.member_id) {
          const { data: coachMemberRaw } = await supabase
            .from("member")
            .select("email")
            .eq("id", coach.member_id)
            .single();
          const coachMember = coachMemberRaw as { email: string } | null;
          if (coachMember?.email) {
            const coachSubject = flag === "1h"
              ? `Reminder: session with ${member.name ?? "a member"} starts in 1 hour`
              : `Reminder: session with ${member.name ?? "a member"} is tomorrow`;
            await sendPostmarkEmail({
              to: coachMember.email,
              subject: coachSubject,
              html,
              text,
              tag: `coaching-reminder-${flag}-coach`,
              idempotencyKey: `reminder-coach-${b.id}-${flag}`,
            });
          }
        }

      } catch (err) {
        const msg = err instanceof Error ? err.message : "unknown";
        errors.push(`${flag}:${b.id}: ${msg}`);
        console.error("[coaching-reminders]", err);
      }
    }
  }

  await processReminders(h24Start, h24End, "24h");
  await processReminders(h1Start, h1End, "1h");

  const completionCutoff = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
  const { count: completedCount, error: completeError } = await supabase
    .from("coaching_booking")
    .update({ status: "completed", updated_at: new Date().toISOString() })
    .eq("status", "confirmed")
    .lt("scheduled_at", completionCutoff)
    .select("id", { count: "exact", head: true });

  if (completeError) {
    errors.push(`completion:${completeError.message}`);
    console.error("[coaching-reminders] completion cleanup", completeError);
  }

  return NextResponse.json({
    ok: true,
    sent: sent.length,
    completed: completedCount ?? 0,
    errors: errors.length,
    detail: { sent, errors },
  });
}
