import { NextRequest, NextResponse } from "next/server";
import { getAdminApiAuth } from "@/lib/auth/admin-api";
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

    const room = event.event_livekit_room;
    return NextResponse.json({
      eventId: event.id,
      roomName: room.room_name,
      roomStatus: room.room_status,
      recordingPolicy: room.recording_policy,
      egressId: room.egress_id,
      egressStatus: room.egress_status,
      replayAttached: Boolean(event.replay_asset_id || room.replay_asset_id),
      replayAssetId: event.replay_asset_id ?? room.replay_asset_id ?? null,
      lastError: room.last_error,
      roomStartedAt: room.room_started_at,
      roomFinishedAt: room.room_finished_at,
      egressStartedAt: room.egress_started_at,
      egressEndedAt: room.egress_ended_at,
    });
  } catch (error) {
    console.error("[admin/event/livekit-status]", error);
    return NextResponse.json({ error: "Could not load LiveKit status" }, { status: 500 });
  }
}
