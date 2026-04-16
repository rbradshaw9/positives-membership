import { config } from "@/lib/config";
import { getStripe } from "@/lib/stripe/config";
import { isStripeResourceMissingError } from "@/lib/stripe/errors";

type BillingPortalSessionResult =
  | { ok: true; url: string }
  | { ok: false; reason: "customer_missing" | "stripe_error"; message: string };

export async function createBillingPortalSessionUrl(
  stripeCustomerId: string,
  returnUrl = `${config.app.url}/account`
): Promise<BillingPortalSessionResult> {
  try {
    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl,
    });

    return { ok: true, url: session.url };
  } catch (error) {
    if (isStripeResourceMissingError(error)) {
      return {
        ok: false,
        reason: "customer_missing",
        message: `Stripe customer ${stripeCustomerId} is missing.`,
      };
    }

    const message = error instanceof Error ? error.message : "Stripe error";
    return {
      ok: false,
      reason: "stripe_error",
      message,
    };
  }
}
