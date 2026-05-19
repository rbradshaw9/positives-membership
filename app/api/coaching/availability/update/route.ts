/**
 * app/api/coaching/availability/update/route.ts
 *
 * POST /api/coaching/availability/update
 *
 * Replaces all availability windows for a coach.
 * Only callable by the member who owns that coach_profile.
 *
 * Body: { coachId: string, windows: Window[] }
 * Returns: { windows: Window[] }
 */

import { NextRequest, NextResponse } from "next/server";
import { requireMember } from "@/lib/auth/require-member";
import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";

type WindowInput = {
  id: string | null;
  day_of_week: number;
  start_minutes: number;
  end_minutes: number;
  timezone: string;
  is_active: boolean;
};

export async function POST(req: NextRequest) {
  try {
    const member = await requireMember();
    const { coachId, windows, blockedDates } = (await req.json()) as {
      coachId: string;
      windows: WindowInput[];
      blockedDates?: string[];
    };

    if (!coachId || !Array.isArray(windows)) {
      return NextResponse.json({ error: "coachId and windows are required" }, { status: 400 });
    }

    const supabase = asLooseSupabaseClient(getAdminClient());

    // Verify coach ownership
    type CoachRow = { id: string; member_id: string };
    const { data: coachRaw } = await supabase
      .from("coach_profile")
      .select("id, member_id")
      .eq("id", coachId)
      .single();
    const coach = coachRaw as CoachRow | null;

    if (!coach || coach.member_id !== member.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Validate windows
    for (const w of windows) {
      if (w.day_of_week < 0 || w.day_of_week > 6) {
        return NextResponse.json({ error: "Invalid day_of_week" }, { status: 400 });
      }
      if (w.start_minutes >= w.end_minutes) {
        return NextResponse.json({ error: "start_minutes must be less than end_minutes" }, { status: 400 });
      }
      if (w.start_minutes < 0 || w.end_minutes > 1440) {
        return NextResponse.json({ error: "Minutes must be between 0 and 1440" }, { status: 400 });
      }
    }

    // Strategy: delete all existing, re-insert.
    // This keeps the logic simple and avoids complex upsert diffing.
    const { error: deleteError } = await supabase
      .from("coach_availability")
      .delete()
      .eq("coach_id", coachId);

    if (deleteError) {
      console.error("[availability/update] delete error:", deleteError);
      return NextResponse.json({ error: "Failed to update availability" }, { status: 500 });
    }

    if (windows.filter((w) => w.is_active).length === 0) {
      // No active windows — just cleared everything
      return NextResponse.json({ windows: [] });
    }

    const inserts = windows
      .filter((w) => w.is_active)
      .map((w) => ({
        coach_id: coachId,
        day_of_week: w.day_of_week,
        start_minutes: w.start_minutes,
        end_minutes: w.end_minutes,
        timezone: w.timezone || "America/New_York",
        is_active: true,
      }));

    const { data: insertedRaw, error: insertError } = await supabase
      .from("coach_availability")
      .insert(inserts)
      .select("id, day_of_week, start_minutes, end_minutes, timezone, is_active");

    if (insertError) {
      console.error("[availability/update] insert error:", insertError);
      return NextResponse.json({ error: "Failed to save availability windows" }, { status: 500 });
    }

    type AvWindow = {
      id: string;
      day_of_week: number;
      start_minutes: number;
      end_minutes: number;
      timezone: string;
      is_active: boolean;
    };
    const inserted = (insertedRaw as AvWindow[] | null) ?? [];

    // Persist blackout dates to coach_profile.blocked_dates
    if (blockedDates !== undefined) {
      await supabase
        .from("coach_profile")
        .update({ blocked_dates: blockedDates.length > 0 ? blockedDates : null })
        .eq("id", coachId);
    }

    return NextResponse.json({ windows: inserted });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.includes("not authenticated") || message.includes("requireMember")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[availability/update]", err);
    return NextResponse.json({ error: "Failed to update availability" }, { status: 500 });
  }
}
