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
  const adminClient = getAdminClient();
  const supabase = asLooseSupabaseClient(adminClient);
  const stripe = getStripe();

  const packType = (session.metadata?.pack_type ?? null) as PackType | null;
  const metaMemberId = session.metadata?.member_id ?? null;
  const isGuestCheckout = session.metadata?.guest === "true" && !metaMemberId;

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

  // ── Step 1: Resolve or create member ─────────────────────────────────────
  let memberId = metaMemberId;
  let memberEmail: string | null = null;
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

  if (!memberId) {
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

    const customerName =
      session.customer_details?.name?.trim() ??
      stripeCustomer?.name?.trim() ??
      null;

    const { data: memberRow, error: memberLookupError } = await supabase
      .from("member")
      .select<{ id: string; email: string; stripe_customer_id: string | null }>(
        "id, email, stripe_customer_id"
      )
      .eq("email", email)
      .maybeSingle();

    if (memberLookupError) {
      throw new Error(
        `[CoachingWebhook] Failed to look up member for ${email}: ${memberLookupError.message}`
      );
    }

    if (memberRow) {
      memberId = memberRow.id;
      memberEmail = memberRow.email;

      if (!memberRow.stripe_customer_id) {
        await supabase
          .from("member")
          .update({ stripe_customer_id: customerId })
          .eq("id", memberRow.id);
      }
    } else {
      const { data: newUserData, error: createError } =
        await adminClient.auth.admin.createUser({
          email,
          email_confirm: true,
        });

      if (createError) {
        console.log(
          `[CoachingWebhook] createUser returned error for ${email}; checking member table. Error: ${createError.message}`
        );

        const { data: existingMember } = await supabase
          .from("member")
          .select<{ id: string; email: string }>("id, email")
          .eq("email", email)
          .maybeSingle();

        if (!existingMember) {
          throw new Error(
            `[CoachingWebhook] Could not create or resolve member for ${email}.`
          );
        }

        memberId = existingMember.id;
        memberEmail = existingMember.email;
      } else {
        memberId = newUserData.user.id;
        memberEmail = email;
      }

      const { error: upsertError } = await supabase
        .from("member")
        .upsert(
          {
            id: memberId,
            email,
            ...(customerName ? { name: customerName } : {}),
            stripe_customer_id: customerId,
            subscription_status: "inactive",
            launch_cohort: "live",
            launch_source: "public_coaching",
          },
          { onConflict: "id" }
        );

      if (upsertError) {
        throw new Error(
          `[CoachingWebhook] Failed to create coaching buyer member row for ${email}: ${upsertError.message}`
        );
      }
    }
  } else {
    // Fetch email for AC sync
    const { data: memberRow } = await supabase
      .from("member")
      .select<{ email: string; stripe_customer_id: string | null }>(
        "email, stripe_customer_id"
      )
      .eq("id", memberId)
      .maybeSingle();
    memberEmail = memberRow?.email ?? null;

    if (memberRow && !memberRow.stripe_customer_id) {
      await supabase
        .from("member")
        .update({ stripe_customer_id: customerId })
        .eq("id", memberId);
    }
  }

  if (!memberId) {
    console.error(
      `[CoachingWebhook] Cannot grant pack because member could not be resolved — session: ${session.id}`
    );
    metricCount("coaching.checkout.completed", 1, {
      outcome: "missing_member",
      livemode: session.livemode,
    });
    return;
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

  // ── Step 3: Guest login token for payment-first coaching buyers ─────────
  if (isGuestCheckout && memberEmail) {
    const { data: linkData, error: linkError } =
      await adminClient.auth.admin.generateLink({
        type: "magiclink",
        email: memberEmail,
      });

    if (linkError || !linkData?.properties?.hashed_token) {
      console.error(
        `[CoachingWebhook] Failed to generate onboarding token for ${memberEmail}: ` +
          `${linkError?.message ?? "no hashed_token in response"}`
      );
      metricCount("coaching.checkout.completed", 1, {
        outcome: "pack_granted_no_login_token",
        pack_type: packType,
        livemode: session.livemode,
      });
    } else {
      const { error: tokenError } = await supabase
        .from("member")
        .update({ onboarding_token: linkData.properties.hashed_token })
        .eq("id", memberId);

      if (tokenError) {
        console.error(
          `[CoachingWebhook] Failed to store onboarding token for ${memberEmail}: ${tokenError.message}`
        );
      }
    }
  }

  metricCount("coaching.checkout.completed", 1, {
    outcome: "pack_granted",
    pack_type: packType,
    livemode: session.livemode,
  });

  // ── Step 4: AC sync (non-blocking) ──────────────────────────────────────
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
