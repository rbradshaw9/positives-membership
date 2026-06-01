/**
 * app/api/coaching/reschedule/route.ts
 *
 * POST /api/coaching/reschedule
 *
 * Reschedule a confirmed booking to a new time slot.
 * - Verifies ownership
 * - Validates new slot availability
 * - Updates booking (no credit deduction — same booking, new time)
 * - Sends updated confirmation email
 */

import { NextRequest, NextResponse } from "next/server";
import { requireMember } from "@/lib/auth/require-member";
import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";
import { getAvailableSlots } from "@/lib/coaching/availability";
import { createCoachingZoomMeeting, updateCoachingZoomMeeting } from "@/lib/zoom/coaching";
import { sendPostmarkEmail } from "@/lib/email/postmark";
import { renderCoachingConfirmationEmail } from "@/lib/email/templates/coaching-confirmation-email";

type RescheduleRequest = {
  bookingId: string;
  newScheduledAt: string; // ISO UTC
  newCoachId?: string;    // optional — defaults to same coach
  timezone: string;
};

export async function POST(req: NextRequest) {
  try {
    const member = await requireMember();
    const { bookingId, newScheduledAt, newCoachId, timezone } =
      (await req.json()) as RescheduleRequest;

    if (!bookingId || !newScheduledAt || !timezone) {
      return NextResponse.json(
        { error: "bookingId, newScheduledAt, and timezone are required" },
        { status: 400 }
      );
    }

    const supabase = asLooseSupabaseClient(getAdminClient());

    // Load existing booking
    type BookingRow = {
      id: string;
      member_id: string;
      coach_id: string;
      status: string;
      scheduled_at: string;
      duration_minutes: number;
      zoom_connection_id: string | null;
      zoom_meeting_id: string | null;
      zoom_join_url: string | null;
      coach: { display_name: string; session_duration_minutes: number } | null;
    };

    const { data: bookingRaw } = await supabase
      .from("coaching_booking")
      .select("id, member_id, coach_id, status, scheduled_at, duration_minutes, zoom_connection_id, zoom_meeting_id, zoom_join_url, coach:coach_profile(display_name, session_duration_minutes)")
      .eq("id", bookingId)
      .single();

    const booking = bookingRaw as BookingRow | null;

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }
    if (booking.member_id !== member.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    if (booking.status !== "confirmed") {
      return NextResponse.json(
        { error: "Only confirmed sessions can be rescheduled" },
        { status: 400 }
      );
    }

    const targetCoachId = newCoachId ?? booking.coach_id;
    const newTime = new Date(newScheduledAt);

    if (newTime <= new Date()) {
      return NextResponse.json({ error: "New time must be in the future" }, { status: 400 });
    }

    // Validate new slot is actually available
    const slots = await getAvailableSlots({
      daysAhead: 60,
      memberId: member.id,
      timezone,
      excludeBookingId: bookingId, // don't block ourselves
    });

    const dateKey = newTime.toLocaleDateString("en-CA", { timeZone: timezone }); // YYYY-MM-DD
    const daySlots = (slots[dateKey] ?? []) as Array<{ startsAt: string; coachId: string }>;
    const slotExists = daySlots.some(
      (s) => s.startsAt === newScheduledAt && s.coachId === targetCoachId
    );

    if (!slotExists) {
      return NextResponse.json(
        { error: "That time slot is no longer available. Please choose another." },
        { status: 409 }
      );
    }

    // Update booking
    const { error: updateErr } = await supabase
      .from("coaching_booking")
      .update({
        scheduled_at: newScheduledAt,
        coach_id: targetCoachId,
        timezone,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId)
      .eq("member_id", member.id);

    if (updateErr) {
      console.error("[coaching/reschedule] update error:", updateErr);
      return NextResponse.json({ error: "Failed to reschedule" }, { status: 500 });
    }

    let zoomJoinUrl = booking.zoom_join_url;
    try {
      if (booking.zoom_connection_id && booking.zoom_meeting_id) {
        await updateCoachingZoomMeeting({
          connectionId: booking.zoom_connection_id,
          meetingId: booking.zoom_meeting_id,
          scheduledAt: newScheduledAt,
          durationMinutes: booking.duration_minutes,
          timezone,
        });
      } else {
        const zoomSession = await createCoachingZoomMeeting({
          coachId: targetCoachId,
          memberName: member.name ?? null,
          memberEmail: member.email,
          scheduledAt: newScheduledAt,
          durationMinutes: booking.duration_minutes,
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
      }
    } catch (zoomErr) {
      console.error("[coaching/reschedule] Zoom update failed:", zoomErr);
    }

    // Send updated confirmation email (non-fatal)
    try {
      const coachProfile = Array.isArray(booking.coach) ? booking.coach[0] : booking.coach;
      const scheduledAtFormatted = new Date(newScheduledAt).toLocaleString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: timezone,
      });

      // Member updated confirmation with clearer reschedule subject
      const memberEmail = renderCoachingConfirmationEmail({
        recipientEmail: member.email,
        memberName: member.name ?? null,
        coachName: coachProfile?.display_name ?? "Your Coach",
        scheduledAt: scheduledAtFormatted,
        durationMinutes: coachProfile?.session_duration_minutes ?? booking.duration_minutes,
        joinUrl: zoomJoinUrl ?? `https://positives.life/account/coaching/session/${bookingId}`,
        cancelUrl: "https://positives.life/account/coaching",
        calendarUrl: `https://positives.life/account/coaching/session/${bookingId}/calendar`,
      });

      await sendPostmarkEmail({
        to: member.email,
        subject: `Your session has been moved to ${scheduledAtFormatted}`,
        html: memberEmail.html,
        text: memberEmail.text,
        tag: "coaching-reschedule",
        idempotencyKey: `reschedule-${bookingId}-${newScheduledAt}`,
      });
    } catch (emailErr) {
      console.error("[coaching/reschedule] email failed:", emailErr);
    }

    return NextResponse.json({ success: true, scheduledAt: newScheduledAt });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.includes("not authenticated") || message.includes("requireMember")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[coaching/reschedule]", err);
    return NextResponse.json({ error: "Reschedule failed" }, { status: 500 });
  }
}
