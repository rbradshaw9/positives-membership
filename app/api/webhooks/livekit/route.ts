import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";
import {
  liveKitReplayObjectKey,
  liveKitWebhookReceiver,
  startLiveKitEventRecording,
} from "@/lib/livekit/events";
import { getS3MediaConfig } from "@/lib/media/s3";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function payloadValue(value: unknown) {
  return JSON.parse(JSON.stringify(value ?? {})) as Record<string, unknown>;
}

function liveKitWebhookId(payload: Record<string, unknown>) {
  const eventName = String(payload.event ?? "unknown");
  const room = payload.room as Record<string, unknown> | undefined;
  const participant = payload.participant as Record<string, unknown> | undefined;
  const egressInfo = payload.egressInfo as Record<string, unknown> | undefined;
  const roomComposite = egressInfo?.roomComposite as Record<string, unknown> | undefined;
  return [
    payload.id,
    eventName,
    room?.sid ?? room?.name ?? egressInfo?.roomName ?? roomComposite?.roomName,
    participant?.sid ?? participant?.identity,
    egressInfo?.egressId,
    payload.createdAt,
  ]
    .filter(Boolean)
    .join(":");
}

function egressStatus(value: unknown) {
  const normalized = String(value ?? "").toLowerCase();
  if (normalized.includes("complete")) return "complete";
  if (normalized.includes("active")) return "active";
  if (normalized.includes("starting")) return "starting";
  if (normalized.includes("failed")) return "failed";
  if (normalized.includes("aborted")) return "aborted";
  if (normalized.includes("limit")) return "limit_reached";
  return "active";
}

function liveKitEventIdFromRoom(room: Record<string, unknown> | undefined) {
  const metadata = typeof room?.metadata === "string" ? room.metadata : null;
  if (!metadata) return null;

  try {
    const parsed = JSON.parse(metadata) as { eventId?: unknown };
    return typeof parsed.eventId === "string" ? parsed.eventId : null;
  } catch {
    return null;
  }
}

async function createReplayAsset(params: {
  eventId: string;
  eventTitle: string;
  objectKey?: string;
}) {
  const supabase = asLooseSupabaseClient(getAdminClient());
  const { bucket } = getS3MediaConfig();
  const objectKey = params.objectKey ?? liveKitReplayObjectKey(params.eventId);
  const { data, error } = await supabase
    .from("media_asset")
    .upsert(
      {
        bucket,
        object_key: objectKey,
        kind: "video",
        usage_context: "event",
        title: `${params.eventTitle} replay`,
        original_filename: "recording.mp4",
        content_type: "video/mp4",
        size_bytes: 0,
        status: "active",
        visibility: "member",
        metadata: {
          source: "livekit_egress",
          event_id: params.eventId,
        },
      },
      { onConflict: "object_key" }
    )
    .select<{ id: string }>("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Replay asset upsert failed.");
  await supabase.from("member_event").update({ replay_asset_id: data.id }).eq("id", params.eventId);
  await supabase
    .from("event_livekit_room")
    .update({ replay_asset_id: data.id, egress_status: "complete", egress_ended_at: new Date().toISOString() })
    .eq("event_id", params.eventId);
  return data.id;
}

