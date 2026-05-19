/**
 * app/api/coaching/cancel/route.ts
 *
 * POST /api/coaching/cancel
 *
 * Cancels a confirmed coaching booking.
 * - Must belong to the requesting member
 * - Restores session credit if canceled > 24h before the session
 * - Sends cancellation email
 */

import { NextRequest, NextResponse } from "next/server";
import { requireMember } from "@/lib/auth/require-member";
import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";
import { sendPostmarkEmail } from "@/lib/email/postmark";
import { renderCoachingCancellationEmail } from "@/lib/email/templates/coaching-confirmation-email";

type CancelRequest = {
  bookingId: string;
};

export async function POST(req: NextRequest) {
  try {
    const member = await requireMember();
    const { bookingId } = (await req.json()) as CancelRequest;

    if (!bookingId) {
      return NextResponse.json({ error: "bookingId is required" }, { status: 400 });
    }

    const supabase = asLooseSupabaseClient(getAdminClient());

    // Load the booking and verify ownership
    type BookingRow = {
      id: string;
      member_id: string;
      pack_id: string;
      status: string;
      scheduled_at: string;
      duration_minutes: number;
      timezone: string | null;
      coach: { display_name: string } | Array<{ display_name: string }>;
    };

    const { data: bookingRaw, error: fetchError } = await supabase
      .from("coaching_booking")
      .select(
        "id, member_id, pack_id, status, scheduled_at, duration_minutes, timezone, coach:coach_profile(display_name)"
      )
      .eq("id", bookingId)
      .single();

    const booking = bookingRaw as BookingRow | null;

    if (fetchError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.member_id !== member.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (booking.status !== "confirmed") {
      return NextResponse.json(
        { error: "Only confirmed sessions can be canceled" },
        { status: 400 }
      );
    }

    // Determine if session credit should be restored
    // Policy: restore if canceled > 24h before the session
    const sessionTime = new Date(booking.scheduled_at).getTime();
    const hoursUntilSession = (sessionTime - Date.now()) / (1000 * 60 * 60);

    // Hard cutoff: cannot cancel within 2h of the session start
    if (hoursUntilSession < 2) {
      return NextResponse.json(
        {
          error:
            "Sessions cannot be canceled less than 2 hours before the start time. Please contact support if you need assistance.",
        },
        { status: 400 }
      );
    }

    const sessionRestored = hoursUntilSession > 24;

    // Cancel the booking
    const { error: cancelError } = await supabase
      .from("coaching_booking")
      .update({
        status: "canceled",
        canceled_at: new Date().toISOString(),
        canceled_by: "member",
      })
      .eq("id", bookingId)
      .eq("member_id", member.id); // double-check ownership at DB level

    if (cancelError) {
      console.error("[coaching/cancel] cancel error:", cancelError);
      return NextResponse.json({ error: "Failed to cancel booking" }, { status: 500 });
    }

    // Restore session credit if eligible
    if (sessionRestored) {
      // Load current pack balance
      type PackRow = { id: string; sessions_remaining: number };
      const { data: packRaw } = await supabase
        .from("coaching_session_pack")
        .select("id, sessions_remaining")
        .eq("id", booking.pack_id)
        .single();
      const pack = packRaw as PackRow | null;

      if (pack) {
        await supabase
          .from("coaching_session_pack")
          .update({ sessions_remaining: pack.sessions_remaining + 1 })
          .eq("id", booking.pack_id);
      }
    }

    // Send cancellation email (non-fatal)
    try {
      const coachProfile = Array.isArray(booking.coach) ? booking.coach[0] : booking.coach;
      const coachName = coachProfile?.display_name ?? "your coach";
      const tz = booking.timezone ?? "America/New_York";
      const scheduledAt = new Date(booking.scheduled_at).toLocaleString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: tz,
        timeZoneName: "short",
      });

      const { subject, html, text } = renderCoachingCancellationEmail({
        recipientEmail: member.email,
        memberName: member.name ?? null,
        coachName,
        scheduledAt,
        sessionRestored,
      });

      await sendPostmarkEmail({
        to: member.email,
        subject,
        html,
        text,
        tag: "coaching-cancellation",
        idempotencyKey: `cancel-${bookingId}`,
      });
    } catch (emailErr) {
      console.error("[coaching/cancel] email send failed:", emailErr);
      // Non-fatal — booking is already canceled
    }

    return NextResponse.json({ success: true, sessionRestored });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.includes("not authenticated") || message.includes("requireMember")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[coaching/cancel]", err);
    return NextResponse.json({ error: "Cancellation failed" }, { status: 500 });
  }
}
