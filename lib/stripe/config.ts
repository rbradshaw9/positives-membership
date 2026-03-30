import Stripe from "stripe";

/**
 * lib/stripe/config.ts
 * Initialized Stripe SDK instance.
 * Server-only — do not import in client components.
 */
export function getStripe(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error(
      "[Positives] STRIPE_SECRET_KEY is not set. " +
        "Add it to .env.local to use Stripe functionality."
    );
  }

  return new Stripe(secretKey, {
    apiVersion: "2026-03-25.dahlia",
    typescript: true,
  });
}
