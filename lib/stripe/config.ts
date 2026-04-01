import Stripe from "stripe";
import { config } from "@/lib/config";

/**
 * lib/stripe/config.ts
 * Initialized Stripe SDK instance.
 * Server-only — do not import in client components.
 *
 * Reads STRIPE_SECRET_KEY via lib/config.ts (the single env-access layer)
 * rather than process.env directly, keeping config access consistent.
 */
export function getStripe(): Stripe {
  return new Stripe(config.stripe.secretKey, {
    apiVersion: "2026-03-25.dahlia",
    typescript: true,
  });
}
