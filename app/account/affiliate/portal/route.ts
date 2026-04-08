/**
 * app/account/affiliate/portal/route.ts
 *
 * GET /account/affiliate/portal
 *
 * One-click SSO redirect to the member's Rewardful affiliate dashboard.
 *
 * Flow:
 *  1. Verify the member is authenticated
 *  2. Look up their cached rewardful_affiliate_id
 *  3. Call GET /v1/affiliates/:id/sso → returns a one-time URL (60s expiry)
 *  4. Immediately redirect to that URL
 *
 * ⚠️  The magic link expires in 60 seconds — we NEVER store or embed it.
 *     This route must be the direct click target; open in new tab is fine.
 */

import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getAffiliateSSO } from "@/lib/rewardful/client";
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
    return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL));
  }

  // ── Get affiliate ID from member row ──────────────────────────────────────
  const admin = getAdminClient();
  const { data: member } = await admin
    .from("member")
    .select("rewardful_affiliate_id")
    .eq("id", user.id)
    .single();

  if (!member?.rewardful_affiliate_id) {
    // Not yet an affiliate — redirect back to account with a prompt
    return NextResponse.redirect(
      new URL("/account?affiliate=setup", process.env.NEXT_PUBLIC_APP_URL)
    );
  }

  // ── Generate magic link and redirect ─────────────────────────────────────
  try {
    const sso = await getAffiliateSSO(member.rewardful_affiliate_id);
    return NextResponse.redirect(sso.url);
  } catch (err) {
    console.error("[Affiliate SSO] Failed to generate magic link:", err);
    // Fallback: send them to the generic Rewardful login
    return NextResponse.redirect("https://app.getrewardful.com/login");
  }
}
