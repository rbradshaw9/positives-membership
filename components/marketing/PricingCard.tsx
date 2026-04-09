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
 *   cookie (_fprom_track) with their referral code. We read it client-side
 *   and inject it as a hidden form input so the server action can embed it
 *   in Stripe checkout metadata. The webhook then stores it permanently on
 *   the member row for lifetime affiliate genealogy linking.
 *
 *   Fallback: also read the ?fpr= URL query param directly for cases where
 *   the cookie hasn't been set yet (e.g. same-tab navigation).
 */

import { useEffect, useState, useTransition } from "react";
import { getGuestCheckoutUrl } from "@/app/join/actions";

type Billing = "monthly" | "annual";
type Level = 1 | 2 | 3 | 4;

interface PricingCardProps {
  level: Level;
  billing: Billing;
  /** Stripe price ID — if empty/null the card renders "Notify me" */
  priceId?: string | null;
}

// ── Card content ─────────────────────────────────────────────────────────────

const CARDS = {
  1: {
    title: "Membership",
    tagline: "The complete daily practice.",
    badge: "Founding Member Rate",
    benefits: [
      "Daily mindset practice · fresh every morning",
      "Weekly principles & research-backed practices",
      "Monthly masterclass with Dr. Paul (live + replay)",
      "Member library access · every past session",
    ],
  },
  2: {
    title: "Membership + Events",
    tagline: "Everything in Membership, plus live access.",
    badge: "Coming Soon",
    benefits: [
      "Everything in Membership",
      "Live virtual events & workshops",
      "Member Q&A with Dr. Paul's team",
      "All event replays in your library",
    ],
  },
  3: {
    title: "Coaching Circle",
    tagline: "Small group coaching with Dr. Paul.",
    badge: "Coming Soon",
    benefits: [
      "Everything in Events",
      "Weekly group coaching sessions",
      "Priority Q&A with coaches",
      "Deep-dive implementation support",
    ],
  },
  4: {
    title: "Executive Coaching",
    tagline: "Private 1:1 coaching with Dr. Paul.",
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
    monthly: { regular: 97, offer: 49 },
    annual: { total: 490, perMonth: 41 },
  },
  // Fill in when prices are confirmed:
  2: null,
  3: null,
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
            $490
          </span>
          <span style={{ fontSize: "0.9rem", color: "#9AA0A8" }}>/year</span>
        </div>
        <p className="text-xs font-semibold" style={{ color: "#4E8C78" }}>
          2 months free · $41/mo
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
          $49
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

export function PricingCard({ level, billing, priceId }: PricingCardProps) {
  const card = CARDS[level];
  const isLive = !!priceId; // card is live when a real Stripe price ID is configured
  const isHighlighted = level === 1; // Level 1 gets the elevated visual treatment

  const pricingData = PRICING[level as keyof typeof PRICING];

  // FirstPromoter affiliate tracking — read on mount.
  // Priority: URL ?fpr= param → _fprom_track cookie → null
  // Stored permanently on the member row for lifetime genealogy linking.
  const [fpr, setFpr] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Check URL param first (handles same-tab navigation before cookie is set)
    const urlParam = new URLSearchParams(window.location.search).get("fpr");
    if (urlParam) {
      setFpr(urlParam);
      return;
    }

    // 2. Read FirstPromoter cookie (_fprom_track stores the ref_id)
    const fpCookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith("_fprom_track="))
      ?.split("=")[1];
    if (fpCookie) setFpr(decodeURIComponent(fpCookie));
  }, []);

  const handleCheckout = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCheckoutError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await getGuestCheckoutUrl(formData);
      if (result.url) {
        // Full browser navigation — bypasses Next.js router for reliable
        // external URL redirect to checkout.stripe.com
        window.location.href = result.url;
      } else {
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
          <span
            className="flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{
              background: isHighlighted ? "rgba(78,140,120,0.12)" : "rgba(18,20,23,0.06)",
              color: isHighlighted ? "#4E8C78" : "#9AA0A8",
              letterSpacing: "0.02em",
              whiteSpace: "nowrap",
            }}
          >
            {card.badge}
          </span>
        </div>
        <p style={{ fontSize: "0.875rem", color: "#9AA0A8", lineHeight: 1.5 }}>{card.tagline}</p>
      </div>

      {/* ── Pricing ─────────────────────────────────────────── */}
      <div className="mb-6">
        {level === 1 ? (
          <Level1Price billing={billing} />
        ) : pricingData ? (
          // Future: render real pricing when pricingData is populated
          <PricingTbd />
        ) : (
          <PricingTbd />
        )}
      </div>

      {/* ── Benefits ────────────────────────────────────────── */}
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
          {/* FirstPromoter ref_id — injected when visitor arrived via affiliate link */}
          {fpr && <input type="hidden" name="fpr" value={fpr} />}
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
