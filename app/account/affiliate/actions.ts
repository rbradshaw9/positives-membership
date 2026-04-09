"use server";

/**
 * app/account/affiliate/actions.ts
 *
 * Server action: provision a FirstPromoter affiliate account for the
 * currently authenticated member, caching their FP promoter id + ref_id
 * on the member row to avoid re-fetching on page load.
 *
 * The FP genealogy chain:
 *   - member.referred_by_fpr is set at checkout time when they arrived via
 *     an affiliate link (stored permanently — never expires).
 *   - When they enroll as an affiliate, that ref_id is looked up in FP and
 *     passed as parent_promoter_id, establishing the override commission chain.
 *   - This chain persists regardless of how much time has passed since they
 *     originally joined (6 months, 1 year, etc.)
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getAdminClient } from "@/lib/supabase/admin";
import { syncAffiliate } from "@/lib/activecampaign/sync";
import { ensureFpPromoter } from "@/lib/firstpromoter/client";

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
    .select("name, fp_promoter_id, fp_ref_id, referred_by_fpr")
    .eq("id", user.id)
    .single();

  // Return cached data if already enrolled as FP promoter
  if (member?.fp_promoter_id && member?.fp_ref_id) {
    return {
      referralLink: `https://positives.life?fpr=${member.fp_ref_id}`,
      token: member.fp_ref_id,
      affiliateId: String(member.fp_promoter_id),
    };
  }

  // ── Create / fetch FirstPromoter promoter ────────────────────────────────────
  const nameParts = (member?.name ?? "").trim().split(/\s+/);
  const firstName = nameParts[0] ?? user.email.split("@")[0];
  const lastName = nameParts.slice(1).join(" ") || "Member";

  // The member's referred_by_fpr is set permanently at checkout time.
  // Passing it here links this new promoter as a "child" under their referrer
  // in FP — enabling the override commission chain.
  // This works regardless of how long ago they originally joined.
  const parentRefId = member?.referred_by_fpr ?? null;

  let promoter;
  try {
    promoter = await ensureFpPromoter({
      email: user.email,
      firstName,
      lastName,
      parentRefId,
    });
  } catch (err) {
    console.error("[Affiliate] ensureFpPromoter failed:", err);
    return {
      error: "Something went wrong setting up your referral link. Please try again.",
    };
  }

  const refId = promoter.ref_id;
  const promoterId = promoter.id;

  if (!refId) {
    console.error("[Affiliate] No ref_id found on FP promoter:", promoter);
    return { error: "Your referral link couldn't be retrieved. Please try again." };
  }

  // ── Cache FP promoter id + ref_id on member row ───────────────────────────
  await admin
    .from("member")
    .update({
      fp_promoter_id: promoterId,
      fp_ref_id: refId,
    })
    .eq("id", user.id);

  // ── Sync to ActiveCampaign (applies 'affiliate' tag → triggers welcome email) ─
  await syncAffiliate({
    email: user.email,
    referralToken: refId,
    affiliateId: String(promoterId),
  });

  return {
    referralLink: `https://positives.life?fpr=${refId}`,
    token: refId,
    affiliateId: String(promoterId),
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
    .select("fp_promoter_id")
    .eq("id", user.id)
    .single();

  if (!member?.fp_promoter_id) {
    return { error: "You need to enroll as an affiliate first." };
  }

  // Store PayPal email in the member table for our records.
  // FP does not have a native PayPal field — payouts are handled via
  // FP's payout settings or manual ACH/PayPal from the FP dashboard.
  const { error: updateError } = await admin
    .from("member")
    .update({ paypal_email: trimmed })
    .eq("id", user.id);

  if (updateError) {
    console.error("[Affiliate] savePayPalEmail DB update failed:", updateError);
    return { error: "Something went wrong. Please try again." };
  }

  return { success: true };
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

// ── Update referral slug (FP ref_id / link tracking code) ────────────────────

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
    .select("fp_promoter_id, fp_ref_id")
    .eq("id", user.id)
    .single();

  if (!member?.fp_promoter_id) return { error: "No affiliate account found." };
  if (member.fp_ref_id === slug) return { success: true, newToken: slug };

  // Update ref_id in FirstPromoter via PATCH /promoters/:id
  const fpKey = process.env.FIRSTPROMOTER_API_KEY;
  if (!fpKey) return { error: "Affiliate system configuration error. Please contact support." };

  try {
    const res = await fetch(
      `https://firstpromoter.com/api/v1/promoters/${member.fp_promoter_id}`,
      {
        method: "PATCH",
        headers: {
          "x-api-key": fpKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ref_id: slug }),
      }
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (res.status === 422 || text.includes("taken") || text.includes("already")) {
        return { error: "That slug is already taken. Try a different one." };
      }
      throw new Error(`FP PATCH /promoters → ${res.status}: ${text}`);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("taken") || msg.includes("422") || msg.includes("already"))
      return { error: "That slug is already taken. Try a different one." };
    console.error("[Affiliate] FP slug update failed:", err);
    return { error: "Failed to update your referral link. Please try again." };
  }

  // Cache updated ref_id on the member row
  await admin
    .from("member")
    .update({ fp_ref_id: slug })
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
