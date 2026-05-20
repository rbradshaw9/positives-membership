/**
 * POST /api/admin/audio/upload-url
 *
 * Generates a presigned S3 PUT URL for direct client-to-S3 audio upload.
 * Client uploads directly to S3 (no server memory usage) then calls
 * /api/admin/audio/save-key to persist the S3 key on the content row.
 *
 * Body: { filename: string, contentType: string, contentId: string }
 * Returns: { uploadUrl: string, s3Key: string, publicUrl: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { requireAdminPermission } from "@/lib/auth/require-admin";
import { getS3Client, getS3MediaConfig } from "@/lib/media/s3";

export const runtime = "nodejs";

const ALLOWED_AUDIO_TYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
  "audio/wav",
  "audio/aac",
  "audio/ogg",
]);

export async function POST(request: NextRequest) {
  await requireAdminPermission("members.update_profile"); // any admin can upload

  const body = await request.json().catch(() => ({}));
  const { filename, contentType, contentId, publishDate } = body as {
    filename?: string;
    contentType?: string;
    contentId?: string;
    publishDate?: string; // optional, used for key organisation
  };

  if (!filename || !contentType || !contentId) {
    return NextResponse.json(
      { error: "filename, contentType, and contentId are required" },
      { status: 400 }
    );
  }

  if (!ALLOWED_AUDIO_TYPES.has(contentType.toLowerCase())) {
    return NextResponse.json(
      { error: `Unsupported audio type: ${contentType}. Use MP3, M4A, WAV, or AAC.` },
      { status: 400 }
    );
  }

  const { bucket, region } = getS3MediaConfig();
  const ext = filename.split(".").pop()?.toLowerCase() ?? "mp3";
  const dateSegment = publishDate ?? new Date().toISOString().split("T")[0];
  const s3Key = `audio/daily/${dateSegment}/${randomUUID()}.${ext}`;

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: s3Key,
    ContentType: contentType,
    // Public read via bucket policy — no ACL needed
    CacheControl: "public, max-age=31536000, immutable",
  });

  const uploadUrl = await getSignedUrl(getS3Client(), command, {
    expiresIn: 900, // 15 minutes — plenty for any file size
  });

  const publicUrl = `https://${bucket}.s3.${region}.amazonaws.com/${s3Key}`;

  return NextResponse.json({ uploadUrl, s3Key, publicUrl });
}
