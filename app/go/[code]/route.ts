import { NextResponse, type NextRequest } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";

/**
 * /go/[code] — Affiliate short-link redirect.
 *
 * Route Handler (not a Server Component) so we use NextResponse.redirect()
 * which sets a proper HTTP 307 Location header without Next.js rendering overhead.
 *
 * Flow:
 *   1. Look up the code in affiliate_link
 *   2. Increment click counter (best-effort, fire-and-forget)
 *   3a. Internal positives.life destination → 307 with ?via=TOKEN
 *   3b. External destination → 307 to /c/[code] (blank cookie-setter page)
 *   3c. No destination → 307 to homepage with ?via=TOKEN
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const supabase = getAdminClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://positives.life";

  const { data: link } = await supabase
    .from("affiliate_link")
    .select("destination, token, clicks")
    .eq("code", code)
    .maybeSingle();

  if (!link) {
    return NextResponse.redirect(new URL("/", appUrl));
  }

  // Increment click counter (fire and forget — non-blocking)
  void supabase
    .from("affiliate_link")
    .update({ clicks: (link.clicks ?? 0) + 1 })
    .eq("code", code);

  const via = link.token;
  const destination = link.destination;

  // No destination → homepage with via cookie
  if (!destination) {
    return NextResponse.redirect(new URL(`/?via=${via}`, appUrl));
  }

  // Determine if external
  let isExternal = false;
  try {
    const destUrl = new URL(destination);
    isExternal = !destUrl.hostname.endsWith("positives.life");
  } catch {
    isExternal = true;
  }

  if (isExternal) {
    // Redirect to /c/[code] — blank page that waits for Rewardful cookie,
    // then sends visitor to the external destination.
    return NextResponse.redirect(new URL(`/c/${code}`, appUrl));
  }

  // Internal positives.life page
  const path = destination.startsWith("/") ? destination : `/${destination}`;
  const internalUrl = new URL(path, appUrl);
  internalUrl.searchParams.set("via", via);
  return NextResponse.redirect(internalUrl);
}
