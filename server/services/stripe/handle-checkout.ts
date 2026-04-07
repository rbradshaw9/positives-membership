import type Stripe from "stripe";
import { getAdminClient } from "@/lib/supabase/admin";
import { resend, FROM_ADDRESS, REPLY_TO } from "@/lib/email/resend";
import { welcomeEmailHtml, welcomeEmailText } from "@/lib/email/templates/welcome";
import { syncNewMember } from "@/lib/activecampaign/sync";
import { enrollInOnboardingSequence } from "@/lib/onboarding/enroll";

/**
 * server/services/stripe/handle-checkout.ts
 * Handler for checkout.session.completed webhook events.
 *
 * ─── TWO CHECKOUT PATHS ──────────────────────────────────────────────────────
 *
 * PATH A — Auth-first (legacy, preserved):
 *   Visitor authenticated before checkout. session.client_reference_id is set
 *   to their Supabase userId. We look up the member row directly and activate.
 *   Kept intentionally so Stripe webhook replays of any pre-existing auth-first
 *   sessions continue to process correctly — do not remove.
 *
 * PATH B — Guest checkout (current, payment-first):
 *   Visitor went through Stripe without prior auth. client_reference_id is
 *   absent (null). We:
 *     1. Read email from session.customer_details.email
 *     2. Create a Supabase auth user (or find existing by direct DB query)
 *     3. Activate the member row
 *     4. Generate a magic-link token hash
 *     5. Store it on member.onboarding_token for the success page to consume
 *
 * ─── IDEMPOTENCY ─────────────────────────────────────────────────────────────
 * Stripe may replay checkout.session.completed. Every step is idempotent:
 *   • admin.createUser  — caught and bypassed if email already exists
 *   • member trigger    — ON CONFLICT (id) DO NOTHING
 *   • UPDATE member     — same values if replayed; safe
 *   • generateLink      — fresh token each replay; old one overwritten on member
 *
 * ─── IDENTITY FIELDS FROM STRIPE ─────────────────────────────────────────────
 *   session.client_reference_id — Set to userId (Path A). Absent in Path B.
 *   session.customer            — Stripe customer ID (both paths).
 *   session.customer_details.email — Email collected by Stripe (Path B primary).
 *   session.metadata.userId     — Redundant fallback for Path A only.
 */

export async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  const customerId =
    typeof session.customer === "string" ? session.customer : null;

  const userId =
    session.client_reference_id ??
    session.metadata?.userId ??
    null;

  console.log(
    `[Stripe] checkout.session.completed — session: ${session.id}, ` +
    `customer: ${customerId ?? "none"}, userId: ${userId ?? "none (guest)"}`
  );

  if (!customerId) {
    console.error(
      `[Stripe] checkout.session.completed has no customer ID — session: ${session.id}. ` +
        `Member cannot be activated. Check Stripe session configuration.`
    );
    return;
  }

  // ── PATH A: Auth-first checkout (client_reference_id present) ────────────
  if (userId) {
    await handleAuthFirstCheckout(session, userId, customerId);
    return;
  }

  // ── PATH B: Guest checkout (no client_reference_id) ──────────────────────
  console.log(
    `[Stripe] Guest checkout detected — session: ${session.id}. ` +
    `Proceeding with email-based account creation.`
  );
  await handleGuestCheckout(session, customerId);
}

// ─── PATH A: Auth-first (legacy — preserved for webhook replay safety) ────────

async function handleAuthFirstCheckout(
  session: Stripe.Checkout.Session,
  userId: string,
  customerId: string
): Promise<void> {
  const supabase = getAdminClient();

  const { data: member, error: lookupError } = await supabase
    .from("member")
    .select("id, stripe_customer_id, subscription_status")
    .eq("id", userId)
    .single();

  if (lookupError || !member) {
    console.error(
      `[Stripe] checkout.session.completed — member row not found for userId: ${userId}. ` +
        `Auth trigger may not have run yet. No fallback for auth-first path.`
    );
    return;
  }

  const updates: Record<string, string> = {
    subscription_status: "active",
  };

  if (!member.stripe_customer_id) {
    updates.stripe_customer_id = customerId;
    console.log(
      `[Stripe] Writing missing stripe_customer_id to member row — userId: ${userId}, customerId: ${customerId}`
    );
  }

  const { error: updateError } = await supabase
    .from("member")
    .update(updates)
    .eq("id", userId);

  if (updateError) {
    throw new Error(
      `[Stripe] Failed to activate member for userId ${userId}: ${updateError.message}`
    );
  }

  console.log(
    `[Stripe] Member activated via auth-first checkout — userId: ${userId}, customerId: ${customerId}`
  );
}

// ─── PATH B: Guest checkout ───────────────────────────────────────────────────

