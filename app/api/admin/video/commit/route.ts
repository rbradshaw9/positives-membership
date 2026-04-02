import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import Mux from "@mux/mux-node";

/**
 * POST /api/admin/video/commit
 *
 * Atomically:
 *   1. Updates content row with new mux_asset_id + mux_playback_id
 *   2. Deletes the old Mux asset (if any) to avoid orphaned billing
 *
 * Body: { contentId: string, assetId: string, playbackId: string }
 */

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
});

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { contentId, assetId, playbackId } = await req.json();
  if (!contentId || !assetId || !playbackId) {
    return NextResponse.json({ error: "contentId, assetId, playbackId required" }, { status: 400 });
  }

  const supabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  // Fetch current asset ID so we can delete it after the swap
  const { data: row } = await supabase
    .from("content")
    .select("mux_asset_id")
    .eq("id", contentId)
    .single();

  const oldAssetId = row?.mux_asset_id ?? null;

  // Atomic DB update
  const { error } = await supabase
    .from("content")
    .update({
      mux_asset_id:    assetId,
      mux_playback_id: playbackId,
      // Clear legacy Vimeo fields when a Mux asset is committed
      vimeo_video_id:  null,
    })
    .eq("id", contentId);

  if (error) {
    console.error("[video/commit] DB update error:", error.message);
    return NextResponse.json({ error: "DB update failed" }, { status: 500 });
  }

  // Delete old Mux asset (fire-and-forget — don't block response)
  if (oldAssetId && oldAssetId !== assetId) {
    mux.video.assets.delete(oldAssetId).catch((err: unknown) => {
      console.error("[video/commit] Failed to delete old asset:", oldAssetId, err);
    });
  }

  return NextResponse.json({ ok: true });
}
