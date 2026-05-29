import sharp from "sharp";

export const MAX_IMAGE_UPLOAD_BYTES = 8 * 1024 * 1024;

export const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export type ImageVariantName = "web" | "poster" | "thumbnail";

type ImageVariantSpec = {
  maxWidth: number;
  name: ImageVariantName;
  quality: number;
  suffix: string;
};

export type OptimizedImageVariant = {
  contentType: "image/webp";
  format: "webp";
  height: number;
  key: string;
  maxWidth: number;
  quality: number;
  sizeBytes: number;
  width: number;
};

export type OptimizedImageMetadata = {
  original: {
    contentType: string;
    height: number | null;
    key: string;
    sizeBytes: number;
    width: number | null;
  };
  pipelineVersion: 1;
  skippedReason?: string;
  variants: Partial<Record<ImageVariantName, OptimizedImageVariant>>;
};

export type PreparedImageUpload = {
  metadata: OptimizedImageMetadata;
  originalHeight: number | null;
  originalWidth: number | null;
  variants: Array<OptimizedImageVariant & { body: Buffer }>;
};

const VARIANT_SPECS: ImageVariantSpec[] = [
  { name: "web", suffix: "web-1920", maxWidth: 1920, quality: 82 },
  { name: "poster", suffix: "poster-1280", maxWidth: 1280, quality: 82 },
  { name: "thumbnail", suffix: "thumb-640", maxWidth: 640, quality: 78 },
];

function variantKey(originalKey: string, suffix: string) {
  const dotIndex = originalKey.lastIndexOf(".");
  const slashIndex = originalKey.lastIndexOf("/");
  if (dotIndex > slashIndex) {
    return `${originalKey.slice(0, dotIndex)}-${suffix}.webp`;
  }

  return `${originalKey}-${suffix}.webp`;
}

function variantMetadata(variant: OptimizedImageVariant & { body: Buffer }): OptimizedImageVariant {
  return {
    contentType: variant.contentType,
    format: variant.format,
    height: variant.height,
    key: variant.key,
    maxWidth: variant.maxWidth,
    quality: variant.quality,
    sizeBytes: variant.sizeBytes,
    width: variant.width,
  };
}

export function imageAssetUrl(id: string, variant?: ImageVariantName) {
  const base = `/api/media/assets/${id}`;
  return variant ? `${base}?variant=${variant}` : base;
}

export function getImageVariantFromMetadata(
  metadata: unknown,
  variant: ImageVariantName | "original" | null
): OptimizedImageVariant | null {
  if (variant === "original") return null;
  if (!metadata || typeof metadata !== "object") return null;

  const candidate = metadata as { imageOptimization?: { variants?: unknown } };
  const variants = candidate.imageOptimization?.variants;
  if (!variants || typeof variants !== "object") return null;

  const variantName = variant ?? "web";
  const item = (variants as Partial<Record<ImageVariantName, unknown>>)[variantName];
  if (!item || typeof item !== "object") return null;

  const typed = item as Partial<OptimizedImageVariant>;
  if (
    typed.contentType !== "image/webp" ||
    typed.format !== "webp" ||
    typeof typed.key !== "string" ||
    typeof typed.sizeBytes !== "number" ||
    typeof typed.width !== "number" ||
    typeof typed.height !== "number"
  ) {
    return null;
  }

  return typed as OptimizedImageVariant;
}

export async function prepareOptimizedImageUpload(params: {
  body: Buffer;
  contentType: string;
  originalKey: string;
  sizeBytes: number;
}): Promise<PreparedImageUpload> {
  const originalSharp = sharp(params.body, { animated: params.contentType === "image/gif" });
  const originalMetadata = await originalSharp.metadata();
  const originalWidth = originalMetadata.width ?? null;
  const originalHeight = originalMetadata.height ?? null;
  const isAnimatedGif = params.contentType === "image/gif" && (originalMetadata.pages ?? 1) > 1;

  const baseMetadata: OptimizedImageMetadata = {
    original: {
      contentType: params.contentType,
      height: originalHeight,
      key: params.originalKey,
      sizeBytes: params.sizeBytes,
      width: originalWidth,
    },
    pipelineVersion: 1,
    variants: {},
  };

  if (!originalWidth || !originalHeight) {
    return {
      metadata: { ...baseMetadata, skippedReason: "missing_dimensions" },
      originalHeight,
      originalWidth,
      variants: [],
    };
  }

  if (isAnimatedGif) {
    return {
      metadata: { ...baseMetadata, skippedReason: "animated_gif" },
      originalHeight,
      originalWidth,
      variants: [],
    };
  }

  const variantEntries = await Promise.all(
    VARIANT_SPECS.map(async (spec) => {
      const output = await sharp(params.body)
        .rotate()
        .resize({
          fit: "inside",
          width: spec.maxWidth,
          withoutEnlargement: true,
        })
        .webp({
          effort: 5,
          quality: spec.quality,
        })
        .toBuffer({ resolveWithObject: true });

      const variant: OptimizedImageVariant & { body: Buffer } = {
        body: output.data,
        contentType: "image/webp",
        format: "webp",
        height: output.info.height,
        key: variantKey(params.originalKey, spec.suffix),
        maxWidth: spec.maxWidth,
        quality: spec.quality,
        sizeBytes: output.data.byteLength,
        width: output.info.width,
      };

      return [spec.name, variant] as const;
    })
  );
  const variants = variantEntries.map(([, variant]) => variant);

  return {
    metadata: {
      ...baseMetadata,
      variants: Object.fromEntries(
        variantEntries.map(([name, variant]) => [name, variantMetadata(variant)])
      ) as Partial<Record<ImageVariantName, OptimizedImageVariant>>,
    },
    originalHeight,
    originalWidth,
    variants,
  };
}
