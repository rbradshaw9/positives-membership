import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/config";
import { config } from "@/lib/config";

/**
 * POST /api/stripe/coaching-checkout
 *
 * Creates a Stripe Checkout session for a coaching pack purchase.
 * Requires the member to be authenticated.
 *
 * Body:
 *   { packType: "single" | "punch_pass" }
 *
 * Returns:
 *   { url: string }  — Stripe Checkout URL
 *
 * After payment, the Stripe webhook (handle-checkout.ts) handles:
 *   - Creating the coaching_session_pack row
 *   - Syncing the coaching_client tag in ActiveCampaign
 */
export async function POST(req: NextRequest) {
  // ── Authenticate ────────────────────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const userId = user.id;

  // ── Parse body ───────────────────────────────────────────────────────────
  let packType: "single" | "punch_pass";
  try {
    const body = await req.json();
    if (body.packType !== "single" && body.packType !== "punch_pass") {
      return NextResponse.json({ error: "Invalid pack type." }, { status: 400 });
    }
    packType = body.packType;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  // ── Resolve price ID ─────────────────────────────────────────────────────
  const priceId =
    packType === "single"
      ? config.stripe.prices.coachingSingle
      : config.stripe.prices.coachingPunchPass;

  if (!priceId) {
    console.error(`[CoachingCheckout] Missing price ID for pack_type: ${packType}`);
    return NextResponse.json(
      { error: "Coaching checkout is not yet configured. Please contact support." },
      { status: 503 }
    );
  }

  // ── Get member's Stripe customer ID ──────────────────────────────────────
  const admin = getAdminClient();
  const { data: member, error: memberError } = await admin
    .from("member")
    .select("email, name, stripe_customer_id")
    .eq("id", userId)
    .single();

  if (memberError || !member) {
    console.error(`[CoachingCheckout] Member not found: ${userId}`);
    return NextResponse.json({ error: "Member record not found." }, { status: 404 });
  }

  // ── Create Stripe Checkout session ───────────────────────────────────────
  const stripe = getStripe();
  const appUrl = config.app.url;

  try {
    // Ensure or create Stripe customer for this member
    let customerId = member.stripe_customer_id ?? undefined;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: member.email ?? undefined,
        name: member.name ?? undefined,
        metadata: { supabase_user_id: userId },
      });
      customerId = customer.id;
      // Persist for future purchases
      await admin
        .from("member")
        .update({ stripe_customer_id: customerId })
        .eq("id", userId);
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/account/coaching?purchase=success&pack=${packType}`,
      cancel_url: `${appUrl}/account/coaching?purchase=canceled`,
      metadata: {
        purchase_type: "coaching_pack",
        pack_type: packType,
        member_id: userId,
      },
      payment_intent_data: {
        metadata: {
          purchase_type: "coaching_pack",
          pack_type: packType,
          member_id: userId,
        },
      },
    });

    console.log(
      `[CoachingCheckout] Session created — userId: ${userId}, packType: ${packType}, session: ${checkoutSession.id}`
    );

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[CoachingCheckout] Stripe session creation failed: ${message}`);
    return NextResponse.json(
      { error: "Could not create checkout session. Please try again." },
      { status: 500 }
    );
  }
}
