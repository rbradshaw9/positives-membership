import { config } from "@/lib/config";
import { getStripe } from "@/lib/stripe/config";
import { isStripeResourceMissingError } from "@/lib/stripe/errors";
import type { Enums } from "@/types/supabase";

type BillingPortalSessionResult =
  | { ok: true; url: string }
  | { ok: false; reason: "customer_missing" | "stripe_error"; message: string };

function portalConfigId(tier: Enums<"subscription_tier"> | null | undefined): string | undefined {
  const isHigherTier = tier && tier !== "level_1";
  const id = isHigherTier ? config.stripe.portal.configL2Plus : config.stripe.portal.configL1;
  return id || undefined;
}

export async function createBillingPortalSessionUrl(
  stripeCustomerId: string,
  returnUrl = `${config.app.url}/account`,
  subscriptionTier?: Enums<"subscription_tier"> | null
): Promise<BillingPortalSessionResult> {
  try {
    const stripe = getStripe();
    const configurationId = portalConfigId(subscriptionTier);
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl,
      ...(configurationId ? { configuration: configurationId } : {}),
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
