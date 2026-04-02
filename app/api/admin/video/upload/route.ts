import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import Mux from "@mux/mux-node";

/**
 * POST /api/admin/video/upload
 *
 * Creates a Mux direct upload URL. Called by the VideoUploadPanel
 * before the client starts uploading a file.
 *
 * Body: { contentId: string }
 *
 * Returns: { uploadUrl: string, uploadId: string }
 *
 * Tagging strategy:
 *   meta.title  → "[Type] | [Title] | [Date]"  (searchable in Mux dashboard)
 *   passthrough → JSON: { content_id, content_type, title, publish_date }
 */

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
});

const TYPE_PREFIX: Record<string, string> = {
  monthly_theme:   "Monthly",
  weekly_principle: "Weekly",
  coaching_call:   "Coaching",
  workshop:        "Workshop",
  library:         "Library",
};

export async function POST(req: NextRequest) {
  // Guard: admin only
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { contentId } = await req.json();
  if (!contentId) {
    return NextResponse.json({ error: "contentId required" }, { status: 400 });
  }

  // Fetch content metadata for tagging
  const supabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
  const { data: row } = await supabase
    .from("content")
    .select("id, type, title, publish_date, week_start, month_year")
    .eq("id", contentId)
    .single();

  if (!row) {
    return NextResponse.json({ error: "Content not found" }, { status: 404 });
  }

  // Build human-readable Mux title
  const prefix = TYPE_PREFIX[row.type] ?? row.type;
  const dateStr =
    row.month_year ??
    row.week_start ??
    row.publish_date ??
    "";
  const muxTitle = dateStr
    ? `${prefix} | ${row.title} | ${dateStr}`
    : `${prefix} | ${row.title}`;

  // Structured passthrough for programmatic lookup
  const passthrough = JSON.stringify({
    content_id:   row.id,
    content_type: row.type,
    title:        row.title,
    publish_date: row.publish_date ?? row.week_start ?? row.month_year ?? null,
  });

  const upload = await mux.video.uploads.create({
    cors_origin: process.env.NEXT_PUBLIC_APP_URL ?? "*",
    new_asset_settings: {
      playback_policies: ["public"],
      passthrough,
      meta: { title: muxTitle },
    },
  });

  return NextResponse.json({
    uploadUrl: upload.url,
    uploadId:  upload.id,
  });
}
