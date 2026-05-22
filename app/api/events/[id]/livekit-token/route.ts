import { NextRequest, NextResponse } from "next/server";
import { requireActiveMember } from "@/lib/auth/require-active-member";
import { generateLiveKitEventToken, liveKitPublicUrl } from "@/lib/livekit/events";
import { getMemberEvent } from "@/lib/queries/get-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const member = await requireActiveMember();
    const { id } = await params;
    const event = await getMemberEvent(id, member.subscription_tier, member.id);
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
    if (event.virtual_mode !== "livekit" || !event.event_livekit_room?.room_name) {
      return NextResponse.json({ error: "LiveKit is not enabled for this event" }, { status: 400 });
    }
    if (!event.member_ticket_access) {
      return NextResponse.json({ error: "Event access required" }, { status: 403 });
    }

    const now = Date.now();
    const startsAt = new Date(event.starts_at).getTime();
    const endsAt = new Date(event.ends_at).getTime();
    if (now < startsAt - 60 * 60 * 1000 || now > endsAt + 30 * 60 * 1000) {
      return NextResponse.json({ error: "The live room is not open right now" }, { status: 400 });
    }

    const serverUrl = liveKitPublicUrl();
    if (!serverUrl) return NextResponse.json({ error: "LiveKit is not configured" }, { status: 503 });

    const token = await generateLiveKitEventToken({
      roomName: event.event_livekit_room.room_name,
      identity: `audience-${member.id}`,
      name: member.name ?? member.email ?? "Member",
      role: "audience",
      eventId: event.id,
    });

    return NextResponse.json({
      token,
      serverUrl,
      roomName: event.event_livekit_room.room_name,
      role: "audience",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("NEXT_REDIRECT")) throw error;
    console.error("[event/livekit-token]", error);
    return NextResponse.json({ error: "Could not create LiveKit token" }, { status: 500 });
  }
}
