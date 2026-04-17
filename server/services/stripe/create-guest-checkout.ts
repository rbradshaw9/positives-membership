import { getStripe } from "@/lib/stripe/config";
import { config } from "@/lib/config";
import type { LaunchCohort } from "@/lib/launch/context";

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
 *   - client_reference_id is intentionally left unused in this path so the
 *     guest flow stays clean and the webhook can rely on metadata.guest.
 *   - cancel_url goes to /join (not /subscribe) so the visitor can re-select
 *
 * Called from: app/join/actions.ts → startGuestCheckout
 * Never called from client code.
 */

type CheckoutMode = "paid" | "trial_7_day";

type CreateGuestCheckoutOptions = {
  fprRefId?: string | null;
  checkoutMode?: CheckoutMode;
  sourcePath?: string | null;
  launchCohort?: LaunchCohort;
  launchSource?: string | null;
  launchCampaignCode?: string | null;
};

export async function createGuestCheckoutSession(
  priceId: string,
  options: CreateGuestCheckoutOptions = {}
): Promise<{ url: string }> {
  const stripe = getStripe();
  const checkoutMode = options.checkoutMode ?? "paid";
  const trialDays = checkoutMode === "trial_7_day" ? 7 : 0;
  const fprRefId = options.fprRefId ?? null;
  const sourcePath = options.sourcePath?.trim() || "/join";
  const launchCohort = options.launchCohort ?? "live";
  const launchSource = options.launchSource?.trim() || "public_join";
  const launchCampaignCode = options.launchCampaignCode?.trim() || null;

  // Resolve price — the caller must pass a valid priceId.
  // No fallback here: guest checkout always has an explicit selection.
  if (!priceId) {
    throw new Error(
      "[Stripe] createGuestCheckoutSession: priceId is required. " +
        "The caller must pass a specific Stripe price ID."
    );
  }

  const appUrl = config.app.url;
  const normalizedSourcePath =
    sourcePath.startsWith("/") && !sourcePath.startsWith("//") ? sourcePath : "/join";

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
    payment_method_collection: "always",

    // For subscription mode, Stripe always creates a customer automatically.
    // session.customer is guaranteed to be populated in the webhook.

    line_items: [{ price: priceId, quantity: 1 }],

    // FirstPromoter affiliate attribution:
    // When a visitor arrives via an affiliate link (?fpr=code), PricingCard
    // reads the active FP referral cookie (`_fprom_ref` in production,
    // `_fprom_track` as a compatibility fallback) and submits it as the
    // 'fpr' form field.
    // We embed it in Stripe metadata so the webhook can:
    //   1. Store it permanently on member.referred_by_fpr (never expires)
    //   2. Later use it to link the member as a child promoter in FP when
    //      they join the affiliate program (enables override commission)
    //
    // NOTE: We use metadata.fpr (not client_reference_id) so the auth-first
    // path can keep using metadata.userId without overloading referral logic.
    metadata: {
      guest: "true",
      priceId,
      checkoutMode,
      sourcePath,
      launchCohort,
      launchSource,
      ...(launchCampaignCode ? { launchCampaignCode } : {}),
      ...(trialDays > 0 ? { trialDays: String(trialDays) } : {}),
      ...(fprRefId ? { fpr: fprRefId } : {}),
    },

    success_url: `${appUrl}/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}${normalizedSourcePath}`,

    ...(trialDays > 0
      ? {
          subscription_data: {
            trial_period_days: trialDays,
          },
        }
      : {}),

    branding_settings: {
      background_color: "#FAFAFA",
      border_style: "rounded",
      button_color: "#2EC4B6",
      display_name: "Positives",
      font_family: "montserrat",
      icon: {
        type: "url",
        url: `${appUrl}/logos/png/positives-logos_positives-icon-square.png`,
      },
      logo: {
        type: "url",
        url: `${appUrl}/logos/png/positives-logos_Positives-logo-full.png`,
      },
    },

    custom_text: {
      after_submit: {
        message:
          trialDays > 0
            ? "Your 7-day free trial starts right away, and your first daily practice will be waiting inside."
            : "Your first daily practice will be waiting for you inside Positives right after checkout.",
      },
      submit: {
        message:
          trialDays > 0
            ? "Start with 7 days free. Your card is saved now and billing begins automatically unless you cancel before the trial ends."
            : "Every membership includes a 30-day money-back guarantee and immediate access to today's practice.",
      },
    },

    locale: "auto",

    // Store phone on the AC contact profile. This is not SMS marketing consent.
    phone_number_collection: { enabled: true },

    name_collection: {
      individual: {
        enabled: true,
        optional: false,
      },
    },

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
