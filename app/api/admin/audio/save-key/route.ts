/**
 * POST /api/admin/audio/save-key
 * Saves the S3 key to the content row after a successful upload.
 * Body: { contentId: string, s3Key: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/auth/require-admin";
import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  await requireAdminPermission("members.update_profile");

  const { contentId, s3Key } = await request.json().catch(() => ({})) as {
    contentId?: string;
    s3Key?: string | null;
  };

  if (!contentId) {
    return NextResponse.json({ error: "contentId is required" }, { status: 400 });
  }

  const supabase = asLooseSupabaseClient(getAdminClient());
  const { error } = await supabase
    .from("content")
    .update({ s3_audio_key: s3Key ?? null })
    .eq("id", contentId);

  if (error) {
    console.error("[audio/save-key]", error.message);
    return NextResponse.json({ error: "Failed to save audio key" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
