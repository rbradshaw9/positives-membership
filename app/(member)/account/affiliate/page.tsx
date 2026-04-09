import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { requireActiveMember } from "@/lib/auth/require-active-member";
import {
  getAffiliate,
  getAffiliateCommissions,
  getAffiliatePayouts,
  type RewardfulAffiliate,
  type RewardfulCommission,
  type RewardfulPayout,
} from "@/lib/rewardful/client";
import { AffiliatePortal } from "@/components/affiliate/AffiliatePortal";

export const metadata = {
  title: "Affiliate Portal — Positives",
  description: "Your referral link, stats, earnings, and share resources.",
};

export default async function AffiliatePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const member = await requireActiveMember();
  const params = await searchParams;
  // w9_preview is only honoured outside of production
  const w9Preview = process.env.NODE_ENV !== "production"
    ? (["soft", "hard"].includes(String(params.w9_preview)) ? (params.w9_preview as "soft" | "hard") : "off")
    : "off";

  const supabase = await createClient();
  const { data: row } = await supabase
    .from("member")
    .select("rewardful_affiliate_id, rewardful_affiliate_token")
    .eq("id", member.id)
    .single();

  const affiliateId = row?.rewardful_affiliate_id ?? null;
  const token = row?.rewardful_affiliate_token ?? null;

  let affiliate: RewardfulAffiliate | null = null;
  let commissions: RewardfulCommission[] = [];
  let payouts: RewardfulPayout[] = [];

  if (affiliateId) {
    try {
      [affiliate, commissions, payouts] = await Promise.all([
        getAffiliate(affiliateId),
        getAffiliateCommissions(affiliateId),
        getAffiliatePayouts(affiliateId),
      ]);
    } catch {
      // Non-fatal — render with partial data
    }
  }

  // Fetch existing custom affiliate links
  const { data: affiliateLinks } = await supabase
    .from("affiliate_link")
    .select("id, code, label, destination, clicks")
    .eq("member_id", member.id)
    .order("created_at", { ascending: false });

  // Fetch existing W9 (admin client needed since supabase user context may not match service role)
  const admin = getAdminClient();
  const { data: w9 } = await admin
    .from("member_w9")
    .select("legal_name, business_name, tax_classification, tax_id, address, city, state_code, zip, signature_name, signed_at")
    .eq("member_id", member.id)
    .maybeSingle();

  const link = affiliate?.links?.[0] ?? null;
  const affiliateLinkId = link?.id ?? null;
  const affiliateCreatedAt = affiliate?.created_at ?? null;

  return (
    <AffiliatePortal
      isAffiliate={Boolean(affiliateId)}
      affiliateId={affiliateId}
      affiliateLinkId={affiliateLinkId}
      affiliateCreatedAt={affiliateCreatedAt}
      token={token}
      stats={
        link
          ? {
              visitors: link.visitors,
              leads: link.leads,
              conversions: link.conversions,
            }
          : null
      }
      commissions={commissions}
      payouts={payouts}
      memberName={member.name ?? ""}
      paypalEmail={affiliate?.paypal_email ?? ""}
      initialLinks={affiliateLinks ?? []}
      existingW9={w9 ?? null}
      w9Preview={w9Preview}
    />
  );
}
