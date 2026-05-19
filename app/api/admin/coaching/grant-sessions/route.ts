/**
 * app/api/admin/coaching/grant-sessions/route.ts
 *
 * POST /api/admin/coaching/grant-sessions
 *
 * Admin-only: grant session credits to a member.
 * Body: { memberEmail: string, sessions: number, packType?: string, expiresAt?: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const { memberEmail, sessions, packType, expiresAt } = (await req.json()) as {
      memberEmail: string;
      sessions: number;
      packType?: string;
      expiresAt?: string;
    };

    if (!memberEmail || !sessions || sessions < 1) {
      return NextResponse.json({ error: "memberEmail and sessions (>0) are required" }, { status: 400 });
    }

    const supabase = asLooseSupabaseClient(getAdminClient());

    // Look up member by email
    const { data: memberRaw } = await supabase
      .from("member")
      .select("id, name, email")
      .eq("email", memberEmail.trim().toLowerCase())
      .single();

    const member = memberRaw as { id: string; name: string | null; email: string } | null;
    if (!member) {
      return NextResponse.json({ error: `No member found with email: ${memberEmail}` }, { status: 404 });
    }

    // Create the pack
    const { error: insertError } = await supabase
      .from("coaching_session_pack")
      .insert({
        member_id: member.id,
        pack_type: packType ?? "bonus",
        sessions_total: sessions,
        sessions_remaining: sessions,
        granted_by: "admin",
        expires_at: expiresAt ?? null,
      });

    if (insertError) {
      console.error("[admin/grant-sessions] insert error:", insertError);
      return NextResponse.json({ error: "Failed to grant sessions" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      member: { id: member.id, name: member.name, email: member.email },
      sessions,
    });
  } catch (err) {
    console.error("[admin/grant-sessions]", err);
    return NextResponse.json({ error: "Unauthorized or failed" }, { status: 401 });
  }
}
