import { getAdminClient } from "@/lib/supabase/admin";
import CookieSetter from "./CookieSetter";

interface Props {
  params: Promise<{ code: string }>;
}

/**
 * /c/[code] — Blank affiliate cookie-setter page.
 *
 * Fetches the destination URL from the DB server-side (no URL in query params,
 * no encoding issues). Renders an invisible client component that waits for the
 * Rewardful script to set the tracking cookie, then redirects to the destination.
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
  const destination = link?.destination ?? appUrl;

  return <CookieSetter destination={destination} />;
}
