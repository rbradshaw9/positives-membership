import { requireMember } from "@/lib/auth/require-member";
import { AffiliatePortal } from "@/components/affiliate/AffiliatePortal";

export const metadata = {
  title: "Affiliate Portal — Positives",
  description: "Your referral link, stats, earnings, and share resources.",
};

export default async function AffiliatePage() {
  const member = await requireMember();
  const promoterId = member.fp_promoter_id ?? null;
  const token = member.fp_ref_id ?? null;
  const paypalEmail = member.paypal_email ?? "";

  return (
    <AffiliatePortal
      isAffiliate={Boolean(promoterId)}
      affiliateId={promoterId ? String(promoterId) : null}
      affiliateLinkId={null}
      affiliateCreatedAt={null}
      token={token}
      memberName={member.name ?? ""}
      paypalEmail={paypalEmail}
      trackedLinks={[]}
    />
  );
}
