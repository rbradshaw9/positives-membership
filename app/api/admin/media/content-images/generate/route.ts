import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { imageAssetUrl, prepareOptimizedImageUpload } from "@/lib/media/image-optimization";
import { getS3MediaConfig, mediaObjectKey, putMediaObject } from "@/lib/media/s3";
import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";
import sharp from "sharp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

type GenerateImageInput = {
  body?: string;
  description?: string;
  excerpt?: string;
  fieldLabel?: string;
  prompt?: string;
  reflectionPrompt?: string;
  target?: "featured" | "poster" | "thumbnail";
  title?: string;
};

const POSITIVES_IMAGE_STYLE = [
  "Create a premium editorial wellness image for Positives Life.",
  "Use a calm, emotionally grounded, modern composition with natural light, soft depth, and human warmth.",
  "Avoid stock-photo cliches, cheesy wellness symbols, generic meditation silhouettes, fake text, logos, watermarks, before-and-after imagery, and medical claims.",
  "Design for a 16:9 thumbnail/poster crop. Keep the subject and visual weight centered so it works in cards, video posters, and hero surfaces.",
  "Use sophisticated, restrained colors inspired by clean whites, soft neutrals, gentle greens, muted blue accents, and warm human skin tones.",
  "No text in the image.",
].join(" ");

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function safeFilename(value: string) {
  const clean = value
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  return clean || "generated-content-image";
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
    url: imageAssetUrl(row.id),
    posterUrl: imageAssetUrl(row.id, "poster"),
    thumbnailUrl: imageAssetUrl(row.id, "thumbnail"),
    createdAt: row.created_at,
  };
}

function buildPrompt(input: GenerateImageInput) {
  const fieldLabel = cleanText(input.fieldLabel, 80) || "content image";
  const title = cleanText(input.title, 180);
  const excerpt = cleanText(input.excerpt, 320);
  const description = cleanText(input.description, 800);
  const body = cleanText(input.body, 1200);
  const reflectionPrompt = cleanText(input.reflectionPrompt, 280);
  const adminPrompt = cleanText(input.prompt, 1200);
  const target = input.target === "poster" ? "thumbnail/poster" : input.target === "thumbnail" ? "thumbnail" : "featured image";

  const contentContext = [
    title ? `Title: ${title}` : "",
    excerpt ? `Excerpt: ${excerpt}` : "",
    description ? `Description: ${description}` : "",
    body ? `Supporting notes/body: ${body}` : "",
    reflectionPrompt ? `Reflection prompt: ${reflectionPrompt}` : "",
    adminPrompt ? `Creative direction from admin: ${adminPrompt}` : "",
  ].filter(Boolean).join("\n");

  return [
    POSITIVES_IMAGE_STYLE,
    `Image role: ${target} for the ${fieldLabel} field.`,
    contentContext ? `Content context:\n${contentContext}` : "Content context: create an inviting default image for a Positives monthly practice.",
    "Output should feel specific and art-directed, not generic.",
  ].join("\n\n");
}

async function generateImage(prompt: string) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-1.5",
      prompt,
      n: 1,
      size: "auto",
      quality: "medium",
      background: "opaque",
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMessage =
      typeof payload?.error?.message === "string"
        ? payload.error.message
        : "OpenAI image generation failed.";
    throw new Error(errorMessage);
  }

  const base64 = payload?.data?.[0]?.b64_json;
  if (typeof base64 !== "string" || !base64) {
    throw new Error("OpenAI did not return image data.");
  }

  return {
    image: Buffer.from(base64, "base64"),
    revisedPrompt: typeof payload?.data?.[0]?.revised_prompt === "string"
      ? payload.data[0].revised_prompt
      : null,
  };
}

export async function POST(request: Request) {
  const user = await requireAdmin();
  const rawInput = await request.json().catch(() => ({}));
  const input = rawInput as GenerateImageInput;
  const prompt = buildPrompt(input);

  let generated: Awaited<ReturnType<typeof generateImage>>;
  try {
    generated = await generateImage(prompt);
  } catch (error) {
    console.error("[content-images/generate] OpenAI generation failed:", error);
    return jsonError(error instanceof Error ? error.message : "Image generation failed.", 502);
  }

  let normalizedBody: Buffer;
  try {
    normalizedBody = await sharp(generated.image)
      .rotate()
      .resize({ width: 1920, height: 1080, fit: "cover" })
      .png({ compressionLevel: 9, quality: 92 })
      .toBuffer();
  } catch (error) {
    console.error("[content-images/generate] generated image normalization failed:", error);
    return jsonError("Generated image could not be processed.", 502);
  }

  const title = cleanText(input.title, 100) || "Generated content image";
  const fieldLabel = cleanText(input.fieldLabel, 80) || "Content image";
  const { year, month } = monthKey();
  const objectKey = mediaObjectKey(
    "images",
    "content",
    "generated",
    year,
    month,
    `${randomUUID()}-${safeFilename(title)}.png`
  );

  const preparedImage = await prepareOptimizedImageUpload({
    body: normalizedBody,
    contentType: "image/png",
    originalKey: objectKey,
    sizeBytes: normalizedBody.byteLength,
  });

  try {
    await Promise.all([
      putMediaObject({
        key: objectKey,
        body: normalizedBody,
        contentType: "image/png",
      }),
      ...preparedImage.variants.map((variant) =>
        putMediaObject({
          key: variant.key,
          body: variant.body,
          contentType: variant.contentType,
        })
      ),
    ]);
  } catch (error) {
    console.error("[content-images/generate] S3 upload failed:", error);
    return jsonError("Generated image could not be uploaded to S3.", 502);
  }

  const supabase = asLooseSupabaseClient(getAdminClient());
  const { bucket } = getS3MediaConfig();
  const { data, error } = await supabase
    .from("media_asset")
    .insert({
      storage_provider: "s3",
      bucket,
      object_key: objectKey,
      kind: "image",
      usage_context: "content",
      title: `${fieldLabel}: ${title}`,
      alt_text: title,
      original_filename: `${safeFilename(title)}.png`,
      content_type: "image/png",
      size_bytes: normalizedBody.byteLength,
      width: preparedImage.originalWidth,
      height: preparedImage.originalHeight,
      status: "active",
      visibility: "member",
      uploaded_by: user.id,
      metadata: {
        imageGeneration: {
          model: process.env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-1.5",
          prompt,
          provider: "openai",
          revisedPrompt: generated.revisedPrompt,
          source: "admin_content_image_picker",
          target: input.target ?? "featured",
        },
        imageOptimization: preparedImage.metadata,
      },
    })
    .select<MediaAssetRow>("id, title, alt_text, original_filename, content_type, size_bytes, object_key, created_at")
    .single();

  if (error || !data) {
    console.error("[content-images/generate] media metadata insert failed:", error?.message);
    return jsonError("Image generated, but the library record could not be saved.", 500);
  }

  return NextResponse.json({ asset: mapAsset(data) });
}
