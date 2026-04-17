"use client";

/**
 * components/marketing/PricingCard.tsx
 *
 * Supports all 4 Positives membership tiers.
 *
 * Activation logic (no `comingSoon` prop needed):
 *   - priceId is a non-empty string → real checkout form (card is live)
 *   - priceId is empty/null/undefined → "Notify me" disabled button
 *
 * Pricing for L2/L3/L4:
 *   - When no priceId is set, shows a tasteful TBD block
 *   - When priceId is set, pricing data is read from PRICING constant
 *
 * FirstPromoter affiliate tracking:
 *   When a visitor arrives via an affiliate link (?fpr=code), FP JS sets a
 *   referral cookie. On positives.life we currently observe `_fprom_ref`,
 *   while older/local flows may still expose `_fprom_track`. We read either
 *   cookie client-side
 *   and inject it as a hidden form input so the server action can embed it
 *   in Stripe checkout metadata. The webhook then stores it permanently on
 *   the member row for lifetime affiliate genealogy linking.
 *
 *   Fallback: also read the ?fpr= URL query param directly for cases where
 *   the cookie hasn't been set yet (e.g. same-tab navigation).
 */

import { useState, useTransition } from "react";
import { getGuestCheckoutUrl } from "@/app/join/actions";
import { track } from "@/lib/analytics/ga";
import { getStoredFirstPromoterRefId } from "@/lib/firstpromoter/referral";

type Billing = "monthly" | "annual";
type Level = 1 | 2 | 3 | 4;

interface PricingCardProps {
  level: Level;
  billing: Billing;
  /** Stripe price ID — if empty/null the card renders "Notify me" */
  priceId?: string | null;
  sourcePath?: string;
  launchCohort?: "alpha" | "beta" | "live";
  launchSource?: string;
  launchCampaignCode?: string | null;
}

// ── Card content ─────────────────────────────────────────────────────────────

const CARDS = {
  1: {
    title: "Membership",
    tagline: "Daily practice, steady guidance, and the full core library.",
    badge: "Founding Member Rate",
    benefits: [
      "Daily guided audio practice · fresh every morning",
      "Weekly reflections and research-backed practices",
      "Monthly theme with guided reflection from Dr. Paul",
      "Full member library access",
    ],
  },
  2: {
    title: "Membership + Events",
    tagline: "Everything in Membership, plus live events and replay access.",
    badge: "Live now",
    benefits: [
      "Everything in Membership",
      "Live member events",
      "Event replays in your Events area",
      "A simple place to find upcoming sessions and replays",
      "A stronger weekly rhythm beyond the daily practice",
    ],
  },
  3: {
    title: "Coaching Circle",
    tagline: "Everything in Membership + Events, plus weekly group coaching.",
    badge: "Live now",
    benefits: [
      "Everything in Membership + Events",
      "Weekly group coaching sessions",
      "Coaching session replays",
      "A deeper accountability rhythm",
      "A higher-touch path when you want more support",
    ],
  },
  4: {
    title: "Executive Coaching",
    tagline: "Our highest-touch path for personalized support.",
    badge: "Coming Soon",
    benefits: [
      "Everything in Coaching Circle",
      "Bi-weekly private 1:1 sessions",
      "Personalized coaching plan",
      "Direct access to Dr. Paul",
    ],
  },
} as const;

// ── Pricing data (filled in when Stripe prices are ready) ────────────────────

const PRICING = {
  1: {
    monthly: { regular: 97, offer: 37 },
    annual: { total: 370, perMonth: 31 },
  },
  2: {
    monthly: { offer: 97 },
    annual: { total: 970, perMonth: 81 },
  },
  3: {
    monthly: { offer: 297 },
    annual: { total: 2970, perMonth: 248 },
  },
  4: null,
} as const;

// ── Subcomponents ────────────────────────────────────────────────────────────

function CheckIcon({ muted = false }: { muted?: boolean }) {
  return (
    <span
      className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5"
      style={{ background: muted ? "rgba(18,20,23,0.06)" : "rgba(78,140,120,0.14)" }}
    >
      <svg
        width="9"
        height="9"
        viewBox="0 0 24 24"
        fill="none"
        stroke={muted ? "#9AA0A8" : "#4E8C78"}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </span>
  );
}

