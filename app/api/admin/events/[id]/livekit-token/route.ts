import { NextRequest, NextResponse } from "next/server";
import { getAdminApiAuth } from "@/lib/auth/admin-api";
import { generateLiveKitEventToken, liveKitPublicUrl } from "@/lib/livekit/events";
import { verifyLiveKitStudioToken } from "@/lib/livekit/studio-auth";
import { getAdminEvent } from "@/lib/queries/get-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await getAdminApiAuth();
    const studioToken = verifyLiveKitStudioToken(
      req.headers.get("x-livekit-studio-token"),
      id
    );
    if (!auth.ok && !studioToken) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const event = await getAdminEvent(id);
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
    if (event.virtual_mode !== "livekit" || !event.event_livekit_room?.room_name) {
      return NextResponse.json({ error: "LiveKit is not enabled for this event" }, { status: 400 });
    }

    const serverUrl = liveKitPublicUrl();
    if (!serverUrl) return NextResponse.json({ error: "LiveKit is not configured" }, { status: 503 });

    const hostUserId = auth.ok ? auth.user.id : studioToken?.userId;
    if (!hostUserId) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const token = await generateLiveKitEventToken({
      roomName: event.event_livekit_room.room_name,
      identity: `host-${hostUserId}`,
      name: auth.ok ? auth.user.email ?? "Host" : "Host",
      role: "host",
      eventId: event.id,
    });

    return NextResponse.json({
      token,
      serverUrl,
      roomName: event.event_livekit_room.room_name,
      role: "host",
    });
  } catch (error) {
    console.error("[admin/event/livekit-token]", error);
    return NextResponse.json({ error: "Could not create LiveKit token" }, { status: 500 });
  }
}
