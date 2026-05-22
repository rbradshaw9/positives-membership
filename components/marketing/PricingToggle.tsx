"use client";

import { useState, useTransition } from "react";
import { getGuestCheckoutUrl } from "@/app/join/actions";
import { track } from "@/lib/analytics/ga";
import { getStoredFirstPromoterRefId } from "@/lib/firstpromoter/referral";

/**
 * components/marketing/PricingToggle.tsx
 *
 * Two-tier layout: Positives ($37/mo) and Positives Plus ($97/mo).
 * Plus card is the conversion hero — visually elevated, outcome-first copy,
 * "Most Popular" badge, teal glow border.
 */

interface PricingToggleProps {
  level1Monthly: string;
  level1Annual: string;
  level2Monthly: string;
  level2Annual: string;
  // Legacy props kept for callers that still pass them — ignored
  level3Monthly?: string;
  level3Annual?: string;
  level4Monthly?: string;
  level4Annual?: string;
  isAuthenticated?: boolean;
  userEmail?: string | null;
  initialError?: string | null;
  /** @deprecated */
  monthlyPriceId?: string;
  /** @deprecated */
  annualPriceId?: string;
  sourcePath?: string;
  launchCohort?: "alpha" | "beta" | "live";
  launchSource?: string;
  launchCampaignCode?: string | null;
  showCoachingCta?: boolean;
}

function CheckIcon({ color = "#4E8C78" }: { color?: string }) {
  return (
    <span
      className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5"
      style={{ background: `${color}18` }}
      aria-hidden="true"
    >
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </span>
  );
}