function Level1Price({ billing }: { billing: Billing }) {
  if (billing === "annual") {
    return (
      <div>
        <div className="flex items-baseline gap-1.5 mb-1.5">
          <span
            className="font-heading font-bold"
            style={{ fontSize: "2.75rem", letterSpacing: "-0.045em", color: "#121417", lineHeight: 1 }}
          >
            $370
          </span>
          <span style={{ fontSize: "0.9rem", color: "#9AA0A8" }}>/year</span>
        </div>
        <p className="text-xs font-semibold" style={{ color: "#4E8C78" }}>
          2 months free · $31/mo
        </p>
      </div>
    );
  }
  return (
    <div>
      <div className="flex items-baseline gap-1 mb-1">
        <span className="text-sm line-through" style={{ color: "#B0A89E" }}>$97</span>
        <span
          className="font-heading font-bold"
          style={{ fontSize: "2.75rem", letterSpacing: "-0.045em", color: "#121417", lineHeight: 1 }}
        >
          $37
        </span>
        <span style={{ fontSize: "0.9rem", color: "#9AA0A8" }}>/month</span>
      </div>
      <p className="text-xs" style={{ color: "#9AA0A8" }}>Cancel anytime · No contracts</p>
    </div>
  );
}

function TierPrice({ level, billing }: { level: 1 | 2 | 3; billing: Billing }) {
  const pricing = PRICING[level];

  if (level === 1) {
    return <Level1Price billing={billing} />;
  }

  if (!pricing) {
    return <PricingTbd />;
  }

  if (billing === "annual") {
    return (
      <div>
        <div className="flex items-baseline gap-1.5 mb-1.5">
          <span
            className="font-heading font-bold"
            style={{ fontSize: "2.75rem", letterSpacing: "-0.045em", color: "#121417", lineHeight: 1 }}
          >
            ${pricing.annual.total}
          </span>
          <span style={{ fontSize: "0.9rem", color: "#9AA0A8" }}>/year</span>
        </div>
        <p className="text-xs font-semibold" style={{ color: "#4E8C78" }}>
          Founding rate · about ${pricing.annual.perMonth}/mo
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-baseline gap-1 mb-1">
        <span
          className="font-heading font-bold"
          style={{ fontSize: "2.75rem", letterSpacing: "-0.045em", color: "#121417", lineHeight: 1 }}
        >
          ${pricing.monthly.offer}
        </span>
        <span style={{ fontSize: "0.9rem", color: "#9AA0A8" }}>/month</span>
      </div>
      <p className="text-xs" style={{ color: "#9AA0A8" }}>Cancel anytime · No contracts</p>
    </div>
  );
}

function PricingTbd() {
  return (
    <div>
      <p
        className="font-heading font-bold"
        style={{ fontSize: "1.5rem", letterSpacing: "-0.04em", color: "#CBD2D9", lineHeight: 1, marginBottom: "0.25rem" }}
      >
        Pricing soon
      </p>
      <p className="text-xs" style={{ color: "#9AA0A8" }}>Join waitlist to be notified first</p>
    </div>
  );
}

function CheckoutButton({ pending }: { pending: boolean }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full inline-flex items-center justify-center font-semibold rounded-full transition-opacity"
      style={{
        background: pending
          ? "linear-gradient(135deg, #5A8FF4 0%, #4A7DE0 100%)"
          : "linear-gradient(135deg, #2F6FED 0%, #245DD0 100%)",
        color: "#FFFFFF",
        boxShadow: pending ? "none" : "0 6px 20px rgba(47,111,237,0.28)",
        letterSpacing: "-0.01em",
        fontSize: "0.9rem",
        padding: "0.85rem 1.5rem",
        cursor: pending ? "wait" : "pointer",
        opacity: pending ? 0.8 : 1,
      }}
    >
      {pending ? (
        <span className="flex items-center gap-2">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            aria-hidden="true"
            style={{ animation: "spin 0.8s linear infinite" }}
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          Preparing checkout…
        </span>
      ) : (
        "Start your practice →"
      )}
    </button>
  );
}

// ── Main card ────────────────────────────────────────────────────────────────

