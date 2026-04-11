"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * components/marketing/StickyCtaBar.tsx
 * Appears on mobile after the hero CTA scrolls out of view.
 * Uses IntersectionObserver on a sentinel element placed at the
 * bottom of the hero section. Fades in smoothly, stays fixed at
 * the bottom with safe-area padding for notched iPhones.
 */

interface StickyCtaBarProps {
  /** Ref to the sentinel element at the bottom of the hero section */
  sentinelRef: React.RefObject<HTMLDivElement | null>;
  href: string;
  label: string;
}

export function StickyCtaBar({ sentinelRef, href, label }: StickyCtaBarProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [sentinelRef]);

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        background: "rgba(18,20,23,0.96)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        animation: "sticky-cta-in 0.25s ease both",
      }}
    >
      <style>{`
        @keyframes sticky-cta-in {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
      <div className="flex flex-col gap-2 px-4 py-3">
        <Link
          href={href}
          className="flex items-center justify-center font-semibold rounded-full text-sm"
          style={{
            background: "linear-gradient(135deg, #2F6FED 0%, #245DD0 100%)",
            color: "#FFFFFF",
            padding: "0.9rem 1.25rem",
            letterSpacing: "-0.01em",
            boxShadow: "0 4px 18px rgba(47,111,237,0.35)",
          }}
        >
          {label}
        </Link>
        <p
          className="text-center text-[11px] font-medium"
          style={{ color: "rgba(255,255,255,0.72)", lineHeight: "1.35" }}
        >
          From $37/month · Cancel anytime · 30-day guarantee
        </p>
      </div>
    </div>
  );
}
