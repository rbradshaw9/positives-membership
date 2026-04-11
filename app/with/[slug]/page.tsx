import { redirect } from "next/navigation";
import { appendPublicTrackingParams, type PublicSearchParams } from "@/lib/marketing/public-query-params";

export default async function RetiredPartnerPage({
  searchParams,
}: {
  searchParams: Promise<PublicSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;

  // The reusable /with landing-page family was intentionally retired for now.
  // Keep partner/referral params intact and hand traffic into the live trial flow.
  redirect(appendPublicTrackingParams("/try", resolvedSearchParams));
}
