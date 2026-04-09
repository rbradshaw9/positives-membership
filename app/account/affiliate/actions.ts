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
import { ensureAffiliate, getReferralToken, updateAffiliatePayPal, updateAffiliateLinkToken } from "@/lib/rewardful/client";
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

  // Validate and normalize the destination URL
  let destination: string | null = null;
  if (input.destination) {
    let raw = input.destination.trim();
    if (raw) {
      // Prepend https:// if no protocol given
      if (!raw.startsWith("http://") && !raw.startsWith("https://") && !raw.startsWith("/")) {
        raw = `https://${raw}`;
      }
      // Validate it's a parseable URL
      try {
        const parsed = new URL(raw);
        // Only allow http/https
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
          return { error: "Only http:// and https:// URLs are allowed." };
        }
        // Reject localhost and private IPs
        const host = parsed.hostname.toLowerCase();
        if (host === "localhost" || host === "127.0.0.1" || host.startsWith("192.168.") || host.startsWith("10.")) {
          return { error: "That destination URL isn't publicly accessible." };
        }
        // Must have a real-looking hostname (at least one dot or is positives.life)
        if (!host.includes(".") && host !== "localhost") {
          return { error: "Please enter a valid website URL (e.g. https://yourblog.com)." };
        }
        destination = parsed.toString();
      } catch {
        return { error: "That doesn't look like a valid URL. Try something like https://yourblog.com/post." };
      }
    }
  }

  // Generate code from label only — short and clean (e.g. "my-blog-post")
  const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50);
  const code = slug;

  const admin = getAdminClient();
  const { data: link, error } = await admin
    .from("affiliate_link")
    .insert({ member_id: user.id, code, label, destination, token })
    .select("id, code, label, destination, clicks")
    .single();

  if (error) {
    if (error.code === "23505") return { error: `A link named "${label}" already exists. Try a different name.` };
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

// ── Update affiliate short link destination ────────────────────────────────────

export async function updateAffiliateLinkAction(
  id: string,
  newDestination: string | null
): Promise<{ success: true } | { error: string }> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  // Validate and normalize destination URL
  let destination: string | null = null;
  if (newDestination) {
    let raw = newDestination.trim();
    if (raw) {
      if (!raw.startsWith("http://") && !raw.startsWith("https://") && !raw.startsWith("/")) {
        raw = `https://${raw}`;
      }
      try {
        const parsed = new URL(raw);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
          return { error: "Only http:// and https:// URLs are allowed." };
        }
        const host = parsed.hostname.toLowerCase();
        if (host === "localhost" || host === "127.0.0.1" || host.startsWith("192.168.") || host.startsWith("10.")) {
          return { error: "That destination URL isn't publicly accessible." };
        }
        if (!host.includes(".")) {
          return { error: "Please enter a valid website URL (e.g. https://yourblog.com)." };
        }
        destination = parsed.toString();
      } catch {
        return { error: "That doesn't look like a valid URL." };
      }
    }
  }

  const { error } = await supabase
    .from("affiliate_link")
    .update({ destination })
    .eq("id", id)
    .eq("member_id", user.id);

  if (error) {
    console.error("[Affiliate] updateAffiliateLink failed:", error);
    return { error: "Failed to update link." };
  }

  return { success: true };
}

// ── Update referral slug (Rewardful link token) ───────────────────────────────────

export async function updateReferralSlugAction(
  slugInput: string
): Promise<{ success: true; newToken: string } | { error: string }> {
  // Validate slug format
  const slug = slugInput.trim().toLowerCase();
  if (!slug) return { error: "Please enter a slug." };
  if (slug.length < 3) return { error: "Slug must be at least 3 characters." };
  if (slug.length > 30) return { error: "Slug must be 30 characters or fewer." };
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
    return { error: "Only lowercase letters, numbers, and hyphens allowed. Cannot start or end with a hyphen." };

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const admin = getAdminClient();
  const { data: member } = await admin
    .from("member")
    .select("rewardful_affiliate_id, rewardful_affiliate_token")
    .eq("id", user.id)
    .single();

  if (!member?.rewardful_affiliate_id) return { error: "No affiliate account found." };
  if (member.rewardful_affiliate_token === slug) return { success: true, newToken: slug };

  // Fetch the affiliate to get the link ID
  const { getAffiliate } = await import("@/lib/rewardful/client");
  let linkId: string;
  try {
    const affiliate = await getAffiliate(member.rewardful_affiliate_id);
    linkId = affiliate.links?.[0]?.id;
    if (!linkId) return { error: "Could not find your referral link to update." };
  } catch (err) {
    console.error("[Affiliate] getAffiliate failed:", err);
    return { error: "Could not fetch affiliate data. Please try again." };
  }

  // Update token in Rewardful
  try {
    await updateAffiliateLinkToken(linkId, slug);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("taken") || msg.includes("422") || msg.includes("already"))
      return { error: "That slug is already taken. Try a different one." };
    console.error("[Affiliate] updateAffiliateLinkToken failed:", err);
    return { error: "Failed to update your referral link. Please try again." };
  }

  // Cache updated token on the member row
  await admin
    .from("member")
    .update({ rewardful_affiliate_token: slug })
    .eq("id", user.id);

  return { success: true, newToken: slug };
}

// ── Save W9 form data ──────────────────────────────────────────────────────────

export interface W9FormData {
  legal_name: string;
  business_name: string;
  tax_classification: string;
  tax_id: string;
  address: string;
  city: string;
  state_code: string;
  zip: string;
  signature_name: string;
}

export async function saveW9Action(
  data: W9FormData
): Promise<{ success: true } | { error: string }> {
  // Basic field validation
  if (!data.legal_name?.trim()) return { error: "Legal name is required." };
  if (!data.tax_classification?.trim()) return { error: "Tax classification is required." };
  if (!data.tax_id?.trim()) return { error: "SSN or EIN is required." };
  if (!data.address?.trim()) return { error: "Address is required." };
  if (!data.city?.trim()) return { error: "City is required." };
  if (!data.state_code?.trim() || data.state_code.trim().length > 2) return { error: "State is required." };
  if (!data.zip?.trim()) return { error: "ZIP code is required." };
  if (!data.signature_name?.trim()) return { error: "Electronic signature is required." };

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const admin = getAdminClient();
  const { error } = await admin
    .from("member_w9")
    .upsert(
      {
        member_id: user.id,
        legal_name: data.legal_name.trim(),
        business_name: data.business_name?.trim() || null,
        tax_classification: data.tax_classification.trim(),
        tax_id: data.tax_id.trim(),
        address: data.address.trim(),
        city: data.city.trim(),
        state_code: data.state_code.trim().toUpperCase(),
        zip: data.zip.trim(),
        signature_name: data.signature_name.trim(),
        signed_at: new Date().toISOString(),
      },
      { onConflict: "member_id" }
    );

  if (error) {
    console.error("[W9] saveW9 failed:", error);
    return { error: "Failed to save W9. Please try again." };
  }

  return { success: true };
}
