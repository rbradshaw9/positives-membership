import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { requireActiveMember } from "@/lib/auth/require-active-member";
import {
  getPromoterStats,
  getPromoterCommissions,
  getPromoterPayouts,
  type PromoterStats,
  type AffiliateCommission,
  type AffiliatePayout,
} from "@/lib/firstpromoter/client";
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
  const autoEnroll = ["1", "true", "yes"].includes(String(params.auto_enroll ?? "").toLowerCase());
  // w9_preview is only honoured outside of production
  const w9Preview = process.env.NODE_ENV !== "production"
    ? (["soft", "hard"].includes(String(params.w9_preview)) ? (params.w9_preview as "soft" | "hard") : "off")
    : "off";

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

  if (promoterId) {
    try {
      [stats, commissions, payouts] = await Promise.all([
        getPromoterStats(promoterId),
        getPromoterCommissions(promoterId),
        getPromoterPayouts(promoterId),
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
      existingW9={w9 ?? null}
      w9Preview={w9Preview}
      autoEnroll={autoEnroll}
    />
  );
}
