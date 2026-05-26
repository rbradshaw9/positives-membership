import { requireMember } from "@/lib/auth/require-member";
import { getAffiliateTrackedLinks } from "@/lib/affiliate/get-affiliate-tracked-links";

export async function GET() {
  const member = await requireMember();
  const promoterId = member.fp_promoter_id ?? null;

  if (!promoterId) {
    return Response.json({ trackedLinks: [] });
  }

  try {
    const trackedLinks = await getAffiliateTrackedLinks(promoterId);
    return Response.json({ trackedLinks });
  } catch {
    return Response.json({ trackedLinks: [] });
  }
}
