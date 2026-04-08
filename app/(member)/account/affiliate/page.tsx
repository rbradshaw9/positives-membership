import { createClient } from "@/lib/supabase/server";
import { requireActiveMember } from "@/lib/auth/require-active-member";
import {
  getAffiliate,
  getAffiliateCommissions,
  type RewardfulAffiliate,
  type RewardfulCommission,
} from "@/lib/rewardful/client";
import { AffiliatePortal } from "@/components/affiliate/AffiliatePortal";

export const metadata = {
  title: "Affiliate Portal — Positives",
  description: "Your referral link, stats, earnings, and share resources.",
};

export default async function AffiliatePage() {
  const member = await requireActiveMember();

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

  if (affiliateId) {
    try {
      [affiliate, commissions] = await Promise.all([
        getAffiliate(affiliateId),
        getAffiliateCommissions(affiliateId),
      ]);
    } catch {
      // Non-fatal — render with partial data
    }
  }

  const link = affiliate?.links?.[0] ?? null;

  return (
    <AffiliatePortal
      isAffiliate={Boolean(affiliateId)}
      affiliateId={affiliateId}
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
      memberName={member.name ?? ""}
      paypalEmail={affiliate?.paypal_email ?? ""}
    />
  );
}
