"use server";

/**
 * app/account/affiliate/actions.ts
 *
 * Server action: provision a Rewardful affiliate account for the
 * currently authenticated member, caching their id + token on the
 * member row to avoid re-fetching on page load.
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { ensureAffiliate, getReferralToken } from "@/lib/rewardful/client";
import { getAdminClient } from "@/lib/supabase/admin";

export interface GetReferralLinkResult {
  referralLink: string;
  token: string;
  affiliateId: string;
}

export async function getReferralLinkAction(): Promise<
  GetReferralLinkResult | { error: string }
> {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const cookieStore = await cookies();
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
  if (!user?.email) {
    return { error: "You must be signed in to get a referral link." };
  }

  // ── Get member row ────────────────────────────────────────────────────────
  const admin = getAdminClient();
  const { data: member } = await admin
    .from("member")
    .select("name, rewardful_affiliate_token, rewardful_affiliate_id")
    .eq("id", user.id)
    .single();

  // Return cached data if already an affiliate
  if (member?.rewardful_affiliate_token && member?.rewardful_affiliate_id) {
    return {
      referralLink: `https://positives.life/join?via=${member.rewardful_affiliate_token}`,
      token: member.rewardful_affiliate_token,
      affiliateId: member.rewardful_affiliate_id,
    };
  }

  // ── Create / fetch Rewardful affiliate ────────────────────────────────────
  const nameParts = (member?.name ?? "").trim().split(/\s+/);
  const firstName = nameParts[0] ?? user.email.split("@")[0];
  const lastName = nameParts.slice(1).join(" ") || "Member";

  let affiliate;
  try {
    affiliate = await ensureAffiliate({
      email: user.email,
      first_name: firstName,
      last_name: lastName,
    });
  } catch (err) {
    console.error("[Affiliate] ensureAffiliate failed:", err);
    return {
      error: "Something went wrong setting up your referral link. Please try again.",
    };
  }

  const token = getReferralToken(affiliate);
  const affiliateId = affiliate.id;

  if (!token) {
    console.error("[Affiliate] No referral token found on affiliate links:", affiliate);
    return { error: "Your referral link couldn't be retrieved. Please try again." };
  }

  // ── Cache both id + token on member row ───────────────────────────────────
  await admin
    .from("member")
    .update({
      rewardful_affiliate_token: token,
      rewardful_affiliate_id: affiliateId,
    })
    .eq("id", user.id);

  return {
    referralLink: `https://positives.life/join?via=${token}`,
    token,
    affiliateId,
  };
}
