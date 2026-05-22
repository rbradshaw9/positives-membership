import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { generateLiveKitEventToken, liveKitPublicUrl } from "@/lib/livekit/events";
import { getAdminEvent } from "@/lib/queries/get-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const event = await getAdminEvent(id);
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
    if (event.virtual_mode !== "livekit" || !event.event_livekit_room?.room_name) {
      return NextResponse.json({ error: "LiveKit is not enabled for this event" }, { status: 400 });
    }

    const serverUrl = liveKitPublicUrl();
    if (!serverUrl) return NextResponse.json({ error: "LiveKit is not configured" }, { status: 503 });

    const token = await generateLiveKitEventToken({
      roomName: event.event_livekit_room.room_name,
      identity: `host-${admin.id}`,
      name: admin.email ?? "Host",
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
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("NEXT_REDIRECT")) throw error;
    console.error("[admin/event/livekit-token]", error);
    return NextResponse.json({ error: "Could not create LiveKit token" }, { status: 500 });
  }
}
