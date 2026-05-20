import { getStripe } from "@/lib/stripe/config";
import { isStripeResourceMissingError } from "@/lib/stripe/errors";

export type CardOnFile = {
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
};

/**
 * Returns the customer's default card, or null if none on file.
 * Prefers invoice_settings.default_payment_method; falls back to the
 * most recently attached card.
 */
export async function getDefaultPaymentMethod(
  customerId: string
): Promise<CardOnFile | null> {
  const stripe = getStripe();

  try {
    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted) return null;

    const defaultPm = customer.invoice_settings?.default_payment_method;
    let pmId = typeof defaultPm === "string" ? defaultPm : defaultPm?.id ?? null;

    if (!pmId) {
      const list = await stripe.paymentMethods.list({
        customer: customerId,
        type: "card",
        limit: 1,
      });
      pmId = list.data[0]?.id ?? null;
    }

    if (!pmId) return null;

    const pm = await stripe.paymentMethods.retrieve(pmId);
    if (!pm.card) return null;

    return {
      brand: pm.card.brand,
      last4: pm.card.last4,
      expMonth: pm.card.exp_month,
      expYear: pm.card.exp_year,
    };
  } catch (error) {
    if (isStripeResourceMissingError(error)) return null;
    console.error("[getDefaultPaymentMethod]", error);
    return null;
  }
}
