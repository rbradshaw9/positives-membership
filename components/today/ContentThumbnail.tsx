"use client";

import { useState } from "react";
import { SafeImage } from "@/components/media/SafeImage";

type ContentThumbnailProps = {
  accent: "secondary" | "accent";
  className?: string;
  imageUrl: string | null;
  sizes: string;
};

export function ContentThumbnail({
  accent,
  className,
  imageUrl,
  sizes,
}: ContentThumbnailProps) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(imageUrl && !failed);

  return (
    <>
      {showImage ? (
        <SafeImage
          src={imageUrl!}
          alt=""
          fill
          sizes={sizes}
          className={className}
          onError={() => setFailed(true)}
        />
      ) : (
        <span
          className="absolute inset-0"
          style={{
            background:
              accent === "secondary"
                ? "linear-gradient(135deg, color-mix(in srgb, var(--color-secondary) 18%, #eef7f6), color-mix(in srgb, var(--color-primary) 10%, #f3f1ec) 58%, #8f948d)"
                : "linear-gradient(135deg, color-mix(in srgb, var(--color-accent) 18%, #eef7f6), color-mix(in srgb, var(--color-secondary) 10%, #f3f1ec) 58%, #8f948d)",
          }}
        />
      )}
    </>
  );
}
