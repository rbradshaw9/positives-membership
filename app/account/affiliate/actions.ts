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
import {
  buildTrackedAffiliateUrl,
  getAffiliateDestination,
  type AffiliateDestinationKey,
} from "@/lib/affiliate/destinations";
import {
  ensureFpPromoter,
  isFirstPromoterAuthError,
  updatePromoterRefId,
} from "@/lib/firstpromoter/client";

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
    if (isFirstPromoterAuthError(err)) {
      return {
        error:
          "Affiliate setup is temporarily unavailable because the FirstPromoter API key needs attention. Please contact support@positives.life.",
      };
    }
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
  destinationKey: AffiliateDestinationKey;
  subId?: string | null;
}): Promise<
  | {
      link: {
        url: string;
        destinationKey: AffiliateDestinationKey;
        destinationLabel: string;
        subId: string | null;
      };
    }
  | { error: string }
> {
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
    .select("fp_ref_id")
    .eq("id", user.id)
    .single();

  const token = member?.fp_ref_id;
  if (!token) return { error: "No affiliate account found. Enroll first." };
  const destination = getAffiliateDestination(input.destinationKey);
  if (!destination) {
    return { error: "Please choose a valid Positives destination." };
  }

  const subId = (input.subId ?? "").trim().toLowerCase();
  if (subId && !/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/.test(subId)) {
    return { error: "Use letters, numbers, hyphens, or underscores for the source tag." };
  }

  const url = buildTrackedAffiliateUrl({
    token,
    destinationKey: destination.key,
    subId: subId || null,
  });

  return {
    link: {
      url,
      destinationKey: destination.key,
      destinationLabel: destination.label,
      subId: subId || null,
    },
  };
}

// ── Delete legacy affiliate short link ───────────────────────────────────────

export async function deleteAffiliateLinkAction(
  id: string
): Promise<{ success: true } | { error: string }> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { error } = await supabase
    .from("affiliate_link")
    .delete()
    .eq("id", id)
    .eq("member_id", user.id);

  if (error) {
    console.error("[Affiliate] deleteAffiliateLink failed:", error);
    return { error: "Failed to delete link." };
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

  try {
    await updatePromoterRefId(member.fp_promoter_id, slug);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("taken") || msg.includes("422") || msg.includes("already")) {
      return { error: "That slug is already taken. Try a different one." };
    }
    if (isFirstPromoterAuthError(err)) {
      return {
        error:
          "Affiliate link updates are temporarily unavailable because the FirstPromoter API key needs attention. Please contact support@positives.life.",
      };
    }
    console.error("[Affiliate] FP slug update failed:", err);
    return { error: "Failed to update your referral link. Please try again." };
  }

  // Cache updated ref_id on the member row
  await admin
    .from("member")
    .update({ fp_ref_id: slug })
    .eq("id", user.id);

  // Keep Positives-managed short links pointing at the new active FP token.
  await admin
    .from("affiliate_link")
    .update({ token: slug })
    .eq("member_id", user.id);

  return { success: true, newToken: slug };
}
