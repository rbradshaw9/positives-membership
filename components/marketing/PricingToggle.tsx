"use client";

import { useState } from "react";
import { PricingCard } from "./PricingCard";
import { AuthGate } from "./AuthGate";

/**
 * components/marketing/PricingToggle.tsx
 *
 * Owns the billing interval state ("monthly" | "annual").
 * Renders the toggle UI, three pricing cards, and the AuthGate below.
 *
 * Level 1:  fully interactive — toggle affects price display and priceId
 * Level 2:  coming soon — static, disabled CTA
 * Level 3:  coming soon — static, disabled CTA
 */

interface PricingToggleProps {
  isAuthenticated: boolean;
  userEmail: string | null;
  initialError: string | null;
  /** Passed from server so price IDs are never bundled into client JS */
  monthlyPriceId: string;
  annualPriceId: string;
}

export function PricingToggle({
  isAuthenticated,
  userEmail,
  initialError,
  monthlyPriceId,
  annualPriceId,
}: PricingToggleProps) {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");

  const selectedPriceId =
    billing === "annual" ? annualPriceId : monthlyPriceId;

  return (
    <div>
      {/* ── Billing toggle ────────────────────────────────── */}
      <div className="flex justify-center mb-4">
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
              className="relative px-6 py-2 text-sm font-semibold rounded-full transition-all"
              style={{
                background: billing === interval ? "#FFFFFF" : "transparent",
                color: billing === interval ? "#121417" : "#9AA0A8",
                boxShadow:
                  billing === interval
                    ? "0 2px 8px rgba(18,20,23,0.08)"
                    : "none",
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
                    letterSpacing: "0.04em",
                  }}
                >
                  SAVE 17%
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <p
        className="text-center text-xs mb-12"
        style={{ color: "#B0A89E" }}
      >
        Annual pricing currently applies to Level 1 membership.
      </p>

      {/* ── Pricing cards ─────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
        <PricingCard level={1} billing={billing} />
        <PricingCard level={2} billing={billing} comingSoon />
        <PricingCard level={3} billing={billing} comingSoon />
      </div>

      {/* ── Auth gate (Level 1 only) ───────────────────────── */}
      <div id="start" className="max-w-md mx-auto scroll-mt-24">
        <AuthGate
          isAuthenticated={isAuthenticated}
          userEmail={userEmail}
          initialError={initialError}
          priceId={selectedPriceId}
        />
      </div>
    </div>
  );
}
