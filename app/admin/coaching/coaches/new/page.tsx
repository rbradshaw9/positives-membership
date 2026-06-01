/**
 * app/admin/coaching/coaches/new/page.tsx
 * Admin: create a new coach profile.
 */

import { requireAdmin } from "@/lib/auth/require-admin";
import { CoachForm } from "../CoachForm";
import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";
import type { ZoomConnectionOption } from "@/lib/events/types";

export const metadata = {
  title: "New Coach — Admin",
};

export default async function NewCoachPage() {
  await requireAdmin();
  const supabase = asLooseSupabaseClient(getAdminClient());
  const { data: zoomConnectionsRaw } = await supabase
    .from("zoom_connection")
    .select<ZoomConnectionOption>("id, label, owner_kind, owner_member_id, zoom_user_email, status")
    .eq("status", "active")
    .order("owner_kind", { ascending: false })
    .order("created_at", { ascending: false });
  const zoomConnections = (zoomConnectionsRaw ?? []) as unknown as ZoomConnectionOption[];

  return (
    <div className="admin-page-content">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-header__title">New Coach</h1>
          <p className="admin-page-header__subtitle">Add a new coach profile to the platform.</p>
        </div>
      </div>
      <CoachForm zoomConnections={zoomConnections} />
    </div>
  );
}
