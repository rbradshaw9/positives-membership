/**
 * app/account/billing/route.ts
 *
 * GET /account/billing?token=<signed_token>
 * GET /account/billing  (fallback — requires Supabase session)
 *
 * One-click path from payment-failed email → Stripe Billing Portal.
 *
 * Happy path (token present + valid):
 *   1. Verify HMAC-signed token (7-day expiry — covers Day 0/3/7 emails)
 *   2. Create Stripe Billing Portal session using stripeCustomerId from token
 *   3. Redirect directly to Stripe — no login required
 *
 * Fallback (no token, or expired):
 *   - Authenticated session → redirect to Stripe portal (same as happy path)
 *   - Not authenticated → /login?next=/account/billing (Supabase magic link)
 *
 * After Stripe → returns to /account
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/config";
import { config } from "@/lib/config";
import { verifyBillingToken } from "@/lib/auth/billing-token";

const RETURN_URL = `${config.app.url}/account`;

async function createPortalSession(stripeCustomerId: string): Promise<string> {
  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: RETURN_URL,
  });
  return session.url;
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  // ── Token path (email link, no login required) ───────────────────────────
  if (token) {
    const result = verifyBillingToken(token);

    if (result.ok) {
      try {
        const portalUrl = await createPortalSession(
          result.payload.stripeCustomerId
        );
        return NextResponse.redirect(portalUrl);
      } catch (err) {
        console.error("[billing-redirect] Stripe portal session failed:", err);
        // Fall through to session-based auth below
      }
    } else if (result.reason === "expired") {
      // Token expired — redirect to login with next param so they end up here
      // (minus the token, which would just fail again)
      return NextResponse.redirect(
        new URL("/login?next=/account/billing", config.app.url)
      );
    }
    // Invalid token — fall through to session-based auth
  }

  // ── Session path (already logged in, or fallback) ────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.redirect(
      new URL("/login?next=/account/billing", config.app.url)
    );
  }

  const { data: member } = await supabase
    .from("member")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  if (!member?.stripe_customer_id) {
    return NextResponse.redirect(new URL("/account", config.app.url));
  }

  try {
    const portalUrl = await createPortalSession(member.stripe_customer_id);
    return NextResponse.redirect(portalUrl);
  } catch (err) {
    console.error("[billing-redirect] Stripe portal session failed:", err);
    return NextResponse.redirect(new URL("/account", config.app.url));
  }
}
