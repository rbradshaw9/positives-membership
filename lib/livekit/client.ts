/**
 * lib/livekit/client.ts
 *
 * Server-side Livekit helpers.
 * Uses livekit-server-sdk to create rooms and issue signed join tokens.
 * The Livekit server runs on livekit.positives.life (Hetzner, self-hosted).
 */

import { AccessToken, RoomServiceClient } from "livekit-server-sdk";

function getLivekitConfig() {
  const url = process.env.LIVEKIT_URL;
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!url || !apiKey || !apiSecret) {
    throw new Error(
      "Livekit is not configured. Set LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET."
    );
  }
  return { url, apiKey, apiSecret };
}

function getRoomServiceClient() {
  const { url, apiKey, apiSecret } = getLivekitConfig();
  // RoomServiceClient uses the HTTP URL (https://), not wss://
  const httpUrl = url.replace("wss://", "https://").replace("ws://", "http://");
  return new RoomServiceClient(httpUrl, apiKey, apiSecret);
}

export type LivekitRoomOptions = {
  roomName: string;
  emptyTimeoutSeconds?: number;   // default 300 (5 min) — room auto-closes if empty
  maxParticipants?: number;        // default 2 for coaching (coach + member)
};

/**
 * Create a Livekit room for a coaching session.
 * Idempotent — if room already exists, Livekit returns it as-is.
 */
export async function createCoachingRoom(options: LivekitRoomOptions) {
  const client = getRoomServiceClient();
  const room = await client.createRoom({
    name: options.roomName,
    emptyTimeout: options.emptyTimeoutSeconds ?? 300,
    maxParticipants: options.maxParticipants ?? 2,
    metadata: JSON.stringify({ type: "coaching" }),
  });
  return room;
}

/**
 * Delete a Livekit room (on cancellation).
 * Fails silently if room doesn't exist.
 */
export async function deleteCoachingRoom(roomName: string) {
  try {
    const client = getRoomServiceClient();
    await client.deleteRoom(roomName);
  } catch {
    // Room may already be gone — safe to ignore
  }
}

export type JoinTokenOptions = {
  roomName: string;
  participantIdentity: string;  // unique ID for this participant
  participantName: string;       // display name shown in the call
  role: "host" | "guest";        // host = coach, guest = member
  metadata?: string;
};

/**
 * Generate a signed JWT token for a participant to join a room.
 * Tokens expire in 4 hours — sufficient for any coaching session.
 *
 * host (coach) gets:
 *   - canPublish, canSubscribe, canPublishData
 *   - roomAdmin (can mute/remove participants)
 *
 * guest (member) gets:
 *   - canPublish, canSubscribe
 */
export async function generateJoinToken(options: JoinTokenOptions): Promise<string> {
  const { apiKey, apiSecret } = getLivekitConfig();

  const at = new AccessToken(apiKey, apiSecret, {
    identity: options.participantIdentity,
    name: options.participantName,
    metadata: options.metadata,
    ttl: "4h",
  });

  at.addGrant({
    roomJoin: true,
    room: options.roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    roomAdmin: options.role === "host",
  });

  return at.toJwt();
}

/**
 * Generate room name for a coaching booking.
 * Format: coaching-{bookingId} — globally unique, deterministic.
 */
export function coachingRoomName(bookingId: string): string {
  return `coaching-${bookingId}`;
}

export function livekitConfigured(): boolean {
  return Boolean(
    process.env.LIVEKIT_URL &&
    process.env.LIVEKIT_API_KEY &&
    process.env.LIVEKIT_API_SECRET
  );
}
