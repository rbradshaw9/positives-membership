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
import { ensureAffiliate, getReferralToken, updateAffiliatePayPal } from "@/lib/rewardful/client";
import { getAdminClient } from "@/lib/supabase/admin";
import { syncAffiliate } from "@/lib/activecampaign/sync";

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
      referralLink: `https://positives.life?via=${member.rewardful_affiliate_token}`,
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

  // ── Sync to ActiveCampaign (applies 'affiliate' tag → triggers welcome email) ─
  await syncAffiliate({
    email: user.email,
    referralToken: token,
    affiliateId,
  });

  return {
    referralLink: `https://positives.life?via=${token}`,
    token,
    affiliateId,
  };
}

// ── Save PayPal payout email ──────────────────────────────────────────────────

export async function savePayPalEmailAction(
  paypalEmail: string
): Promise<{ success: true } | { error: string }> {
  const trimmed = paypalEmail.trim().toLowerCase();
  if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return { error: "Please enter a valid email address." };
  }

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
  if (!user) return { error: "You must be signed in." };

  const admin = getAdminClient();
  const { data: member } = await admin
    .from("member")
    .select("rewardful_affiliate_id")
    .eq("id", user.id)
    .single();

  if (!member?.rewardful_affiliate_id) {
    return { error: "You need to enroll as an affiliate first." };
  }

  try {
    await updateAffiliatePayPal(member.rewardful_affiliate_id, trimmed);
    return { success: true };
  } catch (err) {
    console.error("[Affiliate] updateAffiliatePayPal failed:", err);
    return { error: "Something went wrong. Please try again." };
  }
}

// ── Create affiliate short link ────────────────────────────────────────────────

export async function createAffiliateLinkAction(input: {
  label: string;
  destination: string | null;
}): Promise<{ link: { id: string; code: string; label: string; destination: string | null; clicks: number } } | { error: string }> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { data: member } = await supabase
    .from("member")
    .select("rewardful_affiliate_token")
    .eq("id", user.id)
    .single();

  const token = member?.rewardful_affiliate_token;
  if (!token) return { error: "No affiliate account found. Enroll first." };

  const label = input.label.trim();
  if (!label) return { error: "Please enter a name for this link." };

  // Normalize destination URL: bare domains like "google.com" → "https://google.com"
  let destination = input.destination;
  if (destination) {
    const d = destination.trim();
    if (d && !d.startsWith("http://") && !d.startsWith("https://") && !d.startsWith("/")) {
      destination = `https://${d}`;
    } else {
      destination = d || null;
    }
  }

  // Generate code: TOKEN-slugified-label (e.g. "ryan-my-blog-post")
  const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  const code = `${token}-${slug}`;

  const admin = getAdminClient();
  const { data: link, error } = await admin
    .from("affiliate_link")
    .insert({ member_id: user.id, code, label, destination, token })
    .select("id, code, label, destination, clicks")
    .single();

  if (error) {
    if (error.code === "23505") return { error: `The code "${code}" is already taken. Try a different name.` };
    console.error("[Affiliate] createAffiliateLink failed:", error);
    return { error: "Failed to create link. Please try again." };
  }

  return { link: link! };
}

// ── Delete affiliate short link ────────────────────────────────────────────────

export async function deleteAffiliateLinkAction(
  id: string
): Promise<{ success: true } | { error: string }> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { error } = await supabase
    .from("affiliate_link")
    .delete()
    .eq("id", id)
    .eq("member_id", user.id); // RLS double-check

  if (error) {
    console.error("[Affiliate] deleteAffiliateLink failed:", error);
    return { error: "Failed to delete link." };
  }

  return { success: true };
}
