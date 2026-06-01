/**
 * app/api/admin/coaching/coaches/route.ts
 *
 * POST /api/admin/coaching/coaches — create a new coach profile
 * PATCH /api/admin/coaching/coaches — update an existing coach profile (body includes id)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";

type CoachPayload = {
  id?: string; // present for PATCH
  display_name: string;
  title: string | null;
  bio: string | null;
  avatar_url: string | null;
  member_id: string | null;
  routing_group: string;
  is_active: boolean;
  accepts_new: boolean;
  session_duration_minutes: number;
  buffer_minutes_after: number;
  zoom_connection_id?: string | null;
};

async function validZoomConnectionId(
  supabase: ReturnType<typeof asLooseSupabaseClient>,
  connectionId: string | null | undefined
) {
  if (!connectionId) return null;
  const { data } = await supabase
    .from("zoom_connection")
    .select("id")
    .eq("id", connectionId)
    .eq("status", "active")
    .maybeSingle();
  return data ? connectionId : null;
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const payload = (await req.json()) as CoachPayload;
    const supabase = asLooseSupabaseClient(getAdminClient());
    const zoomConnectionId = await validZoomConnectionId(supabase, payload.zoom_connection_id);

    const { data, error } = await supabase
      .from("coach_profile")
      .insert({
        display_name: payload.display_name,
        title: payload.title ?? null,
        bio: payload.bio ?? null,
        avatar_url: payload.avatar_url ?? null,
        member_id: payload.member_id ?? null,
        routing_group: payload.routing_group ?? "general",
        is_active: payload.is_active ?? false,
        accepts_new: payload.accepts_new ?? true,
        session_duration_minutes: payload.session_duration_minutes ?? 60,
        buffer_minutes_after: payload.buffer_minutes_after ?? 15,
        zoom_connection_id: zoomConnectionId,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[admin/coaches POST]", error);
      return NextResponse.json({ error: "Failed to create coach" }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: (data as { id: string }).id });
  } catch (err) {
    console.error("[admin/coaches POST]", err);
    return NextResponse.json({ error: "Unauthorized or failed" }, { status: 401 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin();
    const payload = (await req.json()) as CoachPayload;
    if (!payload.id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const supabase = asLooseSupabaseClient(getAdminClient());
    const zoomConnectionId = await validZoomConnectionId(supabase, payload.zoom_connection_id);

    const { error } = await supabase
      .from("coach_profile")
      .update({
        display_name: payload.display_name,
        title: payload.title ?? null,
        bio: payload.bio ?? null,
        avatar_url: payload.avatar_url ?? null,
        member_id: payload.member_id ?? null,
        routing_group: payload.routing_group,
        is_active: payload.is_active,
        accepts_new: payload.accepts_new,
        session_duration_minutes: payload.session_duration_minutes,
        buffer_minutes_after: payload.buffer_minutes_after,
        zoom_connection_id: zoomConnectionId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", payload.id);

    if (error) {
      console.error("[admin/coaches PATCH]", error);
      return NextResponse.json({ error: "Failed to update coach" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[admin/coaches PATCH]", err);
    return NextResponse.json({ error: "Unauthorized or failed" }, { status: 401 });
  }
}
