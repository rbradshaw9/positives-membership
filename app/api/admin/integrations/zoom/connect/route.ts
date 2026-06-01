import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";
import { buildZoomAuthorizeUrl, zoomConfigured } from "@/lib/zoom/client";
import { canManageCoachZoom, canManagePlatformZoom } from "@/lib/zoom/authorization";

function safeReturnTo(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/admin/integrations/zoom";
}

export async function GET(request: Request) {
  const user = await requireAdmin();
  const url = new URL(request.url);
  const returnTo = safeReturnTo(url.searchParams.get("returnTo"));
  const ownerKind = url.searchParams.get("ownerKind") === "coach" ? "coach" : "platform";

  if (!zoomConfigured()) {
    return NextResponse.redirect(new URL(`${returnTo}?error=zoom_not_configured`, url.origin));
  }

  const state = randomUUID();
  const supabase = asLooseSupabaseClient(getAdminClient());

  if (ownerKind === "platform" && !(await canManagePlatformZoom(user))) {
    const returnUrl = new URL(returnTo, url.origin);
    returnUrl.searchParams.set("error", "platform_zoom_permission_denied");
    return NextResponse.redirect(returnUrl);
  }

  if (ownerKind === "coach") {
    if (!(await canManageCoachZoom(user))) {
      const returnUrl = new URL(returnTo, url.origin);
      returnUrl.searchParams.set("error", "coach_zoom_permission_denied");
      return NextResponse.redirect(returnUrl);
    }

    const { data: coachProfile } = await supabase
      .from("coach_profile")
      .select("id")
      .eq("member_id", user.id)
      .maybeSingle();

    if (!coachProfile) {
      const returnUrl = new URL(returnTo, url.origin);
      returnUrl.searchParams.set("error", "coach_profile_required");
      return NextResponse.redirect(returnUrl);
    }
  }

  await supabase.from("zoom_oauth_state").insert({
    state,
    created_by: user.id,
    owner_kind: ownerKind,
    return_to: returnTo,
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  });

  return NextResponse.redirect(buildZoomAuthorizeUrl({ state }));
}
