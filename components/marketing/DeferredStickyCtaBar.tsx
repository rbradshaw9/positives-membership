"use client";

import dynamic from "next/dynamic";

const StickyCtaBar = dynamic(
  () => import("./StickyCtaBar").then((mod) => mod.StickyCtaBar),
  { ssr: false }
);

interface DeferredStickyCtaBarProps {
  sentinelId: string;
  href: string;
  label: string;
}

export function DeferredStickyCtaBar(props: DeferredStickyCtaBarProps) {
  return <StickyCtaBar {...props} />;
}
