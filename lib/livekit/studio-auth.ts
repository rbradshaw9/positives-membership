import { createHmac, timingSafeEqual } from "node:crypto";

type StudioTokenPayload = {
  eventId: string;
  userId: string;
  exp: number;
};

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signingSecret() {
  const secret = process.env.LIVEKIT_STUDIO_TOKEN_SECRET ?? process.env.LIVEKIT_API_SECRET;
  if (!secret) throw new Error("LiveKit studio token signing secret is not configured.");
  return secret;
}

function signPayload(encodedPayload: string) {
  return createHmac("sha256", signingSecret()).update(encodedPayload).digest("base64url");
}

export function createLiveKitStudioToken(params: {
  eventId: string;
  userId: string;
  ttlSeconds?: number;
}) {
  const payload: StudioTokenPayload = {
    eventId: params.eventId,
    userId: params.userId,
    exp: Math.floor(Date.now() / 1000) + (params.ttlSeconds ?? 4 * 60 * 60),
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  return `${encodedPayload}.${signPayload(encodedPayload)}`;
}

export function verifyLiveKitStudioToken(token: string | null, eventId: string) {
  if (!token) return null;
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;

  const expectedSignature = signPayload(encodedPayload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as Partial<StudioTokenPayload>;
    if (!payload.eventId || !payload.userId || !payload.exp) return null;
    if (payload.eventId !== eventId) return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return { eventId: payload.eventId, userId: payload.userId };
  } catch {
    return null;
  }
}
