import { redirect } from "next/navigation";
import { appendPublicTrackingParams, type PublicSearchParams } from "@/lib/marketing/public-query-params";

export default async function RetiredPartnerPage({
  searchParams,
}: {
  searchParams: Promise<PublicSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  redirect(appendPublicTrackingParams("/try", resolvedSearchParams));
}
