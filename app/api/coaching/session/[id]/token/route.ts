/**
 * app/api/coaching/session/[id]/token/route.ts
 *
 * GET /api/coaching/session/{id}/token
 *
 * Generates a signed Livekit join token for the requesting user.
 * Validates:
 *   - User is authenticated
 *   - Booking belongs to the member OR requesting user is the assigned coach
 *   - Session is within the joinable window (30 min before → 2h after scheduled time)
 *
 * Returns: { token, roomName, role }
 */

import { NextRequest, NextResponse } from "next/server";
import { requireMember } from "@/lib/auth/require-member";
import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";
import {
  generateJoinToken,
  createCoachingRoom,
  coachingRoomName,
} from "@/lib/livekit/client";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const member = await requireMember();
    const { id: bookingId } = await params;

    const supabase = asLooseSupabaseClient(getAdminClient());

    // Load booking with coach info
    type BookingRow = {
      id: string;
      member_id: string;
      coach_id: string;
      status: string;
      scheduled_at: string;
      duration_minutes: number;
      livekit_room_name: string | null;
      coach: { id: string; member_id: string; display_name: string } | Array<{ id: string; member_id: string; display_name: string }>;
    };
    const { data: bookingRaw, error } = await supabase
      .from("coaching_booking")
      .select(
        `id, member_id, coach_id, status, scheduled_at, duration_minutes,
         livekit_room_name,
         coach:coach_profile(id, member_id, display_name)`
      )
      .eq("id", bookingId)
      .single();
    const booking = bookingRaw as BookingRow | null;

    if (error || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Determine if the requester is the member or the coach
    const isMember = booking.member_id === member.id;
    const coachProfile = Array.isArray(booking.coach) ? booking.coach[0] : booking.coach;
    const isCoach = coachProfile?.member_id === member.id;

    if (!isMember && !isCoach) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Check booking status
    if (booking.status !== "confirmed") {
      return NextResponse.json(
        { error: "This session is not available to join" },
        { status: 400 }
      );
    }

    // Check time window: 30 min before → 2h after scheduled start
    const sessionStart = new Date(booking.scheduled_at).getTime();
    const joinWindowStart = sessionStart - 30 * 60 * 1000;
    const joinWindowEnd = sessionStart + (booking.duration_minutes + 120) * 60 * 1000;
    const now = Date.now();

    if (now < joinWindowStart) {
      const minutesUntil = Math.ceil((joinWindowStart - now) / 60000);
      return NextResponse.json(
        { error: `Session opens ${minutesUntil} minutes before start time` },
        { status: 400 }
      );
    }

    if (now > joinWindowEnd) {
      return NextResponse.json(
        { error: "This session has ended" },
        { status: 400 }
      );
    }

    // Ensure Livekit room exists (create if not yet provisioned)
    const roomName = booking.livekit_room_name ?? coachingRoomName(bookingId);
    if (!booking.livekit_room_name) {
      try {
        await createCoachingRoom({ roomName });
        await supabase
          .from("coaching_booking")
          .update({ livekit_room_name: roomName, livekit_room_created_at: new Date().toISOString() })
          .eq("id", bookingId);
      } catch (err) {
        console.error("[session/token] Livekit room creation error:", err);
        return NextResponse.json(
          { error: "Could not create video room — please try again" },
          { status: 500 }
        );
      }
    }

    // Generate token
    const role = isCoach ? "host" : "guest";
    const participantName = isCoach
      ? coachProfile?.display_name ?? "Coach"
      : member.email ?? "Member";

    const token = await generateJoinToken({
      roomName,
      participantIdentity: `${role}-${member.id}`,
      participantName,
      role,
      metadata: JSON.stringify({ bookingId, role }),
    });

    return NextResponse.json({ token, roomName, role });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.includes("not authenticated") || message.includes("requireMember")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[session/token]", err);
    return NextResponse.json({ error: "Failed to generate session token" }, { status: 500 });
  }
}
