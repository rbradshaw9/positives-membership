import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import Mux from "@mux/mux-node";

/**
 * GET /api/admin/video/status?uploadId=xxx
 *
 * Polls Mux upload → asset status.
 *
 * Returns:
 *   { status: "waiting" | "asset_created" | "ready" | "errored",
 *     assetId?: string,
 *     playbackId?: string }
 */

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
});

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const uploadId = req.nextUrl.searchParams.get("uploadId");
  if (!uploadId) {
    return NextResponse.json({ error: "uploadId required" }, { status: 400 });
  }

  const upload = await mux.video.uploads.retrieve(uploadId);

  if (upload.status === "errored") {
    return NextResponse.json({ status: "errored" });
  }

  if (!upload.asset_id) {
    // Still uploading or asset not created yet
    return NextResponse.json({ status: "waiting" });
  }

  // Asset created — check processing status
  const asset = await mux.video.assets.retrieve(upload.asset_id);

  if (asset.status === "errored") {
    return NextResponse.json({ status: "errored" });
  }

  if (asset.status !== "ready") {
    return NextResponse.json({
      status: "asset_created",
      assetId: asset.id,
    });
  }

  // Ready — extract public playback ID
  const playbackId = asset.playback_ids?.find(
    (p: { id: string; policy: string }) => p.policy === "public"
  )?.id;

  return NextResponse.json({
    status:     "ready",
    assetId:    asset.id,
    playbackId: playbackId ?? null,
  });
}
