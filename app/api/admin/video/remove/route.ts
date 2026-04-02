import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import Mux from "@mux/mux-node";

/**
 * POST /api/admin/video/remove
 *
 * Strips video from a content record:
 *   1. Nulls mux_asset_id + mux_playback_id in Supabase
 *   2. Deletes the Mux asset
 *
 * Body: { contentId: string }
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

  const { contentId } = await req.json();
  if (!contentId) {
    return NextResponse.json({ error: "contentId required" }, { status: 400 });
  }

  const supabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: row } = await supabase
    .from("content")
    .select("mux_asset_id")
    .eq("id", contentId)
    .single();

  const oldAssetId = row?.mux_asset_id ?? null;

  const { error } = await supabase
    .from("content")
    .update({
      mux_asset_id:    null,
      mux_playback_id: null,
    })
    .eq("id", contentId);

  if (error) {
    console.error("[video/remove] DB update error:", error.message);
    return NextResponse.json({ error: "DB update failed" }, { status: 500 });
  }

  if (oldAssetId) {
    mux.video.assets.delete(oldAssetId).catch((err: unknown) => {
      console.error("[video/remove] Failed to delete Mux asset:", oldAssetId, err);
    });
  }

  return NextResponse.json({ ok: true });
}
