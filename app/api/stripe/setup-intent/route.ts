/**
 * POST /api/stripe/setup-intent
 *
 * Creates a Stripe SetupIntent so the member can add/update a card via the
 * embedded Payment Element. Works in both session and token mode.
 *
 * Body: { token?: string }
 * Returns: { clientSecret }
 */

import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/config";
import { resolveBillingContext } from "@/lib/billing/resolve-billing-context";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const { token } = (await request.json().catch(() => ({}))) as { token?: string };

  const ctx = await resolveBillingContext(token);
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!ctx.customerId) {
    return NextResponse.json(
      { error: "No billing account is linked to this member." },
      { status: 422 }
    );
  }

  try {
    const stripe = getStripe();
    const setupIntent = await stripe.setupIntents.create({
      customer: ctx.customerId,
      payment_method_types: ["card"],
      usage: "off_session", // card will be charged for future subscription renewals
    });

    return NextResponse.json({ clientSecret: setupIntent.client_secret });
  } catch (error) {
    console.error("[setup-intent]", error);
    return NextResponse.json(
      { error: "Could not start card update. Please try again." },
      { status: 500 }
    );
  }
}
