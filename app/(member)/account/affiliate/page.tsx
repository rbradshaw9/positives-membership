import { createClient } from "@/lib/supabase/server";
import { requireActiveMember } from "@/lib/auth/require-active-member";
import {
  getPromoterStats,
  getPromoterCommissions,
  getPromoterPayouts,
  getPromoterTrendReport,
  getPromoterUrlReports,
  type PromoterStats,
  type AffiliateCommission,
  type AffiliatePayout,
  type PromoterTrendPoint,
  type PromoterUrlReport,
} from "@/lib/firstpromoter/client";
import { AffiliatePortal } from "@/components/affiliate/AffiliatePortal";
import { buildAffiliatePortalViewModel } from "@/lib/affiliate/portal";

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
  const autoEnroll = ["1", "true", "yes"].includes(String(params.auto_enroll ?? "").toLowerCase());

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

  if (promoterId) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 5);

      [stats, commissions, payouts, trendReport, urlReports] = await Promise.all([
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
      initialLinks={affiliateLinks ?? []}
      autoEnroll={autoEnroll}
      performance={performance}
    />
  );
}
