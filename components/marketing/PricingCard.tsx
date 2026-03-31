/**
 * components/marketing/PricingCard.tsx
 *
 * Renders a single pricing tier card.
 *
 * Level 1 — active, billing-toggle-aware
 * Level 2, 3 — coming soon, static, disabled CTA
 *
 * This is a pure presentational component (no client state).
 * Billing state is passed down from PricingToggle.
 */

type Billing = "monthly" | "annual";
type Level = 1 | 2 | 3;

interface PricingCardProps {
  level: Level;
  billing: Billing;
  comingSoon?: boolean;
}

// ── Card data ──────────────────────────────────────────────────────────────

const CARDS = {
  1: {
    title: "Membership",
    tagline: "Daily guided audio with Dr. Paul Jenkins.",
    badge: "Most popular",
    benefits: [
      "Fresh guided audio from Dr. Paul · every morning",
      "Weekly principles and research-backed practices",
      "Monthly themes that compound your progress",
      "Complete episode library from Day 1",
      "Private podcast feed for your favorite app",
    ],
  },
  2: {
    title: "Membership + Events",
    tagline: "Live access to Dr. Paul, quarterly.",
    badge: "Coming Soon",
    benefits: [
      "Everything in Membership",
      "Quarterly virtual events",
      "Live Q&A with Dr. Paul",
      "Event replays",
    ],
  },
  3: {
    title: "Coaching Circle",
    tagline: "Small-group coaching with Dr. Paul's team.",
    badge: "Coming Soon",
    benefits: [
      "Everything in Membership + Events",
      "Weekly group coaching sessions",
      "Coaching replays",
      "Implementation support",
    ],
  },
} as const;

// ── Check icon ─────────────────────────────────────────────────────────────

function CheckIcon() {
  return (
    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center mt-0.5">
      <svg
        width="10"
        height="10"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
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

// ── Pricing display for Level 1 ────────────────────────────────────────────

function Level1Price({ billing }: { billing: Billing }) {
  if (billing === "annual") {
    return (
      <div>
        <div className="flex items-baseline gap-1.5 mb-1">
          <span className="font-heading font-bold text-4xl text-foreground">$490</span>
          <span className="text-muted-foreground text-sm">/year</span>
        </div>
        <p className="text-xs text-primary font-medium">
          Save $98 — equivalent to 2 months free
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-baseline gap-1.5 mb-1">
        <span className="font-heading font-bold text-4xl text-foreground">$49</span>
        <span className="text-muted-foreground text-sm">/month</span>
      </div>
      <p className="text-xs text-muted-foreground">Cancel anytime · No contracts</p>
    </div>
  );
}

// ── Main card ──────────────────────────────────────────────────────────────

export function PricingCard({ level, billing, comingSoon = false }: PricingCardProps) {
  const card = CARDS[level];
  const isActive = level === 1 && !comingSoon;

  return (
    <div
      className={`relative bg-card rounded-2xl p-8 flex flex-col ${
        isActive
          ? "border border-primary/40 bg-primary/[0.02]"
          : "border border-border"
      }`}
      style={{
        boxShadow: isActive
          ? "0 8px 32px rgba(18,20,23,0.08)"
          : "0 2px 8px rgba(18,20,23,0.04)",
      }}
    >
      {/* ── Badge ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="font-heading font-semibold text-lg text-foreground leading-tight">
            {card.title}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">{card.tagline}</p>
        </div>
        <span
          className={`flex-shrink-0 ml-3 mt-0.5 text-xs font-medium px-2.5 py-1 rounded-full ${
            isActive
              ? "text-primary bg-primary/10"
              : "text-muted-foreground bg-muted"
          }`}
        >
          {card.badge}
        </span>
      </div>

      {/* ── Pricing ───────────────────────────────────────── */}
      <div className="mb-6">
        {isActive ? (
          <Level1Price billing={billing} />
        ) : (
          <p className="text-sm text-muted-foreground">Pricing coming soon</p>
        )}
      </div>

      {/* ── Benefits ──────────────────────────────────────── */}
      <ul className="space-y-3 mb-8 flex-1">
        {card.benefits.map((item) => (
          <li key={item} className="flex items-start gap-3">
            <CheckIcon />
            <span className="text-sm text-foreground leading-relaxed">{item}</span>
          </li>
        ))}
      </ul>

      {/* ── CTA ───────────────────────────────────────────── */}
      {!isActive && (
        <button
          type="button"
          disabled
          aria-disabled="true"
          className="w-full px-6 py-3.5 rounded-full bg-primary text-white font-medium text-sm opacity-40 cursor-not-allowed"
        >
          Notify me when available
        </button>
      )}
      {/* Level 1 CTA is rendered in AuthGate, not here — scroll draws attention to the form */}
    </div>
  );
}
