import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getS3MediaConfig, mediaObjectKey, putMediaObject } from "@/lib/media/s3";
import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

type MediaAssetRow = {
  id: string;
  title: string | null;
  alt_text: string | null;
  original_filename: string | null;
  content_type: string;
  size_bytes: number;
  object_key: string;
  created_at: string;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function safeFilename(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "course-image";
}

function monthKey(date = new Date()) {
  return {
    year: String(date.getUTCFullYear()),
    month: String(date.getUTCMonth() + 1).padStart(2, "0"),
  };
}

function mapAsset(row: MediaAssetRow) {
  return {
    id: row.id,
    title: row.title,
    altText: row.alt_text,
    originalFilename: row.original_filename,
    contentType: row.content_type,
    sizeBytes: row.size_bytes,
    url: `/api/media/assets/${row.id}`,
    createdAt: row.created_at,
  };
}

export async function GET() {
  await requireAdmin();
  const supabase = asLooseSupabaseClient(getAdminClient());
  const { data, error } = await supabase
    .from("media_asset")
    .select<MediaAssetRow[]>("id, title, alt_text, original_filename, content_type, size_bytes, object_key, created_at")
    .eq("kind", "image")
    .eq("usage_context", "course")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(60);

  if (error) {
    console.error("[course-images] library lookup failed:", error.message);
    return jsonError("Image library could not be loaded.", 500);
  }

  return NextResponse.json({ assets: (data ?? []).map(mapAsset) });
}

export async function POST(request: Request) {
  const user = await requireAdmin();
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) return jsonError("Choose an image to upload.");
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) return jsonError("Upload a JPG, PNG, WebP, or GIF image.");
  if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) return jsonError("Images must be smaller than 8 MB.");

  const title = formData.get("title")?.toString().trim() || file.name.replace(/\.[^.]+$/, "");
  const altText = formData.get("alt_text")?.toString().trim() || title;
  const { year, month } = monthKey();
  const objectKey = mediaObjectKey("images", "courses", "editor-uploads", year, month, `${randomUUID()}-${safeFilename(file.name)}`);

  try {
    await putMediaObject({
      key: objectKey,
      body: Buffer.from(await file.arrayBuffer()),
      contentType: file.type,
    });
  } catch (error) {
    console.error("[course-images] S3 upload failed:", error);
    return jsonError("Image could not be uploaded to S3.", 502);
  }

  const { bucket } = getS3MediaConfig();
  const supabase = asLooseSupabaseClient(getAdminClient());
  const { data, error } = await supabase
    .from("media_asset")
    .insert({
      storage_provider: "s3",
      bucket,
      object_key: objectKey,
      kind: "image",
      usage_context: "course",
      title,
      alt_text: altText,
      original_filename: file.name,
      content_type: file.type,
      size_bytes: file.size,
      status: "active",
      visibility: "member",
      uploaded_by: user.id,
      metadata: {},
    })
    .select<MediaAssetRow>("id, title, alt_text, original_filename, content_type, size_bytes, object_key, created_at")
    .single();

  if (error || !data) {
    console.error("[course-images] media metadata insert failed:", error?.message);
    return jsonError("Image uploaded, but the library record could not be saved.", 500);
  }

  return NextResponse.json({ asset: mapAsset(data) });
}
