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
 *   - client_reference_id is ONLY set when a Rewardful referral token is
 *     present. Its absence (without a referral) still routes to the guest
 *     checkout path in the webhook via the metadata.guest flag.
 *   - cancel_url goes to /join (not /subscribe) so the visitor can re-select
 *
 * Called from: app/join/actions.ts → startGuestCheckout
 * Never called from client code.
 */

export async function createGuestCheckoutSession(
  priceId: string,
  referralId?: string | null
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
    `[Stripe] Creating guest checkout session — priceId: ${priceId}${referralId ? ` referralId: ${referralId}` : ""}`
  );

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",

    // For subscription mode, Stripe always creates a customer automatically.
    // session.customer is guaranteed to be populated in the webhook.

    line_items: [{ price: priceId, quantity: 1 }],

    // Rewardful affiliate attribution:
    // When a visitor arrives via an affiliate link, Rewardful JS sets a
    // cookie containing their referral token. The join page reads the cookie
    // client-side and passes it here via formData. Setting it as
    // client_reference_id lets Rewardful auto-detect the conversion via
    // their Stripe webhook listener — no explicit API call needed.
    //
    // When there's no referral, we omit client_reference_id and use the
    // metadata.guest flag to signal guest checkout to the webhook handler.
    ...(referralId
      ? { client_reference_id: referralId }
      : { metadata: { guest: "true" } }),

    success_url: `${appUrl}/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/join`,

    // Collect phone number — passed to ActiveCampaign for SMS marketing
    phone_number_collection: { enabled: true },

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
