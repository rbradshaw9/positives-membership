import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";

type WebhookPayload = Record<string, unknown>;

const EMAIL_KEYS = new Set([
  "email",
  "contact[email]",
  "subscriber[email]",
  "contact_email",
  "subscriber_email",
]);

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const email = value.trim().toLowerCase();
  if (!email || !email.includes("@")) return null;

  return email;
}

function flattenStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(flattenStrings);
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, nestedValue]) => [
      key,
      ...flattenStrings(nestedValue),
    ]);
  }

  return [];
}

function extractEmail(payload: WebhookPayload): string | null {
  for (const [key, value] of Object.entries(payload)) {
    const normalized = normalizeEmail(value);
    if (EMAIL_KEYS.has(key.toLowerCase()) && normalized) return normalized;
  }

  const nested = payload.contact;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    const normalized = normalizeEmail((nested as WebhookPayload).email);
    if (normalized) return normalized;
  }

  return null;
}

function extractEventType(payload: WebhookPayload): "subscribe" | "unsubscribe" | null {
  const explicitType = typeof payload.type === "string" ? payload.type.toLowerCase() : "";

  if (explicitType === "unsubscribe") return "unsubscribe";
  if (explicitType === "subscribe") return "subscribe";

  const values = flattenStrings(payload).map((value) => value.toLowerCase());
  if (values.some((value) => value === "unsubscribe" || value === "unsubscribed")) {
    return "unsubscribe";
  }
  if (values.some((value) => value === "subscribe" || value === "subscribed")) {
    return "subscribe";
  }

  return null;
}

async function parsePayload(request: NextRequest): Promise<WebhookPayload> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = await request.json();
    return body && typeof body === "object" && !Array.isArray(body) ? body : {};
  }

  const form = await request.formData();
  return Object.fromEntries(form.entries());
}

function isAuthorized(request: NextRequest): boolean {
  const expectedSecret = process.env.ACTIVECAMPAIGN_WEBHOOK_SECRET;

  if (!expectedSecret) {
    if (process.env.NODE_ENV === "production") {
      console.error("[AC webhook] ACTIVECAMPAIGN_WEBHOOK_SECRET is required in production.");
      return false;
    }

    console.warn("[AC webhook] ACTIVECAMPAIGN_WEBHOOK_SECRET is not set; accepting dev/test request.");
    return true;
  }

  const providedSecret =
    request.headers.get("x-activecampaign-webhook-secret") ??
    request.nextUrl.searchParams.get("secret");

  return providedSecret === expectedSecret;
}

async function setMarketingPreference(email: string, unsubscribed: boolean) {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("member")
    .update({ email_unsubscribed: unsubscribed })
    .eq("email", email)
    .select("id");

  if (error) {
    throw new Error(error.message);
  }

  return data?.length ?? 0;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: WebhookPayload;
  try {
    payload = await parsePayload(request);
  } catch (error) {
    console.error("[AC webhook] Failed to parse payload:", error);
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const eventType = extractEventType(payload);
  if (!eventType) {
    return NextResponse.json({ received: true, ignored: "unsupported_event" }, { status: 202 });
  }

  const email = extractEmail(payload);
  if (!email) {
    return NextResponse.json({ error: "Missing contact email" }, { status: 400 });
  }

  try {
    const updatedMembers = await setMarketingPreference(email, eventType === "unsubscribe");

    return NextResponse.json({
      received: true,
      event: eventType,
      email,
      email_unsubscribed: eventType === "unsubscribe",
      updated_members: updatedMembers,
    });
  } catch (error) {
    console.error("[AC webhook] Failed to sync marketing preference:", error);
    return NextResponse.json({ error: "Failed to sync marketing preference" }, { status: 500 });
  }
}
