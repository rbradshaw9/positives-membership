import Image from "next/image";
import type { CSSProperties, ImgHTMLAttributes } from "react";

type SafeImageProps = Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  "alt" | "height" | "loading" | "src" | "width"
> & {
  alt: string;
  fill?: boolean;
  height?: number;
  loading?: "eager" | "lazy";
  preload?: boolean;
  quality?: number;
  sizes?: string;
  src: string;
  width?: number;
};

function isSupabasePublicStorageUrl(url: URL) {
  return (
    url.protocol === "https:" &&
    url.hostname.endsWith(".supabase.co") &&
    url.pathname.startsWith("/storage/v1/object/public/")
  );
}

function isOptimizableRemoteUrl(url: URL) {
  if (url.protocol !== "https:") return false;

  return (
    isSupabasePublicStorageUrl(url) ||
    url.hostname === "i.vimeocdn.com" ||
    url.hostname.endsWith(".cloud.vimeo.com") ||
    url.hostname === "img.youtube.com"
  );
}

export function canUseNextImage(src: string) {
  if (src.startsWith("/api/media/assets/")) return false;
  if (src.startsWith("/")) return true;

  try {
    return isOptimizableRemoteUrl(new URL(src));
  } catch {
    return false;
  }
}

export function SafeImage({
  alt,
  className,
  fill,
  height,
  loading,
  preload,
  quality,
  sizes,
  src,
  style,
  width,
  ...rest
}: SafeImageProps) {
  if (canUseNextImage(src)) {
    if (fill) {
      return (
        <Image
          {...rest}
          alt={alt}
          className={className}
          fill
          loading={preload ? undefined : loading}
          preload={preload}
          quality={quality}
          sizes={sizes}
          src={src}
          style={style}
        />
      );
    }

    return (
      <Image
        {...rest}
        alt={alt}
        className={className}
        height={height ?? 1}
        loading={preload ? undefined : loading}
        preload={preload}
        quality={quality}
        sizes={sizes}
        src={src}
        style={style}
        width={width ?? 1}
      />
    );
  }

  const fallbackStyle: CSSProperties | undefined = fill
    ? {
        ...style,
        height: "100%",
        inset: 0,
        position: "absolute",
        width: "100%",
      }
    : style;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...rest}
      alt={alt}
      className={className}
      decoding="async"
      height={height}
      loading={preload ? "eager" : loading ?? "lazy"}
      src={src}
      style={fallbackStyle}
      width={width}
    />
  );
}