export function PricingCard({
  level,
  billing,
  priceId,
  sourcePath = "/join",
  launchCohort = "live",
  launchSource = "public_join",
  launchCampaignCode = null,
}: PricingCardProps) {
  const card = CARDS[level];
  const isLive = !!priceId; // card is live when a real Stripe price ID is configured
  const isHighlighted = level === 1; // Level 1 gets the elevated visual treatment
  const badgeLabel = isLive || level === 1 ? card.badge : "Coming soon";
  const emphasizeBadge = isHighlighted || isLive;

  const pricingData = PRICING[level as keyof typeof PRICING];

  const checkoutValue =
    level === 1
      ? billing === "annual"
        ? PRICING[1].annual.total
        : PRICING[1].monthly.offer
      : undefined;

  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleCheckout = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCheckoutError(null);
    const formData = new FormData(e.currentTarget);
    const fpr = getStoredFirstPromoterRefId();

    if (fpr) {
      formData.set("fpr", fpr);
    }

    track("begin_checkout", {
      currency: "USD",
      value: checkoutValue,
      plan_level: `level_${level}`,
      plan_name: card.title,
      billing_interval: billing,
      price_id: priceId ?? undefined,
      affiliate_attributed: Boolean(fpr),
      affiliate_code: fpr ?? undefined,
      source_path: sourcePath,
      launch_cohort: launchCohort,
      launch_source: launchSource,
      launch_campaign_code: launchCampaignCode ?? undefined,
    });

    startTransition(async () => {
      const result = await getGuestCheckoutUrl(formData);
      if (result.url) {
        // Full browser navigation — bypasses Next.js router for reliable
        // external URL redirect to checkout.stripe.com
        window.location.href = result.url;
      } else {
        track("checkout_error", {
          plan_level: `level_${level}`,
          billing_interval: billing,
          price_id: priceId ?? undefined,
          affiliate_attributed: Boolean(fpr),
          source_path: sourcePath,
          launch_cohort: launchCohort,
          launch_source: launchSource,
        });
        setCheckoutError(result.error ?? "Something went wrong. Please try again.");
      }
    });
  };

  return (
    <div
      className="relative flex flex-col rounded-3xl"
      style={{
        background: isHighlighted ? "#FFFFFF" : "#F9F7F4",
        border: isHighlighted
          ? "1.5px solid rgba(47,111,237,0.22)"
          : "1.5px solid rgba(221,215,207,0.7)",
        boxShadow: isHighlighted
          ? "0 16px 48px rgba(18,20,23,0.10), 0 2px 8px rgba(47,111,237,0.06)"
          : "0 2px 8px rgba(18,20,23,0.04)",
        padding: "1.75rem",
        opacity: (!isLive && level !== 1) ? 0.72 : 1,
      }}
    >
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="mb-5">
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <h3
            className="font-heading font-bold"
            style={{ fontSize: "1.15rem", letterSpacing: "-0.03em", color: "#121417", lineHeight: 1.2 }}
          >
            {card.title}
          </h3>
          {badgeLabel ? (
            <span
              className="flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{
                background: emphasizeBadge ? "rgba(78,140,120,0.12)" : "rgba(18,20,23,0.06)",
                color: emphasizeBadge ? "#4E8C78" : "#9AA0A8",
                letterSpacing: "0.02em",
                whiteSpace: "nowrap",
              }}
            >
              {badgeLabel}
            </span>
          ) : null}
        </div>
        <p style={{ fontSize: "0.875rem", color: "#9AA0A8", lineHeight: 1.5 }}>{card.tagline}</p>
      </div>

      {/* ── Pricing ─────────────────────────────────────────── */}
      <div className="mb-6">
        {level === 1 || level === 2 || level === 3 ? (
          <TierPrice level={level} billing={billing} />
        ) : pricingData ? (
          // Future: render real pricing when pricingData is populated
          <PricingTbd />
        ) : (
          <PricingTbd />
        )}
      </div>

      {/* ── Benefits ────────────────────────────────────────── */}
      <p
        className="text-[11px] font-semibold uppercase mb-3"
        style={{ color: "#9AA0A8", letterSpacing: "0.08em" }}
      >
        Included
      </p>
      <ul className="space-y-2.5 flex-1 mb-7">
        {card.benefits.map((item) => (
          <li key={item} className="flex items-start gap-3">
            <CheckIcon muted={!isLive && level !== 1} />
            <span
              style={{
                fontSize: "0.875rem",
                color: (!isLive && level !== 1) ? "#9AA0A8" : "#4A5360",
                lineHeight: 1.65,
              }}
            >
              {item}
            </span>
          </li>
        ))}
      </ul>

      {/* ── CTA ─────────────────────────────────────────────── */}
      {isLive ? (
        <form onSubmit={handleCheckout}>
          <input type="hidden" name="priceId" value={priceId} />
          <input type="hidden" name="sourcePath" value={sourcePath} />
          <input type="hidden" name="launchCohort" value={launchCohort} />
          <input type="hidden" name="launchSource" value={launchSource} />
          {launchCampaignCode ? (
            <input type="hidden" name="launchCampaignCode" value={launchCampaignCode} />
          ) : null}
          <CheckoutButton pending={isPending} />
          {checkoutError && (
            <p
              role="alert"
              className="text-xs mt-3 text-center"
              style={{ color: "#C0392B" }}
            >
              {checkoutError}
            </p>
          )}
        </form>
      ) : (
        <button
          type="button"
          disabled
          aria-disabled="true"
          className="w-full py-3.5 rounded-full text-sm font-semibold"
          style={{
            background: "rgba(18,20,23,0.08)",
            color: "#9AA0A8",
            cursor: "not-allowed",
            letterSpacing: "-0.01em",
          }}
        >
          Notify me when available
        </button>
      )}
    </div>
  );
}