function PlanCard({
  tier,
  billing,
  priceId,
  sourcePath,
  launchCohort,
  launchSource,
  launchCampaignCode,
}: {
  tier: 1 | 2;
  billing: "monthly" | "annual";
  priceId: string;
  sourcePath: string;
  launchCohort: string;
  launchSource: string;
  launchCampaignCode: string | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isPlus = tier === 2;

  const monthly = isPlus ? 97 : 37;
  const annual = isPlus ? 970 : 370;
  const annualPerMonth = Math.round(annual / 12);

  const handleCheckout = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    const fpr = getStoredFirstPromoterRefId();
    if (fpr) formData.set("fpr", fpr);

    track("begin_checkout", {
      currency: "USD",
      value: billing === "annual" ? annual : monthly,
      plan_level: `level_${tier}`,
      plan_name: isPlus ? "Positives Plus" : "Positives",
      billing_interval: billing,
      price_id: priceId ?? undefined,
      affiliate_attributed: Boolean(fpr),
      source_path: sourcePath,
      launch_cohort: launchCohort,
      launch_source: launchSource,
    });

    startTransition(async () => {
      const result = await getGuestCheckoutUrl(formData);
      if (result.url) {
        window.location.href = result.url;
      } else {
        setError(result.error ?? "Something went wrong. Please try again.");
      }
    });
  };

  return (
    <div
      className="relative flex flex-col rounded-3xl"
      style={{
        background: isPlus ? "#FFFFFF" : "#F9F7F4",
        border: isPlus
          ? "2px solid rgba(78,140,120,0.45)"
          : "1.5px solid rgba(221,215,207,0.7)",
        boxShadow: isPlus
          ? "0 0 0 4px rgba(78,140,120,0.08), 0 20px 56px rgba(18,20,23,0.12)"
          : "0 2px 8px rgba(18,20,23,0.04)",
        padding: "1.875rem",
        transform: isPlus ? "scale(1.02)" : "scale(1)",
        transformOrigin: "top center",
      }}
    >
      {/* Most Popular badge */}
      {isPlus && (
        <div
          className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-xs font-bold px-4 py-1.5 rounded-full"
          style={{
            background: "linear-gradient(135deg, #4E8C78 0%, #3D7363 100%)",
            color: "#FFFFFF",
            letterSpacing: "0.06em",
            whiteSpace: "nowrap",
            boxShadow: "0 4px 12px rgba(78,140,120,0.35)",
          }}
        >
          ✦ MOST POPULAR
        </div>
      )}

      {/* Header */}
      <div className="mb-5" style={{ marginTop: isPlus ? "0.5rem" : "0" }}>
        <p
          className="text-xs font-semibold uppercase mb-1.5"
          style={{ color: isPlus ? "#4E8C78" : "#9AA0A8", letterSpacing: "0.12em" }}
        >
          {isPlus ? "The full experience" : "Start here"}
        </p>
        <h3
          className="font-heading font-bold"
          style={{ fontSize: "1.4rem", letterSpacing: "-0.035em", color: "#121417", lineHeight: 1.1 }}
        >
          {isPlus ? "Positives Plus" : "Positives"}
        </h3>
        <p className="mt-1.5" style={{ fontSize: "0.875rem", color: "#68707A", lineHeight: 1.55 }}>
          {isPlus
            ? "Daily practice + live Q&A calls + event discounts"
            : "Daily practice content to build your foundation"}
        </p>
      </div>

      {/* Pricing */}
      <div className="mb-6">
        <div className="flex items-end gap-1.5">
          <span
            className="font-heading font-bold"
            style={{ fontSize: "3rem", letterSpacing: "-0.05em", color: "#121417", lineHeight: 1 }}
          >
            ${billing === "annual" ? annual : monthly}
          </span>
          <span style={{ fontSize: "0.875rem", color: "#9AA0A8", marginBottom: "0.45rem" }}>
            {billing === "annual" ? "/yr" : "/mo"}
          </span>
        </div>
        {billing === "annual" ? (
          <p className="mt-1 text-xs font-semibold" style={{ color: "#4E8C78" }}>
            About ${annualPerMonth}/mo — get two months free
          </p>
        ) : (
          <p className="mt-1 text-xs" style={{ color: "#9AA0A8" }}>
            or ${annual}/year — get two months free
          </p>
        )}
      </div>

      {/* Benefits */}
      <ul className="space-y-2.5 flex-1 mb-7">
        {(isPlus
          ? [
              "Everything in Positives",
              "Weekly live Q&A with Dr. Paul",
              "Access to all Q&A replays",
              "50% off live event tickets",
              "Priority community access",
            ]
          : [
              "Daily guided audio practice",
              "Weekly mindset principles",
              "Monthly theme from Dr. Paul",
              "Growing member content library",
              "30-day money-back guarantee",
            ]
        ).map((item) => (
          <li key={item} className="flex items-start gap-3">
            <CheckIcon color={isPlus ? "#4E8C78" : "#2F6FED"} />
            <span style={{ fontSize: "0.875rem", color: "#4A5360", lineHeight: 1.6 }}>{item}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <form onSubmit={handleCheckout}>
        <input type="hidden" name="priceId" value={priceId} />
        <input type="hidden" name="sourcePath" value={sourcePath} />
        <input type="hidden" name="launchCohort" value={launchCohort} />
        <input type="hidden" name="launchSource" value={launchSource} />
        {launchCampaignCode && (
          <input type="hidden" name="launchCampaignCode" value={launchCampaignCode} />
        )}
        <button
          type="submit"
          disabled={isPending || !priceId}
          className="w-full py-3.5 rounded-full text-sm font-semibold transition-all"
          style={{
            background: isPlus
              ? isPending ? "linear-gradient(135deg, #5FA88F 0%, #4E8C78 100%)" : "linear-gradient(135deg, #4E8C78 0%, #3D7363 100%)"
              : isPending ? "rgba(18,20,23,0.55)" : "#121417",
            color: "#FFFFFF",
            boxShadow: isPlus && !isPending ? "0 6px 20px rgba(78,140,120,0.30)" : "none",
            letterSpacing: "-0.01em",
            cursor: isPending ? "wait" : "pointer",
            opacity: isPending ? 0.85 : 1,
          }}
        >
          {isPending ? (
            <span className="flex items-center justify-center gap-2">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true" style={{ animation: "spin 0.8s linear infinite" }}>
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              Preparing checkout…
            </span>
          ) : isPlus ? (
            "Join Positives Plus →"
          ) : (
            "Start my practice →"
          )}
        </button>
        {error && (
          <p role="alert" className="text-xs mt-3 text-center" style={{ color: "#C0392B" }}>
            {error}
          </p>
        )}
      </form>
    </div>
  );
}

export function PricingToggle({
  level1Monthly,
  level1Annual,
  level2Monthly,
  level2Annual,
  sourcePath = "/join",
  launchCohort = "live",
  launchSource = "public_join",
  launchCampaignCode = null,
  showCoachingCta = true,
}: PricingToggleProps) {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");

  return (
    <div>
      {/* Billing toggle */}
      <div className="flex justify-center mb-3">
        <div
          role="group"
          aria-label="Billing interval"
          className="inline-flex items-center p-1 rounded-full"
          style={{ background: "rgba(18,20,23,0.06)", border: "1px solid rgba(221,215,207,0.6)" }}
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
                boxShadow: billing === interval ? "0 2px 8px rgba(18,20,23,0.08)" : "none",
                letterSpacing: "-0.01em",
              }}
            >
              {interval.charAt(0).toUpperCase() + interval.slice(1)}
              {interval === "annual" && (
                <span
                  className="ml-2 text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(78,140,120,0.15)", color: "#4E8C78", fontSize: "0.65rem", letterSpacing: "0.03em" }}
                >
                  2 MONTHS FREE
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <p className="text-center text-xs mb-10" style={{ color: "#B0A89E" }}>
        Annual billing locks in your rate and gives you two months free.
      </p>

      {/* Two-tier grid — Plus is wider/taller via scale */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 max-w-3xl mx-auto" style={{ alignItems: "start" }}>
        <PlanCard
          tier={1}
          billing={billing}
          priceId={level1Monthly && level1Annual ? (billing === "annual" ? level1Annual : level1Monthly) : level1Monthly}
          sourcePath={sourcePath}
          launchCohort={launchCohort}
          launchSource={launchSource}
          launchCampaignCode={launchCampaignCode}
        />
        <PlanCard
          tier={2}
          billing={billing}
          priceId={billing === "annual" ? level2Annual : level2Monthly}
          sourcePath={sourcePath}
          launchCohort={launchCohort}
          launchSource={launchSource}
          launchCampaignCode={launchCampaignCode}
        />
      </div>

      {/* Coaching add-on callout */}
      {showCoachingCta && (
        <div
          className="mt-10 rounded-2xl px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
          style={{
            background: "rgba(18,20,23,0.03)",
            border: "1px solid rgba(221,215,207,0.6)",
          }}
        >
          <p style={{ fontSize: "0.9rem", color: "#68707A", lineHeight: 1.6 }}>
            <span className="font-semibold" style={{ color: "#121417" }}>Want 1:1 coaching?</span>{" "}
            Add coaching sessions to any membership — starting at $225/session.
          </p>
          <a
            href="/coaching-packages"
            className="flex-shrink-0 text-sm font-semibold rounded-full px-5 py-2.5 transition-colors"
            style={{
              background: "#121417",
              color: "#FFFFFF",
              letterSpacing: "-0.01em",
              whiteSpace: "nowrap",
            }}
          >
            View coaching options →
          </a>
        </div>
      )}
    </div>
  );
}
