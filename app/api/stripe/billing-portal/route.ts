import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/config";
import { config } from "@/lib/config";

/**
 * app/api/stripe/billing-portal/route.ts
 * POST — creates a Stripe Billing Portal session for the authenticated member.
 *
 * The Billing Portal must be configured in the Stripe Dashboard:
 *   Dashboard → Billing → Customer portal → Configure
 *   Enable: invoices, payment methods, subscription cancellation
 *
 * Called by: app/(member)/account/billing-button.tsx
 */
export async function POST() {
  const supabase = await createClient();

  // 1. Verify the caller is an authenticated user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Look up their Stripe customer ID
  const { data: member, error: memberError } = await supabase
    .from("member")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  if (memberError || !member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  if (!member.stripe_customer_id) {
    return NextResponse.json(
      { error: "No billing account linked to this member" },
      { status: 422 }
    );
  }

  // 3. Create the portal session
  const stripe = getStripe();
  const returnUrl = `${config.app.url}/account`;

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: member.stripe_customer_id,
      return_url: returnUrl,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stripe error";
    console.error("[billing-portal] Failed to create portal session:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
