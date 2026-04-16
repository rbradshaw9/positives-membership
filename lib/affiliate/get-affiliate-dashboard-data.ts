import { unstable_cache } from "next/cache";
import {
  getPromoterCommissions,
  getPromoterPayouts,
  getPromoterStats,
  getPromoterTrackedLinks,
  getPromoterTrendReport,
  getPromoterUrlReports,
  type AffiliateCommission,
  type AffiliatePayout,
  type PromoterStats,
  type PromoterTrendPoint,
  type PromoterUrlReport,
} from "@/lib/firstpromoter/client";
import type { AffiliateTrackedLink } from "@/lib/affiliate/portal";

export type AffiliateDashboardData = {
  stats: PromoterStats | null;
  commissions: AffiliateCommission[];
  payouts: AffiliatePayout[];
  trendReport: PromoterTrendPoint[];
  urlReports: PromoterUrlReport[];
  trackedLinks: AffiliateTrackedLink[];
};

async function fetchAffiliateDashboardData(input: {
  promoterId: number;
  email: string;
  token: string | null;
}): Promise<AffiliateDashboardData> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 5);

  const [stats, commissions, payouts, trendReport, urlReports, trackedLinks] =
    await Promise.all([
      getPromoterStats(input.promoterId),
      getPromoterCommissions(input.promoterId),
      getPromoterPayouts(input.promoterId),
      getPromoterTrendReport({
        promoterId: input.promoterId,
        email: input.email,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        groupBy: "month",
      }).catch(() => []),
      input.token
        ? getPromoterUrlReports({
            query: input.token,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            groupBy: "month",
          }).catch(() => [])
        : Promise.resolve([]),
      getPromoterTrackedLinks(input.promoterId).catch(() => []),
    ]);

  return {
    stats,
    commissions,
    payouts,
    trendReport,
    urlReports,
    trackedLinks,
  };
}

export async function getAffiliateDashboardData(input: {
  promoterId: number;
  email: string;
  token: string | null;
}) {
  return unstable_cache(
    () => fetchAffiliateDashboardData(input),
    ["affiliate-dashboard", String(input.promoterId), input.email, input.token ?? "no-token"],
    {
      revalidate: 60 * 5,
    }
  )();
}
