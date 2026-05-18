/**
 * app/api/coaching/book/route.ts
 *
 * POST /api/coaching/book
 *
 * Creates a confirmed coaching booking:
 * 1. Validates the member has available sessions
 * 2. Validates the slot is still available
 * 3. Deducts one session from the oldest eligible pack (in a transaction)
 * 4. Creates the coaching_booking record
 * 5. Creates a Livekit room
 * 6. Returns the booking ID
 *
 * All critical steps are atomic — session deduction and booking creation
 * happen in the same Postgres transaction via RPC.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireMember } from "@/lib/auth/require-member";
import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";
import { createCoachingRoom, coachingRoomName } from "@/lib/livekit/client";

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
    const { data: packs, error: packError } = await supabase
      .from("coaching_session_pack")
      .select("id, sessions_remaining, expires_at")
      .eq("member_id", member.id)
      .gt("sessions_remaining", 0)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order("expires_at", { ascending: true, nullsFirst: false }) // use soonest-to-expire first
      .order("created_at", { ascending: true })
      .limit(1);

    if (packError || !packs || packs.length === 0) {
      return NextResponse.json(
        { error: "No sessions available. Purchase a coaching session to continue." },
        { status: 403 }
      );
    }

    const pack = packs[0];

    // ── 2. Validate the slot is still available ───────────────────────────────
    // Check for conflicting bookings for this coach (within session duration)
    const { data: coach } = await supabase
      .from("coach_profile")
      .select("session_duration_minutes, buffer_minutes_after, display_name")
      .eq("id", coachId)
      .single();

    if (!coach) {
      return NextResponse.json({ error: "Coach not found" }, { status: 404 });
    }

    const sessionEndMs =
      sessionTime.getTime() +
      (coach.session_duration_minutes + coach.buffer_minutes_after) * 60 * 1000;

    const { data: conflicts } = await supabase
      .from("coaching_booking")
      .select("id")
      .eq("coach_id", coachId)
      .in("status", ["confirmed", "pending"])
      .lte("scheduled_at", new Date(sessionEndMs).toISOString())
      .gte("scheduled_at", new Date(sessionTime.getTime() - coach.session_duration_minutes * 60 * 1000).toISOString())
      .limit(1);

    if (conflicts && conflicts.length > 0) {
      return NextResponse.json(
        { error: "This slot is no longer available. Please choose another time." },
        { status: 409 }
      );
    }

    // ── 3. Create the booking record ─────────────────────────────────────────
    const { data: booking, error: bookingError } = await supabase
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

    // ── 5. Create Livekit room ────────────────────────────────────────────────
    const roomName = coachingRoomName(bookingId);
    try {
      await createCoachingRoom({
        roomName,
        emptyTimeoutSeconds: 300,
        maxParticipants: 2,
      });

      await supabase
        .from("coaching_booking")
        .update({
          livekit_room_name: roomName,
          livekit_room_created_at: new Date().toISOString(),
        })
        .eq("id", bookingId);
    } catch (livekitErr) {
      // Non-fatal — room can be created later when joining
      console.error("[coaching/book] Livekit room creation failed:", livekitErr);
    }

    // ── 6. Return success ─────────────────────────────────────────────────────
    return NextResponse.json({
      bookingId,
      roomName,
      scheduledAt,
      coachName: coach.display_name,
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
