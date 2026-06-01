"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requireAdminPermission } from "@/lib/auth/require-admin";
import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";
import { getAuthorizedZoomConnection } from "@/lib/zoom/authorization";
import { zoomApi } from "@/lib/zoom/client";
import { runAndPersistZoomSmokeTest } from "@/lib/zoom/smoke-runner";

function clean(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

export async function setCoachZoomDefault(formData: FormData) {
  const user = await requireAdminPermission("coaching.manage");
  const connectionId = clean(formData.get("connection_id"));
  const supabase = asLooseSupabaseClient(getAdminClient());

  const { data: coachProfile } = await supabase
    .from("coach_profile")
    .select("id")
    .eq("member_id", user.id)
    .maybeSingle();

  if (!coachProfile) redirect("/admin/integrations/zoom?error=coach_profile_required");

  if (connectionId) {
    const { data: connection } = await supabase
      .from("zoom_connection")
      .select("id")
      .eq("id", connectionId)
      .eq("owner_kind", "coach")
      .eq("owner_member_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (!connection) redirect("/admin/integrations/zoom?error=invalid_coach_zoom_connection");
  }

  await supabase
    .from("coach_profile")
    .update({
      zoom_connection_id: connectionId || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", (coachProfile as { id: string }).id);

  revalidatePath("/admin/integrations/zoom");
  revalidatePath("/admin/coaching");
  revalidateTag("zoom-connections", "max");
  redirect("/admin/integrations/zoom?success=coach_default_saved");
}

export async function verifyZoomConnection(formData: FormData) {
  const user = await requireAdmin();
  const connectionId = clean(formData.get("connection_id"));
  if (!connectionId) redirect("/admin/integrations/zoom?error=missing_zoom_connection");

  const connection = await getAuthorizedZoomConnection(connectionId, user);
  if (!connection) redirect("/admin/integrations/zoom?error=zoom_connection_forbidden");

  const supabase = asLooseSupabaseClient(getAdminClient());
  const checkedAt = new Date().toISOString();

  try {
    await zoomApi(connectionId, "/users/me");
    await zoomApi(connectionId, "/users/me/meetings?page_size=1&type=scheduled");
    await zoomApi(connectionId, "/users/me/webinars?page_size=1");

    await supabase
      .from("zoom_connection")
      .update({
        status: "active",
        last_checked_at: checkedAt,
        last_error: null,
        updated_at: checkedAt,
      })
      .eq("id", connectionId);

    revalidatePath("/admin/integrations/zoom");
    revalidatePath("/admin/ops");
    revalidateTag("zoom-connections", "max");
    redirect("/admin/integrations/zoom?success=zoom_verified");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Zoom verification failed.";
    const needsReconnect =
      message.includes("refresh token") ||
      message.includes("token request failed") ||
      message.includes("401") ||
      message.includes("invalid_grant");

    await supabase
      .from("zoom_connection")
      .update({
        status: needsReconnect ? "needs_reconnect" : connection.status,
        last_checked_at: checkedAt,
        last_error: message.slice(0, 500),
        updated_at: checkedAt,
      })
      .eq("id", connectionId);

    revalidatePath("/admin/integrations/zoom");
    revalidatePath("/admin/ops");
    revalidateTag("zoom-connections", "max");
    redirect("/admin/integrations/zoom?error=zoom_verification_failed");
  }
}

export async function runZoomConnectionSmokeTest(formData: FormData) {
  const user = await requireAdmin();
  const connectionId = clean(formData.get("connection_id"));
  if (!connectionId) redirect("/admin/integrations/zoom?error=missing_zoom_connection");

  const connection = await getAuthorizedZoomConnection(connectionId, user);
  if (!connection) redirect("/admin/integrations/zoom?error=zoom_connection_forbidden");

  const result = await runAndPersistZoomSmokeTest({ connectionId, initiatedBy: user.id });

  revalidatePath("/admin/integrations/zoom");
  revalidatePath("/admin/ops");
  revalidateTag("zoom-connections", "max");
  redirect(result.status === "passed" ? "/admin/integrations/zoom?success=zoom_smoke_passed" : "/admin/integrations/zoom?error=zoom_smoke_failed");
}
