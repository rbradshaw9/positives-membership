import { requireActiveMember } from "@/lib/auth/require-active-member";
import { AffiliatePortal } from "@/components/affiliate/AffiliatePortal";
import { type AffiliateTrackedLink } from "@/lib/affiliate/portal";
import { getPromoterTrackedLinks } from "@/lib/firstpromoter/client";

export const metadata = {
  title: "Affiliate Portal — Positives",
  description: "Your referral link, stats, earnings, and share resources.",
};

export default async function AffiliatePage() {
  const member = await requireActiveMember();
  const promoterId = member.fp_promoter_id ?? null;
  const token = member.fp_ref_id ?? null;
  const paypalEmail = member.paypal_email ?? "";

  let trackedLinks: AffiliateTrackedLink[] = [];

  if (promoterId) {
    try {
      trackedLinks = await getPromoterTrackedLinks(promoterId);
    } catch {
      // Non-fatal — render with partial data
    }
  }

  return (
    <AffiliatePortal
      isAffiliate={Boolean(promoterId)}
      affiliateId={promoterId ? String(promoterId) : null}
      affiliateLinkId={null}
      affiliateCreatedAt={null}
      token={token}
      memberName={member.name ?? ""}
      paypalEmail={paypalEmail}
      trackedLinks={trackedLinks}
    />
  );
}
