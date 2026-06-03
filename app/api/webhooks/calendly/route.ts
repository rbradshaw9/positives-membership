import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";
import { after } from "next/server";
import { syncCoachingSessionStatus } from "@/lib/activecampaign/sync";
import { metricCount } from "@/lib/observability/metrics";

/**
 * app/api/webhooks/calendly/route.ts
 *
 * Calendly webhook endpoint for coaching session tracking.
 *
 * ─── EVENTS HANDLED ──────────────────────────────────────────────────────────
 *
 *   invitee.created   — New booking confirmed
 *     → Deduct 1 session from the member's oldest non-expired pack
 *     → Insert a coaching_session_log row (status: scheduled)
 *     → Apply coaching_low_sessions or coaching_pack_depleted AC tag if thresholds met
 *
 *   invitee.canceled  — Booking canceled by either party
 *     → Restore 1 session to the pack it was deducted from
 *     → Update coaching_session_log status to canceled
 *     → Remove coaching_pack_depleted / coaching_low_sessions tags if no longer applicable
 *
 * ─── SIGNATURE VERIFICATION ──────────────────────────────────────────────────
 *
 * Calendly signs webhooks with HMAC-SHA256 using the signing key from
 * Integrations → Webhooks → your endpoint's signing key.
 *
 * The signature is in the `Calendly-Webhook-Signature` header, format:
 *   t=<timestamp>,v1=<hex_signature>
 *
 * We reconstruct:  HMAC-SHA256(signing_key, `${timestamp}.${rawBody}`)
 *
 * ─── SETUP ───────────────────────────────────────────────────────────────────
 *
 * 1. Add CALENDLY_WEBHOOK_SIGNING_KEY to your .env.local (and Vercel env)
 * 2. Register this endpoint in Calendly:
 *      Calendly → Integrations → Webhooks → New webhook
 *      URL: https://positives.life/api/webhooks/calendly
 *      Events: invitee.created, invitee.canceled
 *      Scope: Organization or User (match your team setup)
 * 3. Paste the generated signing key into CALENDLY_WEBHOOK_SIGNING_KEY
 *
 * ─── MEMBER MATCHING ─────────────────────────────────────────────────────────
 *
 * We match the booking to a member via invitee email. If no match is found
 * we log the event as "unmatched" — admin alert is emitted via metricCount.
 *
 * ─── PACK SELECTION STRATEGY ─────────────────────────────────────────────────
 *
 * We deduct from the pack with the earliest expires_at (soonest-to-expire first).
 * Packs with no expiry (single sessions / earned packs) are used last.
 * If multiple packs share the same earliest expiry, we pick by oldest created_at.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

type CalendlyEventPayload = {
  event: "invitee.created" | "invitee.canceled" | string;
  payload: {
    event_type?: { name?: string; uri?: string };
    event?: { start_time?: string; uri?: string };
    invitee?: {
      name?: string;
      email?: string;
      uri?: string;
      cancel_url?: string;
      reschedule_url?: string;
    };
    tracking?: { utm_source?: string };
    // Present on cancellation
    canceled?: boolean;
    canceler_type?: "host" | "invitee";
    cancel_reason?: string;
    // Present on invitee.canceled — points to the original invitee
    routing?: { routing_form_submission?: string };
    // The canceled event URI links back to the original booking
    old_invitee?: { uri?: string };
  };
};

// ─── Signature verification ───────────────────────────────────────────────────

function verifyCalendlySignature(
  rawBody: string,
  signatureHeader: string | null,
  signingKey: string
): boolean {
  if (!signatureHeader) return false;

  // Format: t=<unix_ts>,v1=<hex_sig>
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((p) => p.split("=") as [string, string])
  );

  const timestamp = parts["t"];
  const receivedSig = parts["v1"];

  if (!timestamp || !receivedSig) return false;

  // Replay protection: reject if timestamp is older than 5 minutes
  const ts = parseInt(timestamp, 10);
  const nowSecs = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSecs - ts) > 300) {
    console.warn("[CalendlyWebhook] Rejected stale webhook (timestamp too old)");
    return false;
  }

  const expectedSig = createHmac("sha256", signingKey)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  try {
    return timingSafeEqual(
      Buffer.from(receivedSig, "hex"),
      Buffer.from(expectedSig, "hex")
    );
  } catch {
    return false;
  }
}

// ─── Pack deduction ───────────────────────────────────────────────────────────

/**
 * Find the best pack to deduct a session from.
 * Strategy: soonest-to-expire first (expires_at ASC NULLS LAST), then oldest created.
 */
