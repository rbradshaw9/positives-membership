"use client";

import { useState } from "react";
import { PricingCard } from "./PricingCard";

/**
 * components/marketing/PricingToggle.tsx
 *
 * Owns the billing interval state ("monthly" | "annual").
 * Renders the toggle UI + all 4 pricing cards.
 *
 * Each card receives its priceId from the server (never bundled into client JS).
 * Cards where priceId is empty/null render a "Notify me" state automatically.
 */

interface PricingToggleProps {
  /** All price IDs resolved server-side from env — never exposed to client bundle */
  level1Monthly: string;
  level1Annual: string;
  level2Monthly: string;
  level2Annual: string;
  level3Monthly: string;
  level3Annual: string;
  /** L4 is admin-assigned only. Omit these and the card renders a 'Book a call' CTA. */
  level4Monthly?: string;
  level4Annual?: string;
  // Legacy props — no longer used but kept to avoid breaking callers
  isAuthenticated?: boolean;
  userEmail?: string | null;
  initialError?: string | null;
  /** @deprecated Use level1Monthly/level1Annual instead */
  monthlyPriceId?: string;
  /** @deprecated Use level1Monthly/level1Annual instead */
  annualPriceId?: string;
}

export function PricingToggle({
  level1Monthly,
  level1Annual,
  level2Monthly,
  level2Annual,
  level3Monthly,
  level3Annual,
  level4Monthly = "",
  level4Annual = "",
}: PricingToggleProps) {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");

  const prices = {
    1: billing === "annual" ? level1Annual : level1Monthly,
    2: billing === "annual" ? level2Annual : level2Monthly,
    3: billing === "annual" ? level3Annual : level3Monthly,
    4: billing === "annual" ? level4Annual : level4Monthly,
  };

  return (
    <div>
      {/* ── Billing toggle ────────────────────────────────── */}
      <div className="flex justify-center mb-3">
        <div
          role="group"
          aria-label="Billing interval"
          className="inline-flex items-center p-1 rounded-full"
          style={{
            background: "rgba(18,20,23,0.06)",
            border: "1px solid rgba(221,215,207,0.6)",
          }}
        >
          {(["monthly", "annual"] as const).map((interval) => (
            <button
              key={interval}
              type="button"
              onClick={() => setBilling(interval)}
              className="relative px-5 py-2 text-sm font-semibold rounded-full transition-all"
              style={{
                background: billing === interval ? "#FFFFFF" : "transparent",
                color: billing === interval ? "#121417" : "#9AA0A8",
                boxShadow:
                  billing === interval ? "0 2px 8px rgba(18,20,23,0.08)" : "none",
                letterSpacing: "-0.01em",
              }}
            >
              {interval.charAt(0).toUpperCase() + interval.slice(1)}
              {interval === "annual" && (
                <span
                  className="ml-2 text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{
                    background: "rgba(78,140,120,0.15)",
                    color: "#4E8C78",
                    fontSize: "0.65rem",
                    letterSpacing: "0.03em",
                  }}
                >
                  2 MONTHS FREE
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <p className="text-center text-xs mb-8" style={{ color: "#B0A89E" }}>
        Annual billing currently available for Level 1.
      </p>

      {/* ── Pricing cards — 2-col on mobile, 4-col on xl ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <PricingCard level={1} billing={billing} priceId={prices[1]} />
        <PricingCard level={2} billing={billing} priceId={prices[2]} />
        <PricingCard level={3} billing={billing} priceId={prices[3]} />
        <PricingCard level={4} billing={billing} priceId={prices[4]} />
      </div>
    </div>
  );
}
