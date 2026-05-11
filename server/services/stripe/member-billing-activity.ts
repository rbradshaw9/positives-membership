import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/config";

export type MemberStripeInvoiceActivity = {
  id: string;
  number: string | null;
  status: string | null;
  amountDueCents: number;
  amountPaidCents: number;
  currency: string;
  hostedInvoiceUrl: string | null;
  invoicePdfUrl: string | null;
  createdAt: string;
  paidAt: string | null;
};

function toIso(seconds: number | null | undefined) {
  return seconds ? new Date(seconds * 1000).toISOString() : null;
}

function formatInvoice(invoice: Stripe.Invoice): MemberStripeInvoiceActivity {
  return {
    id: invoice.id,
    number: invoice.number ?? null,
    status: invoice.status ?? null,
    amountDueCents: invoice.amount_due ?? 0,
    amountPaidCents: invoice.amount_paid ?? 0,
    currency: (invoice.currency ?? "usd").toLowerCase(),
    hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
    invoicePdfUrl: invoice.invoice_pdf ?? null,
    createdAt: toIso(invoice.created) ?? new Date().toISOString(),
    paidAt: toIso(invoice.status_transitions.paid_at),
  };
}

export async function getMemberRecentStripeInvoices(
  stripeCustomerId: string | null | undefined,
  limit = 8
): Promise<MemberStripeInvoiceActivity[]> {
  if (!stripeCustomerId) return [];

  const stripe = getStripe();
  const invoices = await stripe.invoices.list({
    customer: stripeCustomerId,
    limit,
  });

  return invoices.data.map(formatInvoice);
}
