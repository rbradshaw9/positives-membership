import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";

/**
 * POST /api/admin/video/vimeo-upload
 *
 * Creates a Vimeo TUS upload ticket. Called by VideoUploadPanel
 * before the client starts uploading a file.
 *
 * Body: { name: string, size: number, contentId?: string, description?: string }
 * Returns: { uploadLink: string, videoUri: string, videoId: string }
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, size, description } = await req.json();

  if (!name || !size) {
    return NextResponse.json({ error: "name and size are required" }, { status: 400 });
  }

  const token = process.env.VIMEO_ACCESS_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "VIMEO_ACCESS_TOKEN not configured" }, { status: 500 });
  }

  const res = await fetch("https://api.vimeo.com/me/videos", {
    method: "POST",
    headers: {
      Authorization: `bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/vnd.vimeo.*+json;version=3.4",
    },
    body: JSON.stringify({
      upload: {
        approach: "tus",
        size,
      },
      name,
      description: description ?? "",
      privacy: { view: "anybody", embed: "whitelist" },
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    console.error("[vimeo-upload] Vimeo API error:", body);
    return NextResponse.json(
      { error: body?.developer_message ?? "Failed to create Vimeo upload" },
      { status: res.status }
    );
  }

  const data = await res.json();
  const uploadLink: string = data.upload?.upload_link;
  const videoUri: string = data.uri; // e.g. /videos/123456789
  const videoId: string = videoUri.replace("/videos/", "");

  return NextResponse.json({ uploadLink, videoUri, videoId });
}
