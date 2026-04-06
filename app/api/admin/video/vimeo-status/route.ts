import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";

/**
 * GET /api/admin/video/vimeo-status?videoId=123456789
 *
 * Checks Vimeo transcoding status for a video.
 * Returns: { status: "available" | "transcode_starting" | "transcoding" | "error", thumbnailUrl?: string }
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const videoId = req.nextUrl.searchParams.get("videoId");
  if (!videoId) {
    return NextResponse.json({ error: "videoId required" }, { status: 400 });
  }

  const token = process.env.VIMEO_ACCESS_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "VIMEO_ACCESS_TOKEN not configured" }, { status: 500 });
  }

  const res = await fetch(`https://api.vimeo.com/videos/${videoId}?fields=transcode.status,pictures`, {
    headers: {
      Authorization: `bearer ${token}`,
      Accept: "application/vnd.vimeo.*+json;version=3.4",
    },
  });

  if (!res.ok) {
    return NextResponse.json({ status: "error" }, { status: res.status });
  }

  const data = await res.json();
  const transcodeStatus: string = data.transcode?.status ?? "unknown";

  // Vimeo statuses: transcode_starting, transcoding, available, error
  const thumbnailUrl: string | undefined =
    transcodeStatus === "available"
      ? data.pictures?.sizes?.find((s: { width: number; link: string }) => s.width >= 640)?.link
      : undefined;

  return NextResponse.json({ status: transcodeStatus, thumbnailUrl });
}
