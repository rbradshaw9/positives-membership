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
  fprRefId?: string | null
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

  // Guard: Stripe rejects relative or placeholder URLs with an opaque
  // "Not a valid URL" error. Catch it early with an actionable message.
  try {
    const parsed = new URL(appUrl);
    if (!["https:", "http:"].includes(parsed.protocol)) {
      throw new Error("invalid protocol");
    }
  } catch {
    throw new Error(
      `[Stripe] NEXT_PUBLIC_APP_URL is not a valid absolute URL: "${appUrl}". ` +
        `Set it to "https://positives.life" in Vercel environment variables.`
    );
  }

  console.log(
    `[Stripe] Creating guest checkout session — priceId: ${priceId}${fprRefId ? ` fpr: ${fprRefId}` : ""}`
  );

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",

    // For subscription mode, Stripe always creates a customer automatically.
    // session.customer is guaranteed to be populated in the webhook.

    line_items: [{ price: priceId, quantity: 1 }],

    // FirstPromoter affiliate attribution:
    // When a visitor arrives via an affiliate link (?fpr=code), PricingCard
    // reads the _fprom_track cookie and submits it as the 'fpr' form field.
    // We embed it in Stripe metadata so the webhook can:
    //   1. Store it permanently on member.referred_by_fpr (never expires)
    //   2. Later use it to link the member as a child promoter in FP when
    //      they join the affiliate program (enables override commission)
    //
    // NOTE: We use metadata.fpr (not client_reference_id) so client_reference_id
    // remains available for Supabase userId in the auth-first path (Path A).
    metadata: {
      guest: "true",
      priceId,
      ...(fprRefId ? { fpr: fprRefId } : {}),
    },

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
