import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";

export const runtime = "nodejs";

type ZoomWebhookPayload = {
  event?: string;
  payload?: {
    plainToken?: string;
    account_id?: string;
    user_id?: string;
    object?: {
      account_id?: string;
      user_id?: string;
      id?: string;
    };
  };
};

function webhookSecret() {
  return process.env.ZOOM_WEBHOOK_SECRET_TOKEN ?? process.env.ZOOM_SECRET_TOKEN ?? "";
}

function hmacHex(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("hex");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function verifyZoomSignature(request: Request, rawBody: string, secret: string) {
  const timestamp = request.headers.get("x-zm-request-timestamp");
  const signature = request.headers.get("x-zm-signature");

  if (!timestamp || !signature) return false;

  const timestampMs = Number(timestamp) * 1000;
  if (!Number.isFinite(timestampMs)) return false;

  const fiveMinutesMs = 5 * 60 * 1000;
  if (Math.abs(Date.now() - timestampMs) > fiveMinutesMs) return false;

  const expected = `v0=${hmacHex(`v0:${timestamp}:${rawBody}`, secret)}`;
  return safeEqual(expected, signature);
}

function urlValidationResponse(plainToken: string, secret: string) {
  return NextResponse.json({
    plainToken,
    encryptedToken: hmacHex(plainToken, secret),
  });
}

function zoomIdentity(payload: ZoomWebhookPayload) {
  const object = payload.payload?.object;
  return {
    accountId: payload.payload?.account_id ?? object?.account_id ?? null,
    userId: payload.payload?.user_id ?? object?.user_id ?? object?.id ?? null,
  };
}

async function disableZoomConnections(payload: ZoomWebhookPayload) {
  const { accountId, userId } = zoomIdentity(payload);
  if (!accountId && !userId) return;

  const supabase = asLooseSupabaseClient(getAdminClient());
  const update = {
    status: "disabled",
    last_error: "Zoom app deauthorized by the connected account.",
    updated_at: new Date().toISOString(),
  };

  if (userId) {
    await supabase.from("zoom_connection").update(update).eq("zoom_user_id", userId);
  }

  if (accountId) {
    await supabase.from("zoom_connection").update(update).eq("zoom_account_id", accountId);
  }
}

export async function POST(request: Request) {
  const secret = webhookSecret();
  if (!secret) {
    console.error("[zoom/deauthorization] Missing Zoom webhook secret token.");
    return NextResponse.json({ error: "Zoom webhook secret is not configured." }, { status: 503 });
  }

  const rawBody = await request.text();
  let payload: ZoomWebhookPayload;

  try {
    payload = JSON.parse(rawBody) as ZoomWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  if (payload.event === "endpoint.url_validation" && payload.payload?.plainToken) {
    return urlValidationResponse(payload.payload.plainToken, secret);
  }

  if (!verifyZoomSignature(request, rawBody, secret)) {
    console.warn("[zoom/deauthorization] Invalid Zoom webhook signature.");
    return NextResponse.json({ error: "Invalid Zoom signature." }, { status: 401 });
  }

  if (payload.event === "app_deauthorized" || payload.event === "app.deauthorized") {
    await disableZoomConnections(payload);
  }

  return NextResponse.json({ ok: true });
}
