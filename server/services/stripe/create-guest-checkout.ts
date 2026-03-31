import { getStripe } from "@/lib/stripe/config";
import { config } from "@/lib/config";

/**
 * server/services/stripe/create-guest-checkout.ts
 * Creates a Stripe Checkout Session for guest (unauthenticated) visitors.
 *
 * This is the payment-first onboarding path:
 *   1. Visitor selects a plan on /join
 *   2. We create a Checkout Session WITHOUT a pre-existing Stripe customer
 *      or a Supabase userId — Stripe collects email and payment details
 *   3. After payment, checkout.session.completed fires and the webhook
 *      creates the Supabase account from the email Stripe collected
 *
 * Key differences from createCheckoutSession (auth-first path):
 *   - No userId required
 *   - No Stripe customer pre-created — customer_creation: "always" tells
 *     Stripe to create the customer during checkout so session.customer is
 *     always a valid customer ID in the webhook
 *   - No client_reference_id — the absence of this field is how the webhook
 *     detects it's a guest checkout and routes to the new signup path
 *   - cancel_url goes to /join (not /subscribe) so the visitor can re-select
 *
 * Called from: app/join/actions.ts → startGuestCheckout
 * Never called from client code.
 */

export async function createGuestCheckoutSession(
  priceId: string
): Promise<{ url: string }> {
  const stripe = getStripe();

  // Resolve price — the caller must pass a valid priceId.
  // No fallback here: guest checkout always has an explicit selection.
  if (!priceId) {
    throw new Error(
      "[Stripe] createGuestCheckoutSession: priceId is required. " +
        "The caller must pass a specific Stripe price ID."
    );
  }

  const appUrl = config.app.url;

  console.log(
    `[Stripe] Creating guest checkout session — priceId: ${priceId}`
  );

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",

    // For subscription mode, Stripe always creates a customer automatically.
    // session.customer is guaranteed to be populated in the webhook.
    // (customer_creation: "always" is only valid in payment mode — not here.)

    line_items: [{ price: priceId, quantity: 1 }],

    // IMPORTANT: Do NOT set client_reference_id.
    // Its absence is the signal in handle-checkout.ts that this is a guest
    // checkout and account creation must happen from email, not userId.

    success_url: `${appUrl}/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/join`,

    // Allow Stripe to show a promotional code field
    allow_promotion_codes: true,
  });

  if (!session.url) {
    throw new Error(
      "[Stripe] Guest checkout session was created but has no URL. " +
        "Ensure the Stripe account is not in restricted mode."
    );
  }

  console.log(
    `[Stripe] Guest checkout session created: ${session.id} — priceId: ${priceId}`
  );

  return { url: session.url };
}
