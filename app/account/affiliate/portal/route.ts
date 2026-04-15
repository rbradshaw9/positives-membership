/**
 * app/account/affiliate/portal/route.ts
 *
 * GET /account/affiliate/portal
 *
 * Returns the affiliate dashboard URL for the current member.
 *
 * Affiliates log in directly at positives.firstpromoter.com using the email
 * address they registered with. This route returns the portal URL as JSON so
 * the client can navigate there via window.location.href.
 */

import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const cookieStore = await cookies();

  // ── Authenticate ──────────────────────────────────────────────────────────
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Verify member is an affiliate ─────────────────────────────────────────
  const admin = getAdminClient();
  const { data: member } = await admin
    .from("member")
    .select("fp_promoter_id, paypal_email")
    .eq("id", user.id)
    .single();

  if (!member?.fp_promoter_id) {
    return NextResponse.json({ error: "Not an affiliate" }, { status: 404 });
  }

  if (!member.paypal_email?.trim()) {
    return NextResponse.json(
      {
        error:
          "Add your payout email in the Positives affiliate portal before opening the FirstPromoter dashboard.",
      },
      { status: 403 }
    );
  }

  // ── Return the affiliate dashboard URL ───────────────────────────────────
  // FP affiliates log in at the subdomain configured for the brand.
  const portalUrl = "https://positives.firstpromoter.com";
  return NextResponse.json({ url: portalUrl });
}
