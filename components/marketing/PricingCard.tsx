"use client";

/**
 * components/marketing/PricingCard.tsx
 *
 * Payment-first: Level 1 CTA submits directly to startGuestCheckout
 * via a <form> with a hidden priceId input. No auth required before
 * Stripe Checkout.
 *
 * Level 2, 3 — coming soon, disabled CTA (unchanged).
 *
 * Props change from Pass 1:
 *   Added: priceId (string | null) — only meaningful for Level 1
 */

import { useFormStatus } from "react-dom";
import { startGuestCheckoutFormAction } from "@/app/join/actions";

type Billing = "monthly" | "annual";
type Level = 1 | 2 | 3;

interface PricingCardProps {
  level: Level;
  billing: Billing;
  comingSoon?: boolean;
  /** Stripe price ID for this card — required for Level 1 */
  priceId?: string;
}

// ── Card data ───────────────────────────────────────────────────────────────

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
      "Live weekly group sessions",
      "Member discussions & community Q&A",
      "All event replays",
    ],
  },
  3: {
    title: "Coaching Circle",
    tagline: "Small group coaching with Dr. Paul's team.",
    badge: "Coming Soon",
    benefits: [
      "Everything in Events",
      "Small group coaching sessions",
      "Priority Q&A with coaches",
      "Deep-dive workshops",
    ],
  },
} as const;

// ── Check icon ──────────────────────────────────────────────────────────────

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

// ── Level 1 price block ─────────────────────────────────────────────────────

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
          Get 2 months free
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

// ── Submit button — shows pending state via useFormStatus ───────────────────

function CheckoutButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      id="pricing-card-level1-cta"
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

// ── Main card ───────────────────────────────────────────────────────────────

export function PricingCard({
  level,
  billing,
  comingSoon = false,
  priceId,
}: PricingCardProps) {
  const card = CARDS[level];
  const isActive = level === 1 && !comingSoon;

  return (
    <div
      className="relative flex flex-col rounded-3xl"
      style={{
        background: isActive ? "#FFFFFF" : "#F9F7F4",
        border: isActive
          ? "1.5px solid rgba(47,111,237,0.22)"
          : "1.5px solid rgba(221,215,207,0.7)",
        boxShadow: isActive
          ? "0 16px 48px rgba(18,20,23,0.10), 0 2px 8px rgba(47,111,237,0.06)"
          : "0 2px 8px rgba(18,20,23,0.04)",
        padding: "1.75rem",
        opacity: comingSoon ? 0.72 : 1,
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
              background: isActive ? "rgba(78,140,120,0.12)" : "rgba(18,20,23,0.06)",
              color: isActive ? "#4E8C78" : "#9AA0A8",
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
        {isActive ? (
          <Level1Price billing={billing} />
        ) : (
          <p className="text-sm font-medium" style={{ color: "#B0A89E", fontStyle: "italic" }}>
            Pricing coming soon
          </p>
        )}
      </div>

      {/* ── Benefits ────────────────────────────────────────── */}
      <ul className="space-y-2.5 flex-1 mb-7">
        {card.benefits.map((item) => (
          <li key={item} className="flex items-start gap-3">
            <CheckIcon muted={comingSoon} />
            <span style={{ fontSize: "0.875rem", color: comingSoon ? "#9AA0A8" : "#4A5360", lineHeight: 1.65 }}>
              {item}
            </span>
          </li>
        ))}
      </ul>

      {/* ── CTA ─────────────────────────────────────────────── */}
      {isActive ? (
        // Guest checkout: submit priceId directly to Stripe — no prior auth needed
        <form action={startGuestCheckoutFormAction}>
          <input type="hidden" name="priceId" value={priceId ?? ""} />
          <CheckoutButton />
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
