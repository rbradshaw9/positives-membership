/**
 * app/api/admin/coaching/booking/[id]/status/route.ts
 *
 * POST /api/admin/coaching/booking/[id]/status
 *
 * Admin-only: update a booking's status (complete, noshow, cancel).
 * Body: { status: 'completed' | 'noshow' | 'canceled', adminNote?: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";

const ALLOWED_STATUSES = ["completed", "noshow", "canceled"] as const;
type AllowedStatus = (typeof ALLOWED_STATUSES)[number];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id: bookingId } = await params;
    const { status, adminNote } = (await req.json()) as {
      status: AllowedStatus;
      adminNote?: string;
    };

    if (!ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const supabase = asLooseSupabaseClient(getAdminClient());

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

    return NextResponse.json({ success: true, status });
  } catch (err) {
    console.error("[admin/coaching/status]", err);
    return NextResponse.json({ error: "Unauthorized or failed" }, { status: 401 });
  }
}
