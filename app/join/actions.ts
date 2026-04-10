"use server";

import { createGuestCheckoutSession } from "@/server/services/stripe/create-guest-checkout";

/**
 * app/join/actions.ts
 * Server Actions for the /join page.
 *
 * Pass 3 cleanup: auth-first actions removed. Only the guest checkout path
 * remains since payment-first onboarding is now the only supported entry.
 *
 * The full flow:
 *   visitor selects plan → getGuestCheckoutUrl → Stripe Checkout
 *   → payment succeeds → webhook creates account + login token
 *   → /subscribe/success polls /api/auth/exchange → verifyOtp → /today
 *
 * NOTE on redirect() vs URL return:
 *   We intentionally return the Stripe URL from the server action and let
 *   the client navigate via window.location.href rather than calling
 *   redirect() server-side. Next.js 16's RSC redirect mechanism is designed
 *   for internal route navigation; redirecting to external domains (e.g.
 *   checkout.stripe.com) is unreliable in this path. Returning the URL and
 *   doing a full browser navigation avoids the issue entirely.
 *
 * FirstPromoter affiliate tracking:
 *   The FP JS snippet sets a referral cookie when a visitor arrives via an
 *   affiliate link (?fpr=code). Production currently exposes `_fprom_ref`,
 *   with `_fprom_track` retained as a compatibility fallback. PricingCard
 *   reads this client-side
 *   and submits it as a hidden 'fpr' field. We embed it in Stripe checkout
 *   metadata so the webhook can permanently store it on the member row for
 *   lifetime affiliate genealogy linking (not cookie/time dependent).
 */

export type CheckoutResult =
  | { url: string; error?: never }
  | { url?: never; error: string };

type CheckoutMode = "paid" | "trial_7_day";

/**
 * Returns the Stripe Checkout URL (or an error string).
 * The caller (PricingCard) does the navigation via window.location.href.
 * This avoids Next.js 16's RSC redirect unreliability for external URLs.
 */
export async function getGuestCheckoutUrl(
  formData: FormData
): Promise<CheckoutResult> {
  const priceId = (formData.get("priceId") as string | null)?.trim();
  const checkoutMode = ((formData.get("checkoutMode") as string | null)?.trim() ??
    "paid") as CheckoutMode;
  const sourcePath = (formData.get("sourcePath") as string | null)?.trim() || "/join";

  if (!priceId) {
    return { error: "No plan selected. Please choose a plan and try again." };
  }

  // FirstPromoter ref_id — submitted as hidden 'fpr' input by PricingCard.
  // Set when visitor arrived via an affiliate link (?fpr=code).
  // Stored permanently on member row for lifetime affiliate genealogy.
  const fprRefId = (formData.get("fpr") as string | null)?.trim() || null;

  if (fprRefId) {
    console.log(`[Join] FirstPromoter referral detected — fpr: ${fprRefId}`);
  }

  console.log(
    `[Join] Guest checkout initiated — priceId: ${priceId}, mode: ${checkoutMode}, source: ${sourcePath}`
  );

  try {
    const { url } = await createGuestCheckoutSession(priceId, {
      fprRefId,
      checkoutMode,
      sourcePath,
    });
    console.log(`[Join] Stripe session created — redirecting to checkout`);
    return { url };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Join] Guest checkout creation failed:", message);
    return { error: "Could not start checkout. Please try again." };
  }
}

// ── Legacy aliases — kept so any other callers don't break ────────────────

/** @deprecated Use getGuestCheckoutUrl instead */
export async function startGuestCheckout(
  _prev: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  return getGuestCheckoutUrl(formData);
}

/** @deprecated Use getGuestCheckoutUrl instead */
export async function startGuestCheckoutFormAction(
  formData: FormData
): Promise<void> {
  await getGuestCheckoutUrl(formData);
}
