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
  overlayText?: string;
  prompt?: string;
  reflectionPrompt?: string;
  target?: "featured" | "poster" | "thumbnail";
  textTreatment?: "none" | "title-card";
  title?: string;
};

const POSITIVES_IMAGE_STYLE = [
  "Create a premium editorial wellness image for Positives Life.",
  "Use a calm, emotionally grounded, modern composition with natural light, soft depth, and human warmth.",
  "Avoid stock-photo cliches, cheesy wellness symbols, generic meditation silhouettes, fake text, logos, watermarks, before-and-after imagery, and medical claims.",
  "Design for a 16:9 thumbnail/poster crop. Keep the subject and visual weight centered so it works in cards, video posters, and hero surfaces.",
  "Use sophisticated, restrained colors inspired by clean whites, soft neutrals, gentle greens, muted blue accents, and warm human skin tones.",
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

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function wrapHeadline(value: string) {
  const headline = cleanText(value, 150).replace(/\s+/g, " ");
  const words = headline.split(" ").filter(Boolean);
  const maxChars = headline.length > 70 ? 22 : headline.length > 44 ? 26 : 30;
  const lines: string[] = [];

  for (const word of words) {
    const current = lines.at(-1);
    if (!current) {
      lines.push(word);
      continue;
    }

    if (`${current} ${word}`.length <= maxChars || lines.length >= 4) {
      lines[lines.length - 1] = `${current} ${word}`;
    } else {
      lines.push(word);
    }
  }

  return lines.slice(0, 4);
}

function titleCardSvg(headline: string, fieldLabel: string) {
  const lines = wrapHeadline(headline);
  if (lines.length === 0) return null;

  const maxLineLength = Math.max(...lines.map((line) => line.length));
  const fontSize = lines.length <= 2 && maxLineLength <= 19 ? 124 : lines.length <= 3 ? 96 : 78;
  const lineHeight = Math.round(fontSize * 1.05);
  const blockHeight = lineHeight * lines.length;
  const firstBaseline = Math.round(540 - blockHeight / 2 + fontSize * 0.78);
  const eyebrow = cleanText(fieldLabel, 42).toUpperCase();

  const textLines = lines
    .map((line, index) => `<tspan x="116" dy="${index === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`)
    .join("");

  return Buffer.from(`
<svg width="1920" height="1080" viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="shade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#111827" stop-opacity="0.84"/>
      <stop offset="0.48" stop-color="#111827" stop-opacity="0.46"/>
      <stop offset="1" stop-color="#111827" stop-opacity="0.04"/>
    </linearGradient>
    <linearGradient id="warm" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0" stop-color="#0f766e" stop-opacity="0.42"/>
      <stop offset="1" stop-color="#f8fafc" stop-opacity="0"/>
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="130%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#020617" flood-opacity="0.38"/>
    </filter>
  </defs>
  <rect width="1920" height="1080" fill="url(#shade)"/>
  <rect width="1920" height="1080" fill="url(#warm)"/>
  <rect x="116" y="${Math.max(138, firstBaseline - fontSize - 84)}" width="128" height="8" rx="4" fill="#80b9aa"/>
  <text x="116" y="${Math.max(210, firstBaseline - fontSize - 38)}" font-family="Inter, Arial, sans-serif" font-size="30" font-weight="800" letter-spacing="4" fill="#d8eee9" opacity="0.96">${escapeXml(eyebrow || "POSITIVES")}</text>
  <text x="116" y="${firstBaseline}" font-family="Inter, Arial, sans-serif" font-size="${fontSize}" font-weight="900" letter-spacing="0" fill="#ffffff" filter="url(#shadow)">${textLines}</text>
</svg>
`);
}

async function applyTitleCardOverlay(image: Buffer, headline: string, fieldLabel: string) {
  const overlay = titleCardSvg(headline, fieldLabel);
  if (!overlay) return image;

  return sharp(image)
    .composite([{ input: overlay, top: 0, left: 0 }])
    .png({ compressionLevel: 9, quality: 92 })
    .toBuffer();
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
  const headline = cleanText(input.overlayText, 150) || title;
  const isTitleCard = input.textTreatment === "title-card" && headline;

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
    isTitleCard
      ? [
          "Create a cinematic YouTube-style intro graphic background with generous clean negative space on the left side for a large title overlay.",
          "Do not render any letters, words, captions, logos, labels, signage, or fake text inside the generated image; the application will add exact title typography afterward.",
          "Use stronger thumbnail contrast and a clear focal subject on the right or center-right so the final image reads well at small sizes.",
        ].join(" ")
      : "No text in the image.",
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

    const headline = cleanText(input.overlayText, 150) || cleanText(input.title, 150);
    if (input.textTreatment === "title-card" && headline) {
      normalizedBody = await applyTitleCardOverlay(
        normalizedBody,
        headline,
        cleanText(input.fieldLabel, 80) || "Positives"
      );
    }
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
          textTreatment: input.textTreatment === "title-card" ? "title-card" : "none",
          overlayText: cleanText(input.overlayText, 150) || cleanText(input.title, 150) || null,
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
