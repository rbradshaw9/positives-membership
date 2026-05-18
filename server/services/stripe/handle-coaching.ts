import type Stripe from "stripe";
import { after } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";
import { getStripe } from "@/lib/stripe/config";
import { syncCoachingClient } from "@/lib/activecampaign/sync";
import { metricCount } from "@/lib/observability/metrics";

/**
 * server/services/stripe/handle-coaching.ts
 *
 * Handles checkout.session.completed for purchase_type = "coaching_pack".
 *
 * Flow:
 *   1. Resolve member by metadata.member_id OR customer email
 *   2. Insert coaching_session_pack row (idempotent via stripe_checkout_session_id unique constraint)
 *   3. Fire after() to sync AC tags: coaching_client, coaching_low_sessions, coaching_pack_depleted
 *   4. Emit metrics
 *
 * Pack details by pack_type:
 *   single      — 1 session, no expiry
 *   punch_pass  — 10 sessions, expires 6 months from purchase date
 */

const PACK_CONFIG = {
  single: {
    sessions: 1,
    expiresMonths: null as number | null,
  },
  punch_pass: {
    sessions: 10,
    expiresMonths: 6,
  },
} as const;

type PackType = keyof typeof PACK_CONFIG;

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export async function handleCoachingCheckout(
  session: Stripe.Checkout.Session,
  customerId: string
): Promise<void> {
  const supabase = asLooseSupabaseClient(getAdminClient());
  const stripe = getStripe();

  const packType = (session.metadata?.pack_type ?? null) as PackType | null;
  const metaMemberId = session.metadata?.member_id ?? null;

  if (!packType || !(packType in PACK_CONFIG)) {
    console.error(
      `[CoachingWebhook] Missing or invalid pack_type in metadata — session: ${session.id}`
    );
    metricCount("coaching.checkout.completed", 1, {
      outcome: "invalid_pack_type",
      livemode: session.livemode,
    });
    return;
  }

  // ── Step 1: Resolve member ───────────────────────────────────────────────
  let memberId = metaMemberId;
  let memberEmail: string | null = null;

  if (!memberId) {
    // Fallback: look up by customer email
    let stripeCustomer: Stripe.Customer | null = null;
    try {
      const customer = await stripe.customers.retrieve(customerId);
      if (!customer.deleted) stripeCustomer = customer;
    } catch (err) {
      console.error(
        `[CoachingWebhook] Failed to retrieve customer ${customerId}: ` +
          `${err instanceof Error ? err.message : String(err)}`
      );
    }

    const email =
      session.customer_details?.email ?? stripeCustomer?.email ?? null;

    if (!email) {
      console.error(
        `[CoachingWebhook] Cannot resolve member — no member_id or email — session: ${session.id}`
      );
      metricCount("coaching.checkout.completed", 1, {
        outcome: "missing_member",
        livemode: session.livemode,
      });
      return;
    }

    const { data: memberRow } = await supabase
      .from("member")
      .select<{ id: string; email: string }>("id, email")
      .eq("email", email)
      .maybeSingle();

    if (!memberRow) {
      console.error(
        `[CoachingWebhook] No member row for email ${email} — session: ${session.id}`
      );
      metricCount("coaching.checkout.completed", 1, {
        outcome: "missing_member",
        livemode: session.livemode,
      });
      return;
    }

    memberId = memberRow.id;
    memberEmail = memberRow.email;
  } else {
    // Fetch email for AC sync
    const { data: memberRow } = await supabase
      .from("member")
      .select<{ email: string }>("email")
      .eq("id", memberId)
      .maybeSingle();
    memberEmail = memberRow?.email ?? null;
  }

  // ── Step 2: Insert coaching_session_pack (idempotent) ────────────────────
  const pack = PACK_CONFIG[packType];
  const now = new Date();
  const expiresAt = pack.expiresMonths
    ? addMonths(now, pack.expiresMonths).toISOString()
    : null;

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  const { error: insertError } = await supabase
    .from("coaching_session_pack")
    .insert({
      member_id: memberId,
      pack_type: packType,
      sessions_total: pack.sessions,
      sessions_remaining: pack.sessions,
      stripe_customer_id: customerId,
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: paymentIntentId,
      amount_paid_cents: session.amount_total ?? null,
      expires_at: expiresAt,
    });

  // 23505 = unique_violation — already inserted on a prior webhook replay
  if (insertError && insertError.code !== "23505") {
    throw new Error(
      `[CoachingWebhook] Failed to insert coaching_session_pack for member ${memberId}: ${insertError.message}`
    );
  }

  const alreadyProcessed = insertError?.code === "23505";

  if (alreadyProcessed) {
    console.log(
      `[CoachingWebhook] Duplicate session ${session.id} — already processed. Skipping.`
    );
    return;
  }

  console.log(
    `[CoachingWebhook] coaching_session_pack inserted — memberId: ${memberId}, ` +
      `packType: ${packType}, sessions: ${pack.sessions}, expiresAt: ${expiresAt ?? "none"}`
  );

  metricCount("coaching.checkout.completed", 1, {
    outcome: "pack_granted",
    pack_type: packType,
    livemode: session.livemode,
  });

  // ── Step 3: AC sync (non-blocking) ──────────────────────────────────────
  if (memberEmail) {
    after(async () => {
      try {
        await syncCoachingClient({
          email: memberEmail!,
          packType,
          sessionsTotal: pack.sessions,
        });
      } catch (err) {
        console.error(
          `[CoachingWebhook] AC sync failed for ${memberEmail}: ` +
            `${err instanceof Error ? err.message : String(err)}`
        );
      }
    });
  }
}
