import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";
import { encryptSecret } from "@/lib/zoom/crypto";
import { exchangeZoomCode, fetchZoomMe } from "@/lib/zoom/client";
import { canManageCoachZoom, canManagePlatformZoom } from "@/lib/zoom/authorization";

type OAuthState = {
  state: string;
  created_by: string;
  owner_kind: "platform" | "coach";
  return_to: string;
  expires_at: string;
};

export async function GET(request: Request) {
  const user = await requireAdmin();
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const supabase = asLooseSupabaseClient(getAdminClient());

  if (!code || !state) {
    return NextResponse.redirect(new URL("/admin/integrations/zoom?error=missing_oauth", url.origin));
  }

  const { data } = await supabase
    .from("zoom_oauth_state")
    .select<OAuthState>("state, created_by, owner_kind, return_to, expires_at")
    .eq("state", state)
    .maybeSingle();

  if (!data || data.created_by !== user.id || new Date(data.expires_at).getTime() < Date.now()) {
    return NextResponse.redirect(new URL("/admin/integrations/zoom?error=invalid_state", url.origin));
  }

  await supabase.from("zoom_oauth_state").delete().eq("state", state);

  try {
    if (data.owner_kind === "platform" && !(await canManagePlatformZoom(user))) {
      throw new Error("Platform Zoom permission denied.");
    }
    if (data.owner_kind === "coach" && !(await canManageCoachZoom(user))) {
      throw new Error("Coach Zoom permission denied.");
    }

    const token = await exchangeZoomCode(code);
    const me = await fetchZoomMe(token.access_token);
    const label = me.email ? `Zoom - ${me.email}` : "Zoom account";
    const { data: connection, error } = await supabase
      .from("zoom_connection")
      .insert({
        owner_kind: data.owner_kind,
        owner_member_id: data.owner_kind === "coach" ? user.id : null,
        label,
        zoom_account_id: me.account_id ?? null,
        zoom_user_id: me.id,
        zoom_user_email: me.email ?? null,
        access_token_ciphertext: encryptSecret(token.access_token),
        refresh_token_ciphertext: encryptSecret(token.refresh_token),
        token_expires_at: new Date(Date.now() + token.expires_in * 1000).toISOString(),
        scopes: token.scope ? token.scope.split(" ") : [],
        status: "active",
        last_connected_at: new Date().toISOString(),
        created_by: user.id,
      })
      .select<{ id: string }>("id")
      .single();

    if (error || !connection) throw new Error(error?.message ?? "Zoom connection insert failed.");

    if (data.owner_kind === "coach") {
      await supabase
        .from("coach_profile")
        .update({
          zoom_connection_id: connection.id,
          updated_at: new Date().toISOString(),
        })
        .eq("member_id", user.id);
    }

    revalidatePath("/admin/integrations/zoom");
    revalidatePath("/admin/coaching");
    revalidatePath("/admin/events");
    revalidateTag("zoom-connections", "max");

    const returnUrl = new URL(data.return_to, url.origin);
    returnUrl.searchParams.set("zoomConnectionId", connection.id);
    returnUrl.searchParams.set("success", "zoom_connected");
    return NextResponse.redirect(returnUrl);
  } catch (error) {
    console.error("[zoom/callback]", error);
    const returnUrl = new URL(data.return_to, url.origin);
    returnUrl.searchParams.set("error", "zoom_connect_failed");
    return NextResponse.redirect(returnUrl);
  }
}
