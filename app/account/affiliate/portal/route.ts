/**
 * app/account/affiliate/portal/route.ts
 *
 * GET /account/affiliate/portal
 *
 * Returns a one-time SSO URL for the member's Rewardful affiliate dashboard.
 *
 * Returns JSON { url } instead of a server-side redirect.
 *
 * WHY: Rewardful's portal (positives.getrewardful.com) sits behind Cloudflare
 * bot protection. Opening the SSO URL via window.open() with "noopener,noreferrer"
 * strips the Referer header and detaches the browsing context — both signals
 * Cloudflare uses to flag traffic as automated. The Cloudflare challenge then
 * loops indefinitely because it can never fully trust the session.
 *
 * The client receives the URL and navigates via window.location.href (same tab).
 * This carries the full browser session: cookies, referrer, and browsing history —
 * all signals Cloudflare uses to confirm a real user, bypassing the challenge.
 *
 * ⚠️  The magic link expires in 60 seconds — never persist or log it.
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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Get affiliate ID from member row ──────────────────────────────────────
  const admin = getAdminClient();
  const { data: member } = await admin
    .from("member")
    .select("rewardful_affiliate_id")
    .eq("id", user.id)
    .single();

  if (!member?.rewardful_affiliate_id) {
    return NextResponse.json({ error: "Not an affiliate" }, { status: 404 });
  }

  // ── Generate magic link and return as JSON ────────────────────────────────
  try {
    const sso = await getAffiliateSSO(member.rewardful_affiliate_id);
    return NextResponse.json({ url: sso.url });
  } catch (err) {
    console.error("[Affiliate SSO] Failed to generate magic link:", err);
    // Fallback URL — let client open generic login instead
    return NextResponse.json({ url: "https://app.getrewardful.com/login" });
  }
}

