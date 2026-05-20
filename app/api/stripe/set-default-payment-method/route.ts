/**
 * POST /api/stripe/set-default-payment-method
 *
 * After a SetupIntent succeeds, makes its card the default for the customer
 * and the active subscription (so renewals charge the new card).
 *
 * Body: { token?: string, setupIntentId: string }
 * Returns: { ok: true }
 */

import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/config";
import { resolveBillingContext } from "@/lib/billing/resolve-billing-context";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const { token, setupIntentId } = (await request.json().catch(() => ({}))) as {
    token?: string;
    setupIntentId?: string;
  };

  if (!setupIntentId) {
    return NextResponse.json({ error: "setupIntentId is required" }, { status: 400 });
  }

  const ctx = await resolveBillingContext(token);
  if (!ctx || !ctx.customerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const stripe = getStripe();

    // Resolve the payment method from the SetupIntent
    const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
    const pmId =
      typeof setupIntent.payment_method === "string"
        ? setupIntent.payment_method
        : setupIntent.payment_method?.id ?? null;

    if (setupIntent.status !== "succeeded" || !pmId) {
      return NextResponse.json(
        { error: "Card was not confirmed. Please try again." },
        { status: 400 }
      );
    }

    // Guard: the SetupIntent must belong to this customer
    const intentCustomer =
      typeof setupIntent.customer === "string"
        ? setupIntent.customer
        : setupIntent.customer?.id ?? null;
    if (intentCustomer !== ctx.customerId) {
      return NextResponse.json({ error: "Mismatched customer" }, { status: 403 });
    }

    // Set as the customer's default for future invoices
    await stripe.customers.update(ctx.customerId, {
      invoice_settings: { default_payment_method: pmId },
    });

    // Set on the active subscription too, so renewals use the new card
    const subs = await stripe.subscriptions.list({
      customer: ctx.customerId,
      status: "all",
      limit: 10,
    });
    const activeSub = subs.data.find((s) =>
      ["active", "trialing", "past_due", "unpaid"].includes(s.status)
    );
    if (activeSub) {
      await stripe.subscriptions.update(activeSub.id, {
        default_payment_method: pmId,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[set-default-payment-method]", error);
    return NextResponse.json(
      { error: "Card saved but could not be set as default. Contact support." },
      { status: 500 }
    );
  }
}
