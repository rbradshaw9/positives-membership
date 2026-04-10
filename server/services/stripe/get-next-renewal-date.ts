import { getStripe } from "@/lib/stripe/config";

export async function getNextRenewalDate(
  stripeCustomerId: string | null | undefined
): Promise<string | null> {
  if (!stripeCustomerId) return null;

  try {
    const stripe = getStripe();
    const subscriptions = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      status: "all",
      limit: 10,
    });

    const subscription = subscriptions.data.find((item) =>
      ["active", "trialing", "past_due", "unpaid", "paused"].includes(item.status)
    );

    const renewalAt = subscription?.items.data[0]?.current_period_end ?? null;
    if (!renewalAt) return null;

    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(new Date(renewalAt * 1000));
  } catch (error) {
    console.error("[account] Failed to load next renewal date:", error);
    return null;
  }
}
