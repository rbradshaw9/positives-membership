import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient as createAdminClient } from "@supabase/supabase-js";

/**
 * POST /api/admin/content/save-video
 *
 * Saves (or clears) a Vimeo video ID on a content row.
 *
 * Body: { contentId: string, vimeoVideoId: string | null }
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { contentId, vimeoVideoId } = await req.json();

  if (!contentId) {
    return NextResponse.json({ error: "contentId required" }, { status: 400 });
  }

  const supabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { error } = await supabase
    .from("content")
    .update({ vimeo_video_id: vimeoVideoId ?? null })
    .eq("id", contentId);

  if (error) {
    console.error("[save-video] DB error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