async function handleGuestCheckout(
  session: Stripe.Checkout.Session,
  customerId: string
): Promise<void> {
  const supabase = getAdminClient();

  // ── Step 1: Resolve email ────────────────────────────────────────────────
  const email = session.customer_details?.email;
  if (!email) {
    console.error(
      `[Stripe] Guest checkout — no email in customer_details — session: ${session.id}. ` +
        `Cannot create account. Member will not receive instant access.`
    );
    return;
  }

  console.log(
    `[Stripe] Guest checkout — email resolved: ${email} — session: ${session.id}`
  );

  // ── Step 2: Get or create Supabase auth user ─────────────────────────────
  // email_confirm: true — payment is proof of email ownership.
  // No password — member will optionally set one later via /account.
  let userId: string;

  const { data: newUserData, error: createError } =
    await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
    });

  if (createError) {
    // User already exists — look them up by email in public.member.
    //
    // Why not admin.listUsers()?  It paginates and becomes O(N) — it will
    // silently miss the user once the total user count exceeds perPage.
    //
    // Why not query auth.users directly?  The supabase-js client's .from()
    // targets the public schema only; crossing to the auth schema requires
    // either a Postgres function or raw management API access — both add
    // operational complexity without meaningful benefit here.
    //
    // The member table has a denormalized `email` column written whenever a
    // guest first activates. For a returning purchaser, this is always present.
    // If somehow absent (extreme edge case), we throw and Stripe retries.
    console.log(
      `[Stripe] createUser returned error (likely duplicate) — ` +
        `looking up existing userId from member table for: ${email}. Error: ${createError.message}`
    );

    const { data: memberRow, error: memberLookupError } = await supabase
      .from("member")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (memberLookupError || !memberRow) {
      throw new Error(
        `[Stripe] createUser failed AND no member row found for ${email}. ` +
          `Cannot proceed. Manual reconciliation required — check auth.users and member tables.`
      );
    }

    userId = memberRow.id;
    console.log(
      `[Stripe] Existing user resolved from member table — userId: ${userId}, email: ${email}`
    );
  } else {
    userId = newUserData.user.id;
    console.log(
      `[Stripe] New user created — userId: ${userId}, email: ${email}`
    );
  }
  // Note: on_auth_user_created trigger fires on new user creation and inserts
  // the member row with ON CONFLICT (id) DO NOTHING — fully idempotent.

  // ── Step 3: Activate the member row ─────────────────────────────────────
  // The trigger may not have run yet in a race condition edge case — use
  // upsert so the member row is guaranteed to exist and be active.
  const { error: upsertError } = await supabase
    .from("member")
    .upsert(
      {
        id: userId,
        email,
        stripe_customer_id: customerId,
        subscription_status: "active",
      },
      { onConflict: "id" }
    );

  if (upsertError) {
    throw new Error(
      `[Stripe] Failed to activate member for guest userId ${userId}: ${upsertError.message}`
    );
  }

  console.log(
    `[Stripe] Member activated — userId: ${userId}, customerId: ${customerId}, email: ${email}`
  );

  // ── Step 4: Generate one-time login token ────────────────────────────────
  // admin.generateLink produces a hashed_token that can be exchanged for a
  // Supabase session via verifyOtp({ token_hash, type: "email" }) on the client.
  // This is standard Supabase PKCE-style token exchange — no custom JWT needed.
  const { data: linkData, error: linkError } =
    await supabase.auth.admin.generateLink({
      type: "magiclink",
      email,
    });

  if (linkError || !linkData?.properties?.hashed_token) {
    // Non-fatal: member is activated. They can still log in via magic link.
    // The success page will fall through to its fallback UX.
    console.error(
      `[Stripe] Failed to generate onboarding token for ${email}: ` +
        `${linkError?.message ?? "no hashed_token in response"}. ` +
        `Member is active but will not receive instant login.`
    );
    return;
  }

  const tokenHash = linkData.properties.hashed_token;

  console.log(
    `[Stripe] Login token generated for userId: ${userId}`
  );

  // ── Step 5: Store token for success page to consume ─────────────────────
  const { error: tokenError } = await supabase
    .from("member")
    .update({ onboarding_token: tokenHash })
    .eq("id", userId);

  if (tokenError) {
    // Non-fatal: member is active. Token loss means they manually log in.
    console.error(
      `[Stripe] Failed to store onboarding_token for userId ${userId}: ${tokenError.message}. ` +
        `Member is active. Success page will show manual login fallback.`
    );
    return;
  }

  console.log(
    `[Stripe] Onboarding token stored — userId: ${userId}. ` +
      `Guest checkout complete. Member ready for instant login.`
  );

  // ── Step 6: Send welcome email ───────────────────────────────────────────
  // Non-fatal — a send failure should never block the webhook response.
  try {
    const firstName = session.customer_details?.name?.split(" ")[0] ?? "there";
    const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://positives.life"}/auth/login?token_hash=${tokenHash}&type=email`;

    await resend.emails.send({
      from: FROM_ADDRESS,
      to: email,
      replyTo: REPLY_TO,
      subject: "Welcome to Positives — your first practice is ready.",
      html: welcomeEmailHtml({ firstName, loginUrl }),
      text: welcomeEmailText({ firstName, loginUrl }),
    });

    console.log(`[Resend] Welcome email sent — userId: ${userId}, email: ${email}`);
  } catch (emailErr) {
    console.error(
      `[Resend] Failed to send welcome email to ${email}: ` +
        `${emailErr instanceof Error ? emailErr.message : String(emailErr)}. ` +
        `Member is active — this is non-fatal.`
    );
  }

  // ── Step 7: Sync to ActiveCampaign ──────────────────────────────────────
  // Non-fatal — subscribes member to AC list and applies tier + founding_member tags.
  await syncNewMember({
    email,
    firstName: session.customer_details?.name?.split(" ")[0],
    lastName:  session.customer_details?.name?.split(" ").slice(1).join(" ") || undefined,
    tier:      "level_1",
    stripeCustomerId: customerId,
  });

  // Queue drip emails for days 3, 7, 14
  await enrollInOnboardingSequence(userId, email);
}
