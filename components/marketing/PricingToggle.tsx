"use client";

import { useState } from "react";
import { PricingCard } from "./PricingCard";
import { AuthGate } from "./AuthGate";

/**
 * components/marketing/PricingToggle.tsx
 *
 * Owns the billing interval state ("monthly" | "annual") and renders
 * the three pricing cards + the Level 1 auth gate below them.
 *
 * Level 1:  fully interactive — toggle affects price display and priceId
 * Level 2:  coming soon — static, disabled CTA
 * Level 3:  coming soon — static, disabled CTA
 */

interface PricingToggleProps {
  isAuthenticated: boolean;
  userEmail: string | null;
  initialError: string | null;
  /** Passed in from the server so we never bundle secret env vars client-side */
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
      {/* ── Billing toggle ─────────────────────────────────────── */}
      <div className="flex justify-center mb-3">
        <div
          className="inline-flex border border-border rounded-xl overflow-hidden"
          role="group"
          aria-label="Billing interval"
        >
          <button
            type="button"
            onClick={() => setBilling("monthly")}
            className={`px-6 py-2.5 text-sm font-medium transition-colors ${
              billing === "monthly"
                ? "bg-primary text-white"
                : "bg-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setBilling("annual")}
            className={`px-6 py-2.5 text-sm font-medium transition-colors ${
              billing === "annual"
                ? "bg-primary text-white"
                : "bg-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Annual
          </button>
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground mb-10">
        Save two months with annual billing
      </p>

      {/* ── Pricing cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-14">
        <PricingCard level={1} billing={billing} />
        <PricingCard level={2} billing={billing} comingSoon />
        <PricingCard level={3} billing={billing} comingSoon />
      </div>

      {/* ── Auth gate (Level 1 only) ───────────────────────────── */}
      <div className="max-w-sm mx-auto">
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
