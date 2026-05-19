/**
 * app/api/coaching/session/[id]/complete/route.ts
 *
 * POST /api/coaching/session/[id]/complete
 *
 * Marks a coaching session as completed.
 * Callable by the coach (saves coach_notes) or the member (saves member_reflection).
 * Sets preferred coach if member has none yet.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireMember } from "@/lib/auth/require-member";
import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";

type CompleteRequest = {
  coachNotes?: string;       // coach only
  memberReflection?: string; // member only
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await params;
    const member = await requireMember();
    const { coachNotes, memberReflection } = (await req.json()) as CompleteRequest;

    const supabase = asLooseSupabaseClient(getAdminClient());

    // Load booking
    type BookingRow = {
      id: string;
      member_id: string;
      coach_id: string;
      status: string;
      scheduled_at: string;
      coach: { id: string; member_id: string | null } | null;
    };

    const { data: bookingRaw } = await supabase
      .from("coaching_booking")
      .select("id, member_id, coach_id, status, scheduled_at, coach:coach_profile(id, member_id)")
      .eq("id", bookingId)
      .single();

    const booking = bookingRaw as BookingRow | null;
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const coachProfile = Array.isArray(booking.coach) ? booking.coach[0] : booking.coach;
    const isMember = booking.member_id === member.id;
    const isCoach = coachProfile?.member_id === member.id;

    if (!isMember && !isCoach) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (!["confirmed", "completed"].includes(booking.status)) {
      return NextResponse.json(
        { error: "Only confirmed or already-completed sessions can be updated" },
        { status: 400 }
      );
    }

    // Build update payload
    const updatePayload: Record<string, unknown> = {
      status: "completed",
      updated_at: new Date().toISOString(),
    };

    if (isCoach && coachNotes !== undefined) {
      updatePayload.coach_notes = coachNotes.trim() || null;
    }
    if (isMember && memberReflection !== undefined) {
      updatePayload.member_reflection = memberReflection.trim() || null;
    }

    const { error: updateErr } = await supabase
      .from("coaching_booking")
      .update(updatePayload)
      .eq("id", bookingId);

    if (updateErr) {
      console.error("[session/complete] update error:", updateErr);
      return NextResponse.json({ error: "Failed to complete session" }, { status: 500 });
    }

    // Set preferred coach if member has none yet
    if (isMember && coachProfile) {
      const { data: coachingProfile } = await supabase
        .from("member_coaching_profile")
        .select("id, preferred_coach_id")
        .eq("member_id", member.id)
        .single();

      const cp = coachingProfile as { id: string; preferred_coach_id: string | null } | null;

      if (!cp) {
        // Create profile with preferred coach
        await supabase.from("member_coaching_profile").insert({
          member_id: member.id,
          preferred_coach_id: booking.coach_id,
          preferred_coach_set_at: new Date().toISOString(),
          preferred_coach_set_by: "system",
        });
      } else if (!cp.preferred_coach_id) {
        // Update existing profile to add preferred coach
        await supabase
          .from("member_coaching_profile")
          .update({
            preferred_coach_id: booking.coach_id,
            preferred_coach_set_at: new Date().toISOString(),
            preferred_coach_set_by: "system",
          })
          .eq("id", cp.id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.includes("not authenticated") || message.includes("requireMember")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[session/complete]", err);
    return NextResponse.json({ error: "Failed to complete session" }, { status: 500 });
  }
}