export async function POST(request: Request) {
  const body = await request.text();
  const authHeader = request.headers.get("authorization") ?? request.headers.get("Authorize") ?? undefined;

  try {
    const webhook = await liveKitWebhookReceiver().receive(body, authHeader);
    const payload = payloadValue(webhook);
    const eventName = String(webhook.event || payload.event || "unknown");
    const room = payload.room as Record<string, unknown> | undefined;
    const participant = payload.participant as Record<string, unknown> | undefined;
    const egressInfo = payload.egressInfo as Record<string, unknown> | undefined;
    const roomComposite = egressInfo?.roomComposite as Record<string, unknown> | undefined;
    const roomName =
      (typeof room?.name === "string" ? room.name : null) ??
      (typeof egressInfo?.roomName === "string" ? egressInfo.roomName : null) ??
      (typeof roomComposite?.roomName === "string" ? roomComposite.roomName : null);
    const egressId = typeof egressInfo?.egressId === "string" ? egressInfo.egressId : null;
    const dedupeId = liveKitWebhookId(payload) || `${eventName}:${roomName ?? "no-room"}:${Date.now()}`;

    const supabase = asLooseSupabaseClient(getAdminClient());
    const { error: insertError } = await supabase.from("livekit_webhook_event").insert({
      livekit_event_id: dedupeId,
      event_name: eventName,
      room_name: roomName,
      participant_identity: typeof participant?.identity === "string" ? participant.identity : null,
      egress_id: egressId,
      payload,
    });

    if (insertError?.code === "23505") {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    if (insertError) throw new Error(insertError.message);

    if (!roomName) return NextResponse.json({ ok: true });

    let { data: livekitRoom } = await supabase
      .from("event_livekit_room")
      .select<{ event_id: string; room_name: string; recording_policy: string; egress_id: string | null; member_event?: { title: string } | null }>(
        "event_id, room_name, recording_policy, egress_id, member_event:event_id(title)"
      )
      .eq("room_name", roomName)
      .maybeSingle();

    if (!livekitRoom && eventName === "room_started") {
      const eventId = liveKitEventIdFromRoom(room);
      if (eventId) {
        const { data: memberEvent } = await supabase
          .from("member_event")
          .select<{ id: string; title: string }>("id, title")
          .eq("id", eventId)
          .maybeSingle();

        if (memberEvent) {
          await supabase.from("event_livekit_room").upsert(
            {
              event_id: memberEvent.id,
              room_name: roomName,
              mode: "webinar",
              recording_policy: "auto",
              room_status: "provisioned",
              egress_status: "pending",
              last_error: null,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "event_id" }
          );
          livekitRoom = {
            event_id: memberEvent.id,
            room_name: roomName,
            recording_policy: "auto",
            egress_id: null,
            member_event: { title: memberEvent.title },
          };
        }
      }
    }

    if (!livekitRoom) return NextResponse.json({ ok: true, ignored: true });

    if (eventName === "room_started") {
      await supabase
        .from("event_livekit_room")
        .update({ room_status: "started", room_started_at: new Date().toISOString(), last_error: null })
        .eq("event_id", livekitRoom.event_id);

      if (livekitRoom.recording_policy === "auto" && !livekitRoom.egress_id) {
        try {
          const egress = await startLiveKitEventRecording({
            eventId: livekitRoom.event_id,
            roomName,
          });
          await supabase
            .from("event_livekit_room")
            .update({
              egress_id: egress.egressId,
              egress_status: "starting",
              egress_started_at: new Date().toISOString(),
              last_error: null,
            })
            .eq("event_id", livekitRoom.event_id);
        } catch (error) {
          await supabase
            .from("event_livekit_room")
            .update({
              egress_status: "failed",
              last_error: error instanceof Error ? error.message : String(error),
            })
            .eq("event_id", livekitRoom.event_id);
        }
      }
    }

    if (eventName === "room_finished") {
      await supabase
        .from("event_livekit_room")
        .update({ room_status: "finished", room_finished_at: new Date().toISOString() })
        .eq("event_id", livekitRoom.event_id);
    }

    if (eventName === "egress_started" || eventName === "egress_updated") {
      await supabase
        .from("event_livekit_room")
        .update({
          egress_id: egressId,
          egress_status: egressStatus(egressInfo?.status),
          egress_started_at: new Date().toISOString(),
        })
        .eq("event_id", livekitRoom.event_id);
    }

    if (eventName === "egress_ended") {
      if (egressStatus(egressInfo?.status) === "complete") {
        const eventTitle = Array.isArray(livekitRoom.member_event)
          ? livekitRoom.member_event[0]?.title
          : livekitRoom.member_event?.title;
        const file = egressInfo?.file as Record<string, unknown> | undefined;
        const objectKey = typeof file?.filename === "string" ? file.filename : undefined;
        await createReplayAsset({
          eventId: livekitRoom.event_id,
          eventTitle: eventTitle ?? "Event",
          objectKey,
        });
      } else {
        await supabase
          .from("event_livekit_room")
          .update({
            egress_id: egressId,
            egress_status: egressStatus(egressInfo?.status),
            egress_ended_at: new Date().toISOString(),
            last_error: typeof egressInfo?.error === "string" ? egressInfo.error : null,
          })
          .eq("event_id", livekitRoom.event_id);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[webhooks/livekit]", error);
    return NextResponse.json({ error: "Webhook could not be processed" }, { status: 400 });
  }
}
