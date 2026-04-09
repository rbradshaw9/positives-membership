import { redirect } from "next/navigation";
import { getAdminClient } from "@/lib/supabase/admin";
import { buildAffiliateRedirectUrl } from "@/lib/affiliate/links";

interface Props {
  params: Promise<{ code: string }>;
}

/**
 * /c/[code] — Legacy affiliate redirect compatibility page.
 *
 * Older shared links may still point here from the Rewardful era. We now
 * resolve the stored destination server-side and redirect immediately with the
 * canonical FirstPromoter query parameter (`?fpr=`).
 */
export default async function CookiePage({ params }: Props) {
  const { code } = await params;
  const supabase = getAdminClient();

  const { data: link } = await supabase
    .from("affiliate_link")
    .select("destination, token")
    .eq("code", code)
    .maybeSingle();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://positives.life";
  const redirectUrl = buildAffiliateRedirectUrl({
    destination: link?.destination,
    token: link?.token ?? code,
    appUrl,
  });

  redirect(redirectUrl.toString());
}
