import { redirect } from "next/navigation";
import { getAdminClient } from "@/lib/supabase/admin";

interface Props {
  params: Promise<{ code: string }>;
}

/**
 * /go/[code] — Affiliate short-link redirect.
 *
 * Flow:
 *   1. Look up the code in affiliate_link
 *   2. Increment click counter (best-effort)
 *   3a. Internal positives.life destination → redirect with ?via=TOKEN
 *   3b. External destination → redirect to /c?via=TOKEN&_r=ENCODED_DEST
 *       /c is a blank cookie-setter page that fires Rewardful, then redirects
 *   3c. No destination → redirect to homepage with ?via=TOKEN
 */
export default async function GoPage({ params }: Props) {
  const { code } = await params;

  // Use admin client so we can read + write without auth (this is a public redirect)
  const supabase = getAdminClient();

  const { data: link } = await supabase
    .from("affiliate_link")
    .select("destination, token, clicks")
    .eq("code", code)
    .maybeSingle();

  if (!link) {
    redirect("/");
  }

  // Increment click counter (fire and forget — non-blocking)
  void supabase
    .from("affiliate_link")
    .update({ clicks: (link.clicks ?? 0) + 1 })
    .eq("code", code);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://positives.life";
  const destination = link.destination;
  const via = link.token;

  // No destination → homepage
  if (!destination) {
    redirect(`${appUrl}?via=${via}`);
  }

  // Determine if external
  let isExternal = false;
  try {
    const destUrl = new URL(destination);
    isExternal = !destUrl.hostname.endsWith("positives.life");
  } catch {
    // Relative path — treat as internal
    isExternal = false;
  }

  if (isExternal) {
    // Bounce through /c to set cookie before leaving positives.life
    const encoded = encodeURIComponent(destination);
    redirect(`${appUrl}/c?via=${via}&_r=${encoded}`);
  }

  // Internal positives.life page
  const path = destination.startsWith("/") ? destination : `/${destination}`;
  const url = new URL(`${appUrl}${path}`);
  url.searchParams.set("via", via);
  redirect(url.toString());
}
