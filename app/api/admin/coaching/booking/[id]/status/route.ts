/**
 * app/api/admin/coaching/booking/[id]/status/route.ts
 *
 * POST /api/admin/coaching/booking/[id]/status
 *
 * Admin-only: update a booking's status (complete, noshow, cancel).
 * Body: { status: 'completed' | 'noshow' | 'canceled', adminNote?: string }
 *
 * Sends a member notification email when status is canceled or noshow.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";
import { sendPostmarkEmail } from "@/lib/email/postmark";
import { renderCoachingCancellationEmail } from "@/lib/email/templates/coaching-confirmation-email";

const ALLOWED_STATUSES = ["completed", "noshow", "canceled"] as const;
type AllowedStatus = (typeof ALLOWED_STATUSES)[number];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id: bookingId } = await params;
    const { status, adminNote, restoreCredit } = (await req.json()) as {
      status: AllowedStatus;
      adminNote?: string;
      restoreCredit?: boolean;
    };

    if (!ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const supabase = asLooseSupabaseClient(getAdminClient());

    // Load booking for email notification
    type BookingRow = {
      id: string;
      scheduled_at: string;
      duration_minutes: number;
      timezone: string | null;
      member: { email: string; name: string | null } | null;
      coach: { display_name: string; member_id: string | null } | null;
    };

    const { data: bookingRaw } = await supabase
      .from("coaching_booking")
      .select("id, scheduled_at, duration_minutes, timezone, member:member(email, name), coach:coach_profile(display_name, member_id)")
      .eq("id", bookingId)
      .single();

    const booking = bookingRaw as BookingRow | null;

    const updatePayload: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === "canceled") {
      updatePayload.canceled_at = new Date().toISOString();
      updatePayload.canceled_by = "admin";
    }

    if (adminNote) {
      updatePayload.admin_note = adminNote;
    }

    const { error } = await supabase
      .from("coaching_booking")
      .update(updatePayload)
      .eq("id", bookingId);

    if (error) {
      console.error("[admin/coaching/status] update error:", error);
      return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
    }

    // Restore session credit if requested (admin-initiated cancel)
    if (restoreCredit && booking) {
      try {
        type PackRow = { id: string; sessions_remaining: number };
        const { data: bookingMemberIdRaw } = await supabase
          .from("coaching_booking")
          .select("member_id, pack_id")
          .eq("id", bookingId)
          .single();
        const bm = bookingMemberIdRaw as { member_id: string; pack_id: string } | null;
        if (bm?.pack_id) {
          const { data: p } = await supabase
            .from("coaching_session_pack")
            .select("id, sessions_remaining")
            .eq("id", bm.pack_id)
            .single();
          const pack = p as PackRow | null;
          if (pack) {
            await supabase
              .from("coaching_session_pack")
              .update({ sessions_remaining: pack.sessions_remaining + 1 })
              .eq("id", pack.id);
          }
        }
      } catch (creditErr) {
        console.error("[admin/coaching/status] credit restore error:", creditErr);
        // Non-fatal
      }
    }

    // Send member notification for cancelation or no-show (non-fatal)
    if (booking && (status === "canceled" || status === "noshow") ) {
      try {
        const memberInfo = Array.isArray(booking.member) ? booking.member[0] : booking.member;
        const coachInfo = Array.isArray(booking.coach) ? booking.coach[0] : booking.coach;
        const tz = booking.timezone ?? "America/New_York";
        const scheduledAt = new Date(booking.scheduled_at).toLocaleString("en-US", {
          weekday: "long", month: "long", day: "numeric",
          hour: "numeric", minute: "2-digit",
          timeZone: tz, timeZoneName: "short",
        });
        if (memberInfo?.email) {
          const { subject, html, text } = renderCoachingCancellationEmail({
            recipientEmail: memberInfo.email,
            memberName: memberInfo.name ?? null,
            coachName: coachInfo?.display_name ?? "your coach",
            scheduledAt,
            // No-show: credit not restored. Canceled: admin decision, no credit restore.
            sessionRestored: false,
          });

          await sendPostmarkEmail({
            to: memberInfo.email,
            subject: status === "noshow"
              ? `Your coaching session was marked as a no-show`
              : subject,
            html,
            text,
            tag: `coaching-admin-${status}`,
            idempotencyKey: `admin-${status}-member-${bookingId}`,
          });
        }

        // Also notify the coach
        if (coachInfo?.member_id) {
          const { data: coachMemberRaw } = await supabase
            .from("member")
            .select("email")
            .eq("id", coachInfo.member_id)
            .single();
          const coachMember = coachMemberRaw as { email: string } | null;
          if (coachMember?.email) {
            const coachStatusLabel = status === "noshow" ? "no-show" : "canceled";
            await sendPostmarkEmail({
              to: coachMember.email,
              subject: `Session ${coachStatusLabel} — ${memberInfo?.name ?? "A member"}, ${scheduledAt}`,
              html: renderCoachingCancellationEmail({
                recipientEmail: coachMember.email,
                memberName: memberInfo?.name ?? null,
                coachName: coachInfo.display_name,
                scheduledAt,
                sessionRestored: false,
              }).html,
              text: `The session with ${memberInfo?.name ?? "a member"} on ${scheduledAt} was marked as ${coachStatusLabel} by an admin.`,
              tag: `coaching-admin-${status}-coach`,
              idempotencyKey: `admin-${status}-coach-${bookingId}`,
            });
          }
        }
      } catch (emailErr) {
        console.error("[admin/coaching/status] email error:", emailErr);
        // Non-fatal
      }
    }

    return NextResponse.json({ success: true, status });
  } catch (err) {
    console.error("[admin/coaching/status]", err);
    return NextResponse.json({ error: "Unauthorized or failed" }, { status: 401 });
  }
}
