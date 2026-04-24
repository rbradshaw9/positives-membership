import Image from "next/image";
import Link from "next/link";

/**
 * components/marketing/Logo.tsx
 *
 * Renders the official Positives wordmark PNG.
 *
 * variant="dark"  — charcoal mark on light/warm backgrounds (default)
 * variant="light" — CSS-inverted to white for dark-background sections
 *
 * Wrap in a <Link> by setting `href` (default: "/").
 */

interface LogoProps {
  variant?: "dark" | "light";
  kind?: "full" | "wordmark" | "icon";
  /** Height in px. Width is inferred from the image aspect ratio (~5.6:1). */
  height?: number;
  href?: string | null;
  className?: string;
}

const LOGO_CONFIG = {
  full: {
    src: "/logos/png/positives-logos_Positives-logo-full.png",
    ratio: 1577 / 585,
  },
  wordmark: {
    src: "/logos/png/positives-logos_positives-wordmark.png",
    ratio: 1577 / 458,
  },
  icon: {
    src: "/logos/png/positives-logos_positives-icon.png",
    ratio: 450 / 419,
  },
} as const;

export function Logo({
  variant = "dark",
  kind = "wordmark",
  height = 28,
  href = "/",
  className = "",
}: LogoProps) {
  const { src, ratio } = LOGO_CONFIG[kind];
  const width = Math.round(height * ratio);
  const img = (
    <Image
      src={src}
      alt="Positives"
      width={width}
      height={height}
      priority
      style={{
        height,
        width,
        display: "block",
        filter: variant === "light" ? "brightness(0) invert(1)" : "none",
      }}
    />
  );

  if (href === null) return <span className={className}>{img}</span>;

  return (
    <Link
      href={href}
      className={`inline-flex items-center hover:opacity-75 transition-opacity ${className}`}
      aria-label="Positives — home"
    >
      {img}
    </Link>
  );
}