async function deductSession(
  supabase: ReturnType<typeof asLooseSupabaseClient>,
  memberId: string
): Promise<{ packId: string; sessionsRemaining: number } | null> {
  type PackRow = {
    id: string;
    sessions_remaining: number;
    expires_at: string | null;
    created_at: string;
  };

  const { data: rawPacks } = await supabase
    .from("coaching_session_pack")
    .select("id, sessions_remaining, expires_at, created_at")
    .eq("member_id", memberId)
    .gt("sessions_remaining", 0)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order("expires_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  const packs = (rawPacks as PackRow[] | null) ?? [];
  if (packs.length === 0) return null;

  const pack = packs[0];
  const newRemaining = pack.sessions_remaining - 1;

  const { error } = await supabase
    .from("coaching_session_pack")
    .update({ sessions_remaining: newRemaining })
    .eq("id", pack.id)
    .eq("sessions_remaining", pack.sessions_remaining); // optimistic lock

  if (error) {
    console.error(`[CalendlyWebhook] Failed to deduct session from pack ${pack.id}: ${error.message}`);
    return null;
  }

  return { packId: pack.id, sessionsRemaining: newRemaining };
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const signingKey = process.env.CALENDLY_WEBHOOK_SIGNING_KEY ?? null;

  // ── Read body as text for signature verification ──────────────────────
  const rawBody = await req.text();
  const headersList = await headers();
  const signatureHeader = headersList.get("Calendly-Webhook-Signature");

  // ── Signature verification ────────────────────────────────────────────
  if (!signingKey) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
    }
    // Dev/test mode: log a warning but continue so local testing works
    console.warn(
      "[CalendlyWebhook] CALENDLY_WEBHOOK_SIGNING_KEY is not set — skipping signature verification. " +
        "Set this env var before enabling in production."
    );
  } else {
    const valid = verifyCalendlySignature(rawBody, signatureHeader, signingKey);
    if (!valid) {
      console.warn("[CalendlyWebhook] Invalid signature — request rejected");
      metricCount("calendly.webhook.rejected", 1, { reason: "invalid_signature" });
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  // ── Parse payload ─────────────────────────────────────────────────────
  let body: CalendlyEventPayload;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = body.event;
  console.log(`[CalendlyWebhook] Received event: ${eventType}`);

  // Only handle invitee.created and invitee.canceled
  if (eventType !== "invitee.created" && eventType !== "invitee.canceled") {
    return NextResponse.json({ received: true, action: "ignored" });
  }

  const supabase = asLooseSupabaseClient(getAdminClient());

  // ─── invitee.created ─────────────────────────────────────────────────
  if (eventType === "invitee.created") {
    await handleInviteeCreated(supabase, body.payload);
    return NextResponse.json({ received: true });
  }

  // ─── invitee.canceled ────────────────────────────────────────────────
  if (eventType === "invitee.canceled") {
    await handleInviteeCanceled(supabase, body.payload);
    return NextResponse.json({ received: true });
  }

  return NextResponse.json({ received: true });
}

// ─── invitee.created handler ──────────────────────────────────────────────────

async function handleInviteeCreated(
  supabase: ReturnType<typeof asLooseSupabaseClient>,
  payload: CalendlyEventPayload["payload"]
) {
  const inviteeEmail = payload.invitee?.email ?? null;
  const inviteeUri = payload.invitee?.uri ?? null;
  const eventUri = payload.event?.uri ?? null;
  const scheduledAt = payload.event?.start_time ?? null;
  const eventTypeName = payload.event_type?.name ?? null;
  const inviteeName = payload.invitee?.name ?? null;

  if (!inviteeEmail) {
    console.error("[CalendlyWebhook] invitee.created missing invitee email");
    metricCount("calendly.webhook.error", 1, { reason: "missing_email", event: "created" });
    return;
  }

  // Idempotency: skip if we've already processed this invitee URI
  if (inviteeUri) {
    const { data: existing } = await supabase
      .from("coaching_session_log")
      .select<{ id: string }>("id")
      .eq("calendly_invitee_uri", inviteeUri)
      .maybeSingle();

    if (existing) {
      console.log(`[CalendlyWebhook] Already processed invitee ${inviteeUri} — skipping`);
      return;
    }
  }

  // ── Resolve member ──────────────────────────────────────────────────────
  const { data: member } = await supabase
    .from("member")
    .select<{ id: string; email: string }>("id, email")
    .eq("email", inviteeEmail)
    .maybeSingle();

  if (!member) {
    // Booking came in from someone who isn't a registered member.
    // Log as unmatched — admin needs to reconcile.
    console.warn(
      `[CalendlyWebhook] No member found for invitee email ${inviteeEmail} — logging as unmatched`
    );
    await supabase.from("coaching_session_log").insert({
      member_id: null,
      pack_id: null,
      status: "unmatched",
      calendly_invitee_uri: inviteeUri,
      calendly_event_uri: eventUri,
      scheduled_at: scheduledAt,
      invitee_name: inviteeName,
      invitee_email: inviteeEmail,
      event_type_name: eventTypeName,
      admin_note: "No member row found for this email at booking time.",
    });
    metricCount("calendly.session.unmatched", 1, { event: "created" });
    return;
  }

  const memberId = member.id;

  // ── Deduct session from pack ────────────────────────────────────────────
  const deduction = await deductSession(supabase, memberId);

  if (!deduction) {
    console.warn(
      `[CalendlyWebhook] No eligible pack found for member ${memberId} (${inviteeEmail}) — logging as unmatched`
    );
    await supabase.from("coaching_session_log").insert({
      member_id: memberId,
      pack_id: null,
      status: "unmatched",
      calendly_invitee_uri: inviteeUri,
      calendly_event_uri: eventUri,
      scheduled_at: scheduledAt,
      invitee_name: inviteeName,
      invitee_email: inviteeEmail,
      event_type_name: eventTypeName,
      admin_note: "No active pack with remaining sessions found.",
    });
    metricCount("calendly.session.unmatched", 1, {
      event: "created",
      reason: "no_eligible_pack",
    });
    return;
  }

  const { packId, sessionsRemaining } = deduction;

  // ── Insert session log ──────────────────────────────────────────────────
  const { error: logError } = await supabase.from("coaching_session_log").insert({
    member_id: memberId,
    pack_id: packId,
    status: "scheduled",
    calendly_invitee_uri: inviteeUri,
    calendly_event_uri: eventUri,
    scheduled_at: scheduledAt,
    invitee_name: inviteeName,
    invitee_email: inviteeEmail,
    event_type_name: eventTypeName,
  });

  if (logError) {
    console.error(
      `[CalendlyWebhook] Failed to insert session log for ${memberId}: ${logError.message}`
    );
  }

  console.log(
    `[CalendlyWebhook] Session booked — member: ${memberId}, pack: ${packId}, ` +
      `sessions_remaining: ${sessionsRemaining}`
  );

  metricCount("calendly.session.booked", 1, {
    sessions_remaining: sessionsRemaining,
    event_type: eventTypeName ?? "unknown",
  });

  // ── AC sync (non-blocking) ─────────────────────────────────────────────
  after(async () => {
    try {
      await syncCoachingSessionStatus({
        email: inviteeEmail,
        sessionsRemaining,
      });
    } catch (err) {
      console.error(
        `[CalendlyWebhook] AC sync failed for ${inviteeEmail}: ` +
          `${err instanceof Error ? err.message : String(err)}`
      );
    }
  });
}

// ─── invitee.canceled handler ─────────────────────────────────────────────────

async function handleInviteeCanceled(
  supabase: ReturnType<typeof asLooseSupabaseClient>,
  payload: CalendlyEventPayload["payload"]
) {
  const inviteeUri = payload.invitee?.uri ?? null;
  const inviteeEmail = payload.invitee?.email ?? null;

  if (!inviteeUri) {
    console.warn("[CalendlyWebhook] invitee.canceled missing invitee URI — cannot match log");
    return;
  }

  // ── Find the original session log ──────────────────────────────────────
  const { data: log } = await supabase
    .from("coaching_session_log")
    .select<{
      id: string;
      pack_id: string | null;
      status: string;
      member_id: string | null;
    }>("id, pack_id, status, member_id")
    .eq("calendly_invitee_uri", inviteeUri)
    .maybeSingle();

  if (!log) {
    console.warn(`[CalendlyWebhook] No session log found for canceled invitee URI: ${inviteeUri}`);
    metricCount("calendly.session.cancel_unmatched", 1);
    return;
  }

  if (log.status === "canceled") {
    console.log(`[CalendlyWebhook] Session ${log.id} already canceled — skipping`);
    return;
  }

  // ── Update log status ──────────────────────────────────────────────────
  await supabase
    .from("coaching_session_log")
    .update({ status: "canceled" })
    .eq("id", log.id);

  // ── Restore session to pack ────────────────────────────────────────────
  let sessionsRemaining: number | null = null;

  if (log.pack_id) {
    const { data: pack } = await supabase
      .from("coaching_session_pack")
      .select<{ id: string; sessions_remaining: number; sessions_total: number }>(
        "id, sessions_remaining, sessions_total"
      )
      .eq("id", log.pack_id)
      .maybeSingle();

    if (pack) {
      const newRemaining = Math.min(
        pack.sessions_remaining + 1,
        pack.sessions_total // never exceed original total
      );
      await supabase
        .from("coaching_session_pack")
        .update({ sessions_remaining: newRemaining })
        .eq("id", pack.id);

      sessionsRemaining = newRemaining;
      console.log(
        `[CalendlyWebhook] Session restored — pack: ${pack.id}, sessions_remaining: ${newRemaining}`
      );
    }
  }

  metricCount("calendly.session.canceled", 1);

  // ── AC sync: update tags based on restored count ───────────────────────
  const email = inviteeEmail ?? null;
  if (email && sessionsRemaining !== null) {
    const finalRemaining = sessionsRemaining;
    after(async () => {
      try {
        await syncCoachingSessionStatus({ email, sessionsRemaining: finalRemaining });
      } catch (err) {
        console.error(
          `[CalendlyWebhook] AC sync failed for ${email} on cancel: ` +
            `${err instanceof Error ? err.message : String(err)}`
        );
      }
    });
  }
}
