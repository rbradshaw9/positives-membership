import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";
import { buildZoomAuthorizeUrl, zoomConfigured } from "@/lib/zoom/client";

export async function GET(request: Request) {
  const user = await requireAdmin();
  const url = new URL(request.url);
  const returnTo = url.searchParams.get("returnTo") || "/admin/integrations/zoom";

  if (!zoomConfigured()) {
    return NextResponse.redirect(new URL(`${returnTo}?error=zoom_not_configured`, url.origin));
  }

  const state = randomUUID();
  const supabase = asLooseSupabaseClient(getAdminClient());
  await supabase.from("zoom_oauth_state").insert({
    state,
    created_by: user.id,
    owner_kind: "platform",
    return_to: returnTo.startsWith("/") ? returnTo : "/admin/integrations/zoom",
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  });

  return NextResponse.redirect(buildZoomAuthorizeUrl({ state }));
}
