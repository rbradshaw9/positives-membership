import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { getAdminPermissionSet, isBootstrapAdminEmail } from "@/lib/auth/require-admin";
import { getSession } from "@/lib/auth/get-session";
import { getMediaObject, headMediaObject } from "@/lib/media/s3";
import { hasActiveMemberAccess } from "@/lib/subscription/access";
import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";
import type { Enums } from "@/types/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

type MediaAssetRow = {
  id: string;
  bucket: string;
  object_key: string;
  content_type: string;
  size_bytes: number;
  status: string;
  visibility: "member" | "admin";
  original_filename: string | null;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

async function userIsAdmin(user: { id: string; email?: string | null }) {
  if (isBootstrapAdminEmail(user.email)) return true;
  const permissions = await getAdminPermissionSet(user.id, user.email);
  return permissions.size > 0;
}

async function userHasActiveMembership(userId: string) {
  const supabase = asLooseSupabaseClient(getAdminClient());
  const { data, error } = await supabase
    .from("member")
    .select<{ subscription_status: string | null }>("subscription_status")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("[media-assets] member lookup failed:", error.message);
    return false;
  }

  return hasActiveMemberAccess(data?.subscription_status as Enums<"subscription_status"> | null | undefined);
}

function bodyToWebStream(body: unknown): ReadableStream<Uint8Array> | null {
  if (!body) return null;

  const maybeWebBody = body as { transformToWebStream?: () => ReadableStream<Uint8Array> };
  if (typeof maybeWebBody.transformToWebStream === "function") {
    return maybeWebBody.transformToWebStream();
  }

  if (body instanceof Readable) {
    return Readable.toWeb(body) as ReadableStream<Uint8Array>;
  }

  if (body instanceof Uint8Array) {
    const arrayBuffer = new ArrayBuffer(body.byteLength);
    new Uint8Array(arrayBuffer).set(body);
    return new Blob([arrayBuffer]).stream() as ReadableStream<Uint8Array>;
  }

  return null;
}

function parseRange(rangeHeader: string | null, size: number) {
  if (!rangeHeader || !size) return null;
  const match = rangeHeader.match(/^bytes=(\d*)-(\d*)$/);
  if (!match) return null;
  const startText = match[1] ?? "";
  const endText = match[2] ?? "";
  if (!startText && !endText) return null;

  let start = startText ? Number(startText) : size - Number(endText);
  let end = endText && startText ? Number(endText) : size - 1;
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  start = Math.max(0, Math.floor(start));
  end = Math.min(size - 1, Math.floor(end));
  if (start > end || start >= size) return null;
  return { start, end };
}

export async function GET(request: Request, context: { params: Params }) {
  const user = await getSession();
  if (!user) return jsonError("Unauthorized", 401);

  const { id } = await context.params;
  const supabase = asLooseSupabaseClient(getAdminClient());
  const { data: asset, error } = await supabase
    .from("media_asset")
    .select<MediaAssetRow>("id, bucket, object_key, content_type, size_bytes, status, visibility, original_filename")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[media-assets] asset lookup failed:", error.message);
    return jsonError("Asset could not be loaded.", 500);
  }

  if (!asset || asset.status !== "active") return jsonError("Not found", 404);

  const isAdmin = await userIsAdmin(user);
  if (!isAdmin) {
    if (asset.visibility === "admin") return jsonError("Forbidden", 403);
    const activeMember = await userHasActiveMembership(user.id);
    if (!activeMember) return jsonError("Forbidden", 403);
  }

  try {
    let assetSize = asset.size_bytes;
    if (request.headers.get("range") && !assetSize) {
      const head = await headMediaObject({
        bucket: asset.bucket,
        key: asset.object_key,
      });
      assetSize = head.ContentLength ?? 0;
    }
    const range = parseRange(request.headers.get("range"), assetSize);
    const object = await getMediaObject({
      bucket: asset.bucket,
      key: asset.object_key,
      range: range ? `bytes=${range.start}-${range.end}` : undefined,
    });
    const stream = bodyToWebStream(object.Body);
    if (!stream) return jsonError("Asset body could not be read.", 500);

    return new Response(stream, {
      status: range ? 206 : 200,
      headers: {
        "Content-Type": asset.content_type,
        "Accept-Ranges": "bytes",
        "Cache-Control": "private, max-age=3600",
        ...(range && assetSize
          ? {
              "Content-Range": `bytes ${range.start}-${range.end}/${assetSize}`,
              "Content-Length": String(range.end - range.start + 1),
            }
          : assetSize
            ? { "Content-Length": String(assetSize) }
            : {}),
      },
    });
  } catch (error) {
    console.error("[media-assets] S3 object lookup failed:", error);
    return jsonError("Asset could not be loaded.", 502);
  }
}
