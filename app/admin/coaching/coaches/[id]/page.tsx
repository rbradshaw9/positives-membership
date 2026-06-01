/**
 * app/admin/coaching/coaches/[id]/page.tsx
 * Admin: edit an existing coach profile.
 */

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";
import { CoachForm, CoachFormData } from "../CoachForm";
import type { ZoomConnectionOption } from "@/lib/events/types";

export const metadata = {
  title: "Edit Coach — Admin",
};

export default async function EditCoachPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const supabase = asLooseSupabaseClient(getAdminClient());

  const { data: coachRaw } = await supabase
    .from("coach_profile")
    .select(
      "id, display_name, title, bio, avatar_url, member_id, routing_group, is_active, accepts_new, session_duration_minutes, buffer_minutes_after, zoom_connection_id"
    )
    .eq("id", id)
    .single();

  if (!coachRaw) redirect("/admin/coaching");

  const coach = coachRaw as CoachFormData;
  const zoomQuery = supabase
    .from("zoom_connection")
    .select<ZoomConnectionOption>("id, label, owner_kind, owner_member_id, zoom_user_email, status")
    .eq("status", "active")
    .order("owner_kind", { ascending: false })
    .order("created_at", { ascending: false });
  const { data: zoomConnectionsRaw } = coach.member_id
    ? await zoomQuery.or(`owner_kind.eq.platform,owner_member_id.eq.${coach.member_id}`)
    : await zoomQuery.eq("owner_kind", "platform");
  const zoomConnections = (zoomConnectionsRaw ?? []) as unknown as ZoomConnectionOption[];

  return (
    <div className="admin-page-content">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-header__title">Edit Coach</h1>
          <p className="admin-page-header__subtitle">{coach.display_name}</p>
        </div>
      </div>
      <CoachForm initial={coach} zoomConnections={zoomConnections} />
    </div>
  );
}
