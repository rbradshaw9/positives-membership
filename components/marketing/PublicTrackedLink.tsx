"use client";

import Link, { type LinkProps } from "next/link";
import { appendPublicTrackingParamsFromEntries } from "@/lib/marketing/public-query-params";

type PublicTrackedLinkProps = LinkProps & {
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
  "aria-label"?: string;
  target?: string;
  rel?: string;
};

export function PublicTrackedLink({
  href,
  children,
  ...props
}: PublicTrackedLinkProps) {
  const resolvedHref =
    typeof href === "string" && typeof window !== "undefined"
      ? appendPublicTrackingParamsFromEntries(
          href,
          new URLSearchParams(window.location.search).entries(),
        )
      : href;

  return (
    <Link href={resolvedHref} {...props}>
      {children}
    </Link>
  );
}
