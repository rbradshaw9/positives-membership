import { requireActiveMember } from "@/lib/auth/require-active-member";
import { AffiliatePortal } from "@/components/affiliate/AffiliatePortal";
import {
  buildAffiliatePortalViewModel,
  type AffiliateTrackedLink,
} from "@/lib/affiliate/portal";
import { getAffiliateDashboardData } from "@/lib/affiliate/get-affiliate-dashboard-data";
import type {
  AffiliateCommission,
  AffiliatePayout,
  PromoterStats,
  PromoterTrendPoint,
  PromoterUrlReport,
} from "@/lib/firstpromoter/client";

export const metadata = {
  title: "Affiliate Portal — Positives",
  description: "Your referral link, stats, earnings, and share resources.",
};

export default async function AffiliatePage() {
  const member = await requireActiveMember();
  const promoterId = member.fp_promoter_id ?? null;
  const token = member.fp_ref_id ?? null;
  const paypalEmail = member.paypal_email ?? "";

  let stats: PromoterStats | null = null;
  let commissions: AffiliateCommission[] = [];
  let payouts: AffiliatePayout[] = [];
  let trendReport: PromoterTrendPoint[] = [];
  let urlReports: PromoterUrlReport[] = [];
  let trackedLinks: AffiliateTrackedLink[] = [];

  if (promoterId) {
    try {
      ({ stats, commissions, payouts, trendReport, urlReports, trackedLinks } =
        await getAffiliateDashboardData({
          promoterId,
          email: member.email,
          token,
        }));
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
