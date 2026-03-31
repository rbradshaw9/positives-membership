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
  /** Height in px. Width is inferred from the image aspect ratio (~5.6:1). */
  height?: number;
  href?: string | null;
  className?: string;
}

export function Logo({
  variant = "dark",
  height = 28,
  href = "/",
  className = "",
}: LogoProps) {
  const img = (
    <Image
      src="/logos/png/positives-logos_positives-wordmark.png"
      alt="Positives"
      width={Math.round(height * 5.6)}
      height={height}
      priority
      style={{
        height,
        width: "auto",
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
