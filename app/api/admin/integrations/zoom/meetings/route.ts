import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { zoomApi } from "@/lib/zoom/client";
import { getAuthorizedZoomConnection } from "@/lib/zoom/authorization";

type ZoomListResponse = {
  meetings?: Array<{ id: number | string; topic: string; start_time?: string; join_url?: string }>;
  webinars?: Array<{ id: number | string; topic: string; start_time?: string; join_url?: string }>;
};

export async function GET(request: Request) {
  const user = await requireAdmin();
  const url = new URL(request.url);
  const connectionId = url.searchParams.get("connectionId");
  const type = url.searchParams.get("type") === "webinar" ? "webinar" : "meeting";

  if (!connectionId) {
    return NextResponse.json({ items: [] });
  }

  const connection = await getAuthorizedZoomConnection(connectionId, user);
  if (!connection) {
    return NextResponse.json({ items: [], error: "zoom_connection_forbidden" }, { status: 403 });
  }

  try {
    const path = type === "webinar" ? "/users/me/webinars?page_size=30" : "/users/me/meetings?page_size=30&type=scheduled";
    const data = await zoomApi<ZoomListResponse>(connectionId, path);
    const source = type === "webinar" ? data.webinars ?? [] : data.meetings ?? [];
    return NextResponse.json({
      items: source.map((item) => ({
        id: String(item.id),
        topic: item.topic,
        start_time: item.start_time ?? null,
        join_url: item.join_url ?? null,
      })),
    });
  } catch (error) {
    console.error("[zoom/meetings]", error);
    return NextResponse.json({ items: [], error: "zoom_lookup_failed" }, { status: 500 });
  }
}
