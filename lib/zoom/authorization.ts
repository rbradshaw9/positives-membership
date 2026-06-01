import {
  getAdminPermissionSet,
  hasAdminPermission,
  isBootstrapAdminEmail,
} from "@/lib/auth/require-admin";
import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";

export type ZoomConnectionAccessRow = {
  id: string;
  owner_kind: "platform" | "coach";
  owner_member_id: string | null;
  status: "active" | "needs_reconnect" | "disabled";
};

export async function canManagePlatformZoom(user: { id: string; email?: string | null }) {
  if (isBootstrapAdminEmail(user.email)) return true;
  const permissions = await getAdminPermissionSet(user.id, user.email);
  return permissions.has("members.read");
}

export async function canManageCoachZoom(user: { id: string; email?: string | null }) {
  return hasAdminPermission(user.id, "coaching.manage", user.email);
}

export async function getAuthorizedZoomConnection(
  connectionId: string,
  user: { id: string; email?: string | null }
) {
  const supabase = asLooseSupabaseClient(getAdminClient());
  const { data } = await supabase
    .from("zoom_connection")
    .select<ZoomConnectionAccessRow>("id, owner_kind, owner_member_id, status")
    .eq("id", connectionId)
    .maybeSingle();

  if (!data) return null;
  if (await canManagePlatformZoom(user)) return data;
  if (data.owner_kind === "coach" && data.owner_member_id === user.id && (await canManageCoachZoom(user))) {
    return data;
  }
  return null;
}
