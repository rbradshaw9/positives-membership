"use client";

import { useState } from "react";
import { PricingCard } from "./PricingCard";
import { track } from "@/lib/analytics/ga";

/**
 * components/marketing/PricingToggle.tsx
 *
 * Owns the billing interval state ("monthly" | "annual").
 * Keeps the join page focused on the live offers without pushing executive
 * coaching into the main pricing grid.
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
  sourcePath?: string;
  launchCohort?: "alpha" | "beta" | "live";
  launchSource?: string;
  launchCampaignCode?: string | null;
  showCoachingCta?: boolean;
}

export function PricingToggle({
  level1Monthly,
  level1Annual,
  level2Monthly,
  level2Annual,
  level3Monthly,
  level3Annual,
  sourcePath = "/join",
  launchCohort = "live",
  launchSource = "public_join",
  launchCampaignCode = null,
  showCoachingCta = true,
}: PricingToggleProps) {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");

  const prices = {
    1: billing === "annual" ? level1Annual : level1Monthly,
    2: billing === "annual" ? level2Annual : level2Monthly,
    3: billing === "annual" ? level3Annual : level3Monthly,
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
        Annual billing is available for all live levels.
      </p>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <PricingCard
          level={1}
          billing={billing}
          priceId={prices[1]}
          sourcePath={sourcePath}
          launchCohort={launchCohort}
          launchSource={launchSource}
          launchCampaignCode={launchCampaignCode}
        />
        <PricingCard
          level={2}
          billing={billing}
          priceId={prices[2]}
          sourcePath={sourcePath}
          launchCohort={launchCohort}
          launchSource={launchSource}
          launchCampaignCode={launchCampaignCode}
        />
        <PricingCard
          level={3}
          billing={billing}
          priceId={prices[3]}
          sourcePath={sourcePath}
          launchCohort={launchCohort}
          launchSource={launchSource}
          launchCampaignCode={launchCampaignCode}
        />
      </div>

      {showCoachingCta ? (
        <>
          <section
            className="mt-6 rounded-3xl p-6"
            style={{
              background: "linear-gradient(180deg, rgba(47,111,237,0.05) 0%, rgba(78,140,120,0.05) 100%)",
              border: "1.5px solid rgba(47,111,237,0.14)",
              boxShadow: "0 10px 28px rgba(18,20,23,0.05)",
            }}
          >
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <p
                  className="text-xs font-semibold uppercase mb-3"
                  style={{ color: "#2F6FED", letterSpacing: "0.12em" }}
                >
                  Personalized coaching
                </p>
                <h3
                  className="font-heading font-bold mb-3"
                  style={{
                    fontSize: "clamp(1.35rem, 2.5vw, 1.7rem)",
                    letterSpacing: "-0.035em",
                    lineHeight: "1.08",
                    color: "#121417",
                    textWrap: "balance",
                  }}
                >
                  Looking for the most personalized support?
                </h3>
                <p style={{ fontSize: "0.95rem", color: "#4A5360", lineHeight: "1.68" }}>
                  If you already know you want a higher-touch path, schedule a Breakthrough Session
                  and we&apos;ll help you decide whether coaching is the right fit.
                </p>
              </div>

              <a
                href="https://calendly.com/positives/breakthrough"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() =>
                  track("breakthrough_session_clicked", {
                    source_path: sourcePath,
                    launch_cohort: launchCohort,
                    launch_source: launchSource,
                    launch_campaign_code: launchCampaignCode ?? undefined,
                    cta_location: "join_below_cards",
                  })
                }
                className="inline-flex items-center justify-center rounded-full font-semibold"
                style={{
                  background: "#121417",
                  color: "#FFFFFF",
                  fontSize: "0.95rem",
                  letterSpacing: "-0.01em",
                  padding: "0.9rem 1.4rem",
                  minWidth: "260px",
                }}
              >
                Schedule a Breakthrough Session →
              </a>
            </div>
          </section>

          <p className="text-center text-xs mt-5" style={{ color: "#9AA0A8" }}>
            Executive coaching is handled separately so we can guide you to the right fit.
          </p>
        </>
      ) : null}
    </div>
  );
}
