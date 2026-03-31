"use server";

import { redirect } from "next/navigation";
import { createGuestCheckoutSession } from "@/server/services/stripe/create-guest-checkout";

/**
 * app/join/actions.ts
 * Server Actions for the /join page.
 *
 * Pass 3 cleanup: auth-first actions removed. Only the guest checkout path
 * remains since payment-first onboarding is now the only supported entry.
 *
 * The full flow:
 *   visitor selects plan → startGuestCheckoutFormAction → Stripe Checkout
 *   → payment succeeds → webhook creates account + login token
 *   → /subscribe/success polls /api/auth/exchange → verifyOtp → /today
 */

type ActionResult = { error?: string };

// ── Guest checkout: payment-first, no prior auth required ─────────────────

/**
 * useActionState-compatible variant (two-arg).
 * Used when you need to thread state through useActionState.
 */
export async function startGuestCheckout(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  return _startGuestCheckoutCore(formData);
}

/**
 * Single-arg form action variant — compatible with <form action={...}>.
 * Use this when no state threading is needed (e.g. PricingCard).
 * Redirects on success; throws on unrecoverable error.
 */
export async function startGuestCheckoutFormAction(
  formData: FormData
): Promise<void> {
  await _startGuestCheckoutCore(formData);
}

// ── Shared implementation ──────────────────────────────────────────────────

async function _startGuestCheckoutCore(
  formData: FormData
): Promise<ActionResult> {
  const priceId = (formData.get("priceId") as string | null)?.trim();

  if (!priceId) {
    return { error: "No plan selected. Please choose a plan and try again." };
  }

  console.log(`[Join] Guest checkout initiated — priceId: ${priceId}`);

  // IMPORTANT: Next.js redirect() works by throwing a special NEXT_REDIRECT
  // error internally. It MUST NOT be inside a try/catch that catches all errors,
  // or the catch block will swallow the redirect and nothing happens.
  let checkoutUrl: string;
  try {
    const { url } = await createGuestCheckoutSession(priceId);
    checkoutUrl = url;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Join] Guest checkout creation failed:", message);
    return { error: "Could not start checkout. Please try again." };
  }

  redirect(checkoutUrl);
}
