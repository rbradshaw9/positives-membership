import { getStripe } from "@/lib/stripe/config";
import { createClient } from "@supabase/supabase-js";
import { config } from "@/lib/config";

/**
 * server/services/stripe/create-checkout-session.ts
 * Creates a Stripe Checkout Session for Level 1 monthly membership.
 *
 * Customer linking strategy (idempotent):
 * 1. Check member.stripe_customer_id — if set, use it directly
 * 2. If missing, create a new Stripe customer and immediately persist
 *    the ID to the member row before creating the session
 * 3. client_reference_id is set to userId so checkout.session.completed
 *    can locate the member row without depending on subscription metadata
 *
 * Called from a Server Action in /subscribe — never from client code.
 */

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function createCheckoutSession(
  userId: string,
  email: string
): Promise<{ url: string }> {
  const stripe = getStripe();
  const supabase = getAdminClient();

  console.log(`[Stripe] Starting checkout for userId: ${userId}`);

  // ── Step 1: Resolve Stripe customer ID ──────────────────────────────────
  // Check the member row first — this is the canonical app-side linkage.
  const { data: member, error: memberError } = await supabase
    .from("member")
    .select("stripe_customer_id")
    .eq("id", userId)
    .single();

  if (memberError) {
    throw new Error(
      `[Stripe] Failed to load member row for userId ${userId}: ${memberError.message}`
    );
  }

  if (!member) {
    throw new Error(
      `[Stripe] Member row not found for userId ${userId}. ` +
        `Auth bootstrap trigger may not have run yet.`
    );
  }

  let stripeCustomerId: string = member?.stripe_customer_id ?? "";

  if (!stripeCustomerId) {
    // ── Step 2: Create a new Stripe customer ────────────────────────────
    console.log(`[Stripe] No existing customer — creating one for userId: ${userId}`);
    const customer = await stripe.customers.create({
      email,
      metadata: { userId },
    });
    stripeCustomerId = customer.id;
    console.log(`[Stripe] Customer created: ${stripeCustomerId} for userId: ${userId}`);

    // Persist immediately so future calls and webhook lookups are idempotent.
    const { error: updateError } = await supabase
      .from("member")
      .update({ stripe_customer_id: stripeCustomerId })
      .eq("id", userId);

    if (updateError) {
      // Hard throw: if we can't persist the customer ID, the subscription.created
      // webhook will silently update 0 rows. checkout.session.completed is the
      // safety net, but we should still fail loudly here.
      throw new Error(
        `[Stripe] Failed to persist stripe_customer_id for userId ${userId}: ${updateError.message}. ` +
          `Aborting checkout to prevent orphaned Stripe customer.`
      );
    }

    console.log(`[Stripe] stripe_customer_id persisted for userId: ${userId}`);
  } else {
    console.log(`[Stripe] Existing customer: ${stripeCustomerId} for userId: ${userId}`);
  }

  // ── Step 3: Resolve Level 1 monthly price ID ────────────────────────────
  const priceId = config.stripe.prices.level1Monthly;

  if (!priceId) {
    throw new Error(
      "[Stripe] STRIPE_PRICE_LEVEL_1_MONTHLY is not set. " +
        "Add it to .env.local to enable checkout."
    );
  }

  const appUrl = config.app.url;

  // ── Step 4: Create Stripe Checkout Session ──────────────────────────────
  console.log(`[Stripe] Creating checkout session — customer: ${stripeCustomerId}, price: ${priceId}`);

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: stripeCustomerId,
    // client_reference_id lets checkout.session.completed find the member
    // row by userId even if stripe_customer_id lookup fails on the webhook.
    client_reference_id: userId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/subscribe`,
    subscription_data: {
      metadata: { userId },
    },
    metadata: { userId },
  });

  if (!session.url) {
    throw new Error(
      "[Stripe] Checkout session was created but has no URL. " +
        "Ensure the Stripe account is not in restricted mode."
    );
  }

  console.log(`[Stripe] Checkout session created: ${session.id} for userId: ${userId}`);
  return { url: session.url };
}
