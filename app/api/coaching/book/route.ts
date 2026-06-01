/**
 * app/api/coaching/book/route.ts
 *
 * POST /api/coaching/book
 *
 * Creates a confirmed coaching booking:
 * 1. Validates the member has available sessions
 * 2. Validates the slot is still available
 * 3. Creates the coaching_booking record
 * 4. Deducts one session from the oldest eligible pack with an optimistic lock
 * 5. Creates a Zoom meeting when a Zoom account is available
 * 6. Returns the booking ID
 */

import { NextRequest, NextResponse } from "next/server";
import { requireMember } from "@/lib/auth/require-member";
import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";
import { createCoachingZoomMeeting } from "@/lib/zoom/coaching";
import { sendPostmarkEmail } from "@/lib/email/postmark";
import {
  renderCoachingConfirmationEmail,
  renderCoachBookingNotificationEmail,
} from "@/lib/email/templates/coaching-confirmation-email";

type BookRequest = {
  coachId: string;
  scheduledAt: string;  // ISO UTC string
  timezone: string;     // member's local timezone
  intake?: string;      // optional pre-session notes
};

export async function POST(req: NextRequest) {
  try {
    const member = await requireMember();
    const body = (await req.json()) as BookRequest;
    const { coachId, scheduledAt, timezone, intake } = body;

    if (!coachId || !scheduledAt || !timezone) {
      return NextResponse.json(
        { error: "coachId, scheduledAt, and timezone are required" },
        { status: 400 }
      );
    }

    if (intake && intake.length > 1000) {
      return NextResponse.json(
        { error: "Pre-session notes must be 1000 characters or fewer" },
        { status: 400 }
      );
    }

    // Validate scheduled time is in the future (min 30 min ahead)
    const sessionTime = new Date(scheduledAt);
    if (sessionTime.getTime() < Date.now() + 30 * 60 * 1000) {
      return NextResponse.json(
        { error: "Sessions must be booked at least 30 minutes in advance" },
        { status: 400 }
      );
    }

    const supabase = asLooseSupabaseClient(getAdminClient());

    // ── 1. Find the oldest eligible pack to deduct from ──────────────────────
    const now = new Date().toISOString();
    const { data: packsRaw, error: packError } = await supabase
      .from("coaching_session_pack")
      .select("id, sessions_remaining, expires_at")
      .eq("member_id", member.id)
      .gt("sessions_remaining", 0)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order("expires_at", { ascending: true, nullsFirst: false }) // use soonest-to-expire first
      .order("created_at", { ascending: true })
      .limit(1);
    const packs = packsRaw as Array<{ id: string; sessions_remaining: number; expires_at: string | null }> | null;

    if (packError || !packs || packs.length === 0) {
      return NextResponse.json(
        { error: "No sessions available. Purchase a coaching session to continue." },
        { status: 403 }
      );
    }

    const pack = packs[0];

    // ── 2. Validate the slot is still available ───────────────────────────────
    // Check for conflicting bookings for this coach (within session duration)
    const { data: coachRaw } = await supabase
      .from("coach_profile")
      .select("session_duration_minutes, buffer_minutes_after, display_name, member_id")
      .eq("id", coachId)
      .single();
    const coach = coachRaw as { session_duration_minutes: number; buffer_minutes_after: number; display_name: string; member_id: string | null } | null;

    if (!coach) {
      return NextResponse.json({ error: "Coach not found" }, { status: 404 });
    }

    // Prevent a coach from booking their own session
    if (coach.member_id && coach.member_id === member.id) {
      return NextResponse.json(
        { error: "You cannot book a session with yourself." },
        { status: 400 }
      );
    }

    const sessionEndMs =
      sessionTime.getTime() +
      (coach.session_duration_minutes + coach.buffer_minutes_after) * 60 * 1000;

    const { data: conflictsRaw } = await supabase
      .from("coaching_booking")
      .select("id")
      .eq("coach_id", coachId)
      .in("status", ["confirmed", "pending"])
      .lte("scheduled_at", new Date(sessionEndMs).toISOString())
      .gte("scheduled_at", new Date(sessionTime.getTime() - coach.session_duration_minutes * 60 * 1000).toISOString())
      .limit(1);
    const conflicts = conflictsRaw as Array<{ id: string }> | null;

    if (conflicts && conflicts.length > 0) {
      return NextResponse.json(
        { error: "This slot is no longer available. Please choose another time." },
        { status: 409 }
      );
    }

    // ── 3. Create the booking record ─────────────────────────────────────────
    const { data: bookingRaw, error: bookingError } = await supabase
      .from("coaching_booking")
      .insert({
        member_id: member.id,
        coach_id: coachId,
        pack_id: pack.id,
        status: "confirmed",
        scheduled_at: scheduledAt,
        duration_minutes: coach.session_duration_minutes,
        timezone,
        member_intake: intake ?? null,
      })
      .select("id")
      .single();
    const booking = bookingRaw as { id: string } | null;

    if (bookingError || !booking) {
      console.error("[coaching/book] booking insert error:", bookingError);
      return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
    }

    const bookingId = booking.id;

    // ── 4. Deduct the session from the pack (atomic update with check) ────────
    const { error: deductError } = await supabase
      .from("coaching_session_pack")
      .update({ sessions_remaining: pack.sessions_remaining - 1 })
      .eq("id", pack.id)
      .eq("sessions_remaining", pack.sessions_remaining); // optimistic lock

    if (deductError) {
      // Roll back the booking if deduction fails
      await supabase.from("coaching_booking").delete().eq("id", bookingId);
      return NextResponse.json(
        { error: "Failed to deduct session — please try again" },
        { status: 500 }
      );
    }

    // ── 5. Create Zoom meeting ────────────────────────────────────────────────
    let zoomJoinUrl: string | null = null;
    try {
      const zoomSession = await createCoachingZoomMeeting({
        coachId,
        memberName: member.name ?? null,
        memberEmail: member.email,
        scheduledAt,
        durationMinutes: coach.session_duration_minutes,
        timezone,
      });
      if (zoomSession) {
        zoomJoinUrl = zoomSession.joinUrl;
        await supabase
          .from("coaching_booking")
          .update({
            zoom_connection_id: zoomSession.connectionId,
            zoom_join_url: zoomSession.joinUrl,
            zoom_meeting_id: zoomSession.meetingId,
            zoom_start_url_ciphertext: zoomSession.startUrlCiphertext,
            zoom_host_email: zoomSession.hostEmail,
            zoom_provider_status: zoomSession.providerStatus,
            zoom_raw_metadata: zoomSession.rawMetadata,
          })
          .eq("id", bookingId);
      }
    } catch (zoomErr) {
      // Non-fatal — admins can attach a Zoom link manually if account setup fails.
      console.error("[coaching/book] Zoom meeting creation failed:", zoomErr);
    }

    // ── 6. Send confirmation email (non-fatal) ────────────────────────────────
    try {
      const scheduledAtFormatted = new Date(scheduledAt).toLocaleString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: timezone,
      });
      const sessionUrl = `https://positives.life/account/coaching/session/${bookingId}`;
      const joinUrl = zoomJoinUrl ?? sessionUrl;
      const calendarUrl = `${sessionUrl}/calendar`;
      const cancelUrl = "https://positives.life/account/coaching";

      // Member confirmation
      const memberEmail = renderCoachingConfirmationEmail({
        recipientEmail: member.email,
        memberName: member.name ?? null,
        coachName: coach.display_name,
        scheduledAt: scheduledAtFormatted,
        durationMinutes: coach.session_duration_minutes,
        joinUrl,
        cancelUrl,
        calendarUrl,
      });

      await sendPostmarkEmail({
        to: member.email,
        subject: memberEmail.subject,
        html: memberEmail.html,
        text: memberEmail.text,
        tag: "coaching-confirmation",
        idempotencyKey: `confirm-${bookingId}`,
      });

      // Coach notification — look up coach's email
      if (coach.member_id) {
        const { data: coachMemberRaw } = await supabase
          .from("member")
          .select("email")
          .eq("id", coach.member_id)
          .single();
        const coachMember = coachMemberRaw as { email: string } | null;

        if (coachMember?.email) {
          const coachNotif = renderCoachBookingNotificationEmail({
            recipientEmail: coachMember.email,
            coachName: coach.display_name,
            memberName: member.name ?? null,
            memberEmail: member.email,
            scheduledAt: scheduledAtFormatted,
            durationMinutes: coach.session_duration_minutes,
            memberIntake: intake ?? null,
            sessionUrl,
            joinUrl,
            calendarUrl,
          });

          await sendPostmarkEmail({
            to: coachMember.email,
            subject: coachNotif.subject,
            html: coachNotif.html,
            text: coachNotif.text,
            tag: "coaching-coach-notification",
            idempotencyKey: `coach-notify-${bookingId}`,
          });
        }
      }
    } catch (emailErr) {
      console.error("[coaching/book] email failed:", emailErr);
      // Non-fatal — booking is confirmed regardless
    }

    // ── 7. Return success ─────────────────────────────────────────────────────
    return NextResponse.json({
      bookingId,
      zoomJoinUrl,
      scheduledAt,
      coachName: coach.display_name,
      durationMinutes: coach.session_duration_minutes,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.includes("not authenticated") || message.includes("requireMember")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[coaching/book]", err);
    return NextResponse.json({ error: "Booking failed" }, { status: 500 });
  }
}
