import { createClient } from "@/lib/supabase/server";
import { requireActiveMember } from "@/lib/auth/require-active-member";
import {
  getPromoterStats,
  getPromoterCommissions,
  getPromoterPayouts,
  getPromoterTrackedLinks,
  getPromoterTrendReport,
  getPromoterUrlReports,
  type PromoterStats,
  type AffiliateCommission,
  type AffiliatePayout,
  type PromoterTrendPoint,
  type PromoterUrlReport,
} from "@/lib/firstpromoter/client";
import { AffiliatePortal } from "@/components/affiliate/AffiliatePortal";
import {
  buildAffiliatePortalViewModel,
  type AffiliateTrackedLink,
} from "@/lib/affiliate/portal";

export const metadata = {
  title: "Affiliate Portal — Positives",
  description: "Your referral link, stats, earnings, and share resources.",
};

export default async function AffiliatePage() {
  const member = await requireActiveMember();

  const supabase = await createClient();
  const { data: row } = await supabase
    .from("member")
    .select("fp_promoter_id, fp_ref_id, paypal_email")
    .eq("id", member.id)
    .single();

  const promoterId  = row?.fp_promoter_id ?? null;
  const token       = row?.fp_ref_id ?? null;
  const paypalEmail = row?.paypal_email ?? "";

  let stats: PromoterStats | null = null;
  let commissions: AffiliateCommission[] = [];
  let payouts: AffiliatePayout[] = [];
  let trendReport: PromoterTrendPoint[] = [];
  let urlReports: PromoterUrlReport[] = [];
  let trackedLinks: AffiliateTrackedLink[] = [];

  if (promoterId) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 5);

      [stats, commissions, payouts, trendReport, urlReports, trackedLinks] = await Promise.all([
        getPromoterStats(promoterId),
        getPromoterCommissions(promoterId),
        getPromoterPayouts(promoterId),
        getPromoterTrendReport({
          promoterId,
          email: member.email,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          groupBy: "month",
        }).catch(() => []),
        token
          ? getPromoterUrlReports({
              query: token,
              startDate: startDate.toISOString(),
              endDate: endDate.toISOString(),
              groupBy: "month",
            }).catch(() => [])
          : Promise.resolve([]),
        getPromoterTrackedLinks(promoterId).catch(() => []),
      ]);
    } catch {
      // Non-fatal — render with partial data
    }
  }

  const performance = buildAffiliatePortalViewModel({
    stats,
    commissions,
    payouts,
    trendReport,
    urlReports,
    paypalEmail,
  });

  return (
    <AffiliatePortal
      isAffiliate={Boolean(promoterId)}
      affiliateId={promoterId ? String(promoterId) : null}
      affiliateLinkId={null}
      affiliateCreatedAt={null}
      token={token}
      stats={stats}
      commissions={commissions}
      payouts={payouts}
      memberName={member.name ?? ""}
      paypalEmail={paypalEmail}
      trackedLinks={trackedLinks}
      performance={performance}
    />
  );
}
