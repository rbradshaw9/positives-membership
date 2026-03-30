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
 * 3. Stripe metadata includes userId for traceability
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

  let stripeCustomerId: string = member?.stripe_customer_id ?? "";

  if (!stripeCustomerId) {
    // ── Step 2: Create a new Stripe customer ────────────────────────────
    const customer = await stripe.customers.create({
      email,
      metadata: { userId },
    });
    stripeCustomerId = customer.id;

    // Persist immediately so future calls are idempotent.
    const { error: updateError } = await supabase
      .from("member")
      .update({ stripe_customer_id: stripeCustomerId })
      .eq("id", userId);

    if (updateError) {
      // Log but don't abort — the checkout can still proceed.
      // The customer ID will be in Stripe and can be reconciled manually.
      console.error(
        `[Stripe] Failed to persist stripe_customer_id for userId ${userId}: ${updateError.message}`
      );
    }
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
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: stripeCustomerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/subscribe`,
    // Attach userId to subscription metadata for webhook traceability
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

  return { url: session.url };
}
