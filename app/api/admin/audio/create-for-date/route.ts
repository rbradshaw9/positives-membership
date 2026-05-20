/**
 * POST /api/admin/audio/create-for-date
 *
 * Called after a successful S3 upload. Creates a content row for the next
 * open day in the month and assigns the audio to it.
 *
 * Body: { monthId, monthYear, title, s3Key, durationSeconds? }
 * Returns: { contentId, publishDate, title }
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/auth/require-admin";
import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";

export const runtime = "nodejs";

type ExistingRow = { publish_date: string };

/** All calendar dates for a given YYYY-MM month */
function datesInMonth(monthYear: string): string[] {
  const [year, month] = monthYear.split("-").map(Number);
  const days = new Date(year, month, 0).getDate(); // last day of month
  return Array.from({ length: days }, (_, i) => {
    const d = i + 1;
    return `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  });
}

export async function POST(request: NextRequest) {
  await requireAdminPermission("members.update_profile");

  const { monthId, monthYear, title, s3Key, durationSeconds } =
    await request.json().catch(() => ({})) as {
      monthId?: string;
      monthYear?: string;
      title?: string;
      s3Key?: string;
      durationSeconds?: number | null;
    };

  if (!monthId || !monthYear || !title || !s3Key) {
    return NextResponse.json(
      { error: "monthId, monthYear, title, and s3Key are required" },
      { status: 400 }
    );
  }

  const supabase = asLooseSupabaseClient(getAdminClient());

  // Find all dates already occupied in this month
  const { data: existing } = await supabase
    .from("content")
    .select<ExistingRow[]>("publish_date")
    .eq("monthly_practice_id", monthId)
    .eq("type", "daily_audio")
    .not("publish_date", "is", null);

  const occupied = new Set((existing ?? []).map((r) => r.publish_date));

  // Find the first open date
  const allDates = datesInMonth(monthYear);
  const nextDate = allDates.find((d) => !occupied.has(d));

  if (!nextDate) {
    return NextResponse.json(
      { error: "All days in this month are already filled." },
      { status: 409 }
    );
  }

  // Create the content row assigned to that date
  const { data: row, error } = await supabase
    .from("content")
    .insert({
      type: "daily_audio",
      title,
      publish_date: nextDate,
      month_year: monthYear,
      monthly_practice_id: monthId,
      s3_audio_key: s3Key,
      duration_seconds: durationSeconds ?? null,
      status: "draft",
      is_active: false,
      source: "admin",
    })
    .select<{ id: string }>("id")
    .single();

  if (error || !row) {
    console.error("[audio/create-for-date]", error?.message);
    return NextResponse.json({ error: "Failed to create content" }, { status: 500 });
  }

  return NextResponse.json({
    contentId: row.id,
    publishDate: nextDate,
    title,
  });
}
