import { NextResponse, type NextRequest } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { buildAffiliateRedirectUrl } from "@/lib/affiliate/links";

/**
 * /go/[code] — Affiliate short-link redirect.
 *
 * Route Handler (not a Server Component) so we use NextResponse.redirect()
 * which sets a proper HTTP 307 Location header without Next.js rendering overhead.
 *
 * Flow:
 *   1. Look up the code in affiliate_link
 *   2. Increment click counter (best-effort, fire-and-forget)
 *   3. Redirect to the stored destination with the canonical ?fpr=TOKEN
 *      query param so attribution stays in the FirstPromoter path.
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

  const redirectUrl = buildAffiliateRedirectUrl({
    destination: link.destination,
    token: link.token,
    appUrl,
  });

  return NextResponse.redirect(redirectUrl);
}
