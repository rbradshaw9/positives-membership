import { requireActiveMember } from "@/lib/auth/require-active-member";
import { getAffiliateDashboardData } from "@/lib/affiliate/get-affiliate-dashboard-data";
import {
  buildAffiliatePortalViewModel,
  type AffiliatePortalDashboardData,
} from "@/lib/affiliate/portal";

function emptyAffiliateDashboard(paypalEmail: string): AffiliatePortalDashboardData {
  return {
    performance: buildAffiliatePortalViewModel({
      stats: null,
      commissions: [],
      payouts: [],
      trendReport: [],
      urlReports: [],
      paypalEmail,
    }),
    commissions: [],
    payouts: [],
  };
}

export async function GET() {
  const member = await requireActiveMember();
  const promoterId = member.fp_promoter_id ?? null;
  const token = member.fp_ref_id ?? null;
  const paypalEmail = member.paypal_email ?? "";

  if (!promoterId) {
    return Response.json(emptyAffiliateDashboard(paypalEmail));
  }

  const dashboard = await getAffiliateDashboardData({
    promoterId,
    email: member.email,
    token,
  });

  return Response.json({
    performance: buildAffiliatePortalViewModel({
      stats: dashboard.stats,
      commissions: dashboard.commissions,
      payouts: dashboard.payouts,
      trendReport: dashboard.trendReport,
      urlReports: dashboard.urlReports,
      paypalEmail,
    }),
    commissions: dashboard.commissions,
    payouts: dashboard.payouts,
  } satisfies AffiliatePortalDashboardData);
}
