import { unstable_cache } from "next/cache";
import { getPromoterTrackedLinks } from "@/lib/firstpromoter/client";
import type { AffiliateTrackedLink } from "@/lib/affiliate/portal";

async function fetchAffiliateTrackedLinks(promoterId: number): Promise<AffiliateTrackedLink[]> {
  return getPromoterTrackedLinks(promoterId);
}

export async function getAffiliateTrackedLinks(promoterId: number) {
  return unstable_cache(
    () => fetchAffiliateTrackedLinks(promoterId),
    ["affiliate-tracked-links", String(promoterId)],
    { revalidate: 60 * 5 }
  )();
}
