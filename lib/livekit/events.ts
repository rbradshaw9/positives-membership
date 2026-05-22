import {
  AccessToken,
  EgressClient,
  EncodedFileOutput,
  EncodedFileType,
  RoomServiceClient,
  S3Upload,
  WebhookReceiver,
} from "livekit-server-sdk";
import { getS3MediaConfig, mediaObjectKey } from "@/lib/media/s3";

type LiveKitConfig = {
  wsUrl: string;
  httpUrl: string;
  apiKey: string;
  apiSecret: string;
};

export type LiveKitEventRole = "host" | "audience";

function getConfig(): LiveKitConfig {
  const wsUrl = process.env.LIVEKIT_URL;
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!wsUrl || !apiKey || !apiSecret) {
    throw new Error("LiveKit is not configured.");
  }
  return {
    wsUrl,
    httpUrl: wsUrl.replace(/^wss:/, "https:").replace(/^ws:/, "http:"),
    apiKey,
    apiSecret,
  };
}

export function liveKitEventRoomName(eventId: string) {
  return `event-${eventId}`;
}

export function liveKitPublicUrl() {
  return process.env.NEXT_PUBLIC_LIVEKIT_URL ?? process.env.LIVEKIT_URL ?? null;
}

export function liveKitEventsConfigured() {
  return Boolean(
    process.env.LIVEKIT_URL &&
      process.env.LIVEKIT_API_KEY &&
      process.env.LIVEKIT_API_SECRET &&
      process.env.NEXT_PUBLIC_LIVEKIT_URL
  );
}

export function roomClient() {
  const config = getConfig();
  return new RoomServiceClient(config.httpUrl, config.apiKey, config.apiSecret);
}

export function egressClient() {
  const config = getConfig();
  return new EgressClient(config.httpUrl, config.apiKey, config.apiSecret);
}

export async function getLiveKitEventHealth() {
  const configured = liveKitEventsConfigured();
  let roomService: "ok" | "missing" | "error" = configured ? "error" : "missing";
  let egressService: "ok" | "missing" | "error" = configured ? "error" : "missing";
  let roomError: string | null = null;
  let egressError: string | null = null;

  if (!configured) {
    return { configured, roomService, egressService, roomError, egressError };
  }

  try {
    await roomClient().listRooms([]);
    roomService = "ok";
  } catch (error) {
    roomError = error instanceof Error ? error.message : String(error);
  }

  try {
    await egressClient().listEgress({ active: true });
    egressService = "ok";
  } catch (error) {
    egressError = error instanceof Error ? error.message : String(error);
  }

  return { configured, roomService, egressService, roomError, egressError };
}

export async function ensureLiveKitEventRoom(params: {
  eventId: string;
  title: string;
  maxParticipants?: number;
}) {
  const roomName = liveKitEventRoomName(params.eventId);
  await roomClient().createRoom({
    name: roomName,
    emptyTimeout: 900,
    maxParticipants: params.maxParticipants ?? 500,
    metadata: JSON.stringify({
      type: "event",
      mode: "webinar",
      eventId: params.eventId,
      title: params.title,
    }),
  });
  return roomName;
}

export async function generateLiveKitEventToken(params: {
  roomName: string;
  identity: string;
  name: string;
  role: LiveKitEventRole;
  eventId: string;
}) {
  const { apiKey, apiSecret } = getConfig();
  const token = new AccessToken(apiKey, apiSecret, {
    identity: params.identity,
    name: params.name,
    ttl: "4h",
    metadata: JSON.stringify({ eventId: params.eventId, role: params.role }),
  });

  token.addGrant({
    room: params.roomName,
    roomJoin: true,
    roomAdmin: params.role === "host",
    canPublish: params.role === "host",
    canSubscribe: true,
    canPublishData: params.role === "host",
    canUpdateOwnMetadata: params.role === "host",
  });

  return token.toJwt();
}

export function liveKitWebhookReceiver() {
  const { apiKey, apiSecret } = getConfig();
  return new WebhookReceiver(apiKey, apiSecret);
}

export function liveKitReplayObjectKey(eventId: string) {
  return mediaObjectKey("event-replays", eventId, "recording.mp4");
}

export async function startLiveKitEventRecording(params: {
  eventId: string;
  roomName: string;
}) {
  const { bucket, region } = getS3MediaConfig();
  const key = liveKitReplayObjectKey(params.eventId);
  const output = {
    file: new EncodedFileOutput({
      fileType: EncodedFileType.MP4,
      filepath: key,
      output: {
        case: "s3" as const,
        value: new S3Upload({
          accessKey: process.env.AWS_ACCESS_KEY_ID ?? "",
          secret: process.env.AWS_SECRET_ACCESS_KEY ?? "",
          region,
          bucket,
        }),
      },
    }),
  };

  return egressClient().startRoomCompositeEgress(params.roomName, output, {
    layout: "speaker",
  });
}
