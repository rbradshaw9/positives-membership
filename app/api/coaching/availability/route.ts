/**
 * app/api/coaching/availability/route.ts
 *
 * GET /api/coaching/availability?days=14&timezone=America/New_York
 *
 * Returns available coaching slots grouped by date.
 * Requires authentication (member only).
 */

import { NextRequest, NextResponse } from "next/server";
import { requireMember } from "@/lib/auth/require-member";
import { getAvailableSlots } from "@/lib/coaching/availability";

export async function GET(req: NextRequest) {
  try {
    const member = await requireMember();

    const { searchParams } = new URL(req.url);
    const days = Math.min(Number(searchParams.get("days") ?? "14"), 60);
    const timezone = searchParams.get("timezone") ?? "America/New_York";
    const excludeBookingId = searchParams.get("excludeBookingId") ?? undefined;

    const slots = await getAvailableSlots({
      daysAhead: days,
      memberId: member.id,
      timezone,
      excludeBookingId,
    });

    return NextResponse.json({ slots });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.includes("not authenticated") || message.includes("requireMember")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[coaching/availability]", err);
    return NextResponse.json({ error: "Failed to load availability" }, { status: 500 });
  }
}
