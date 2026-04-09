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
}

export function StickyCtaBar({ sentinelRef }: StickyCtaBarProps) {
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
      <div className="flex items-center gap-3 px-5 py-3">
        <Link
          href="/join"
          className="flex-1 flex items-center justify-center font-semibold rounded-full text-sm"
          style={{
            background: "linear-gradient(135deg, #2F6FED 0%, #245DD0 100%)",
            color: "#FFFFFF",
            padding: "0.8rem 1.5rem",
            letterSpacing: "-0.01em",
            boxShadow: "0 4px 18px rgba(47,111,237,0.35)",
          }}
        >
          Try it for 30 days →
        </Link>
        <div className="text-right flex-shrink-0">
          <p className="text-xs font-medium" style={{ color: "#FFFFFF", lineHeight: "1.3" }}>From $37/mo</p>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)", lineHeight: "1.3" }}>Cancel anytime</p>
        </div>
      </div>
    </div>
  );
}
