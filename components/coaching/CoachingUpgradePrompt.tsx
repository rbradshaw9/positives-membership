import { Button } from "@/components/ui/Button";
import { SurfaceCard } from "@/components/ui/SurfaceCard";

/**
 * components/coaching/CoachingUpgradePrompt.tsx
 * Sprint 10: Shown to Level 1 and Level 2 members on /coaching.
 * Calm, non-pushy upgrade prompt. Tier name is passed from the server.
 * No Stripe logic here — links to /join.
 */

export function CoachingUpgradePrompt({ tier }: { tier: string | null }) {
  const tierLabel = tier === "level_2" ? "Level 2" : "Level 1";

  return (
    <div className="member-container py-12 md:py-16">
      <SurfaceCard
        className="mx-auto flex max-w-lg flex-col items-center gap-5 px-8 py-12 text-center"
        elevated
      >
        {/* Icon */}
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{ background: "color-mix(in srgb, var(--color-primary) 10%, transparent)" }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: "var(--color-primary)" }}
            aria-hidden="true"
          >
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>

        <div>
          <h1
            className="heading-balance font-heading font-bold text-xl tracking-tight mb-2"
          >
            Weekly Coaching Calls
          </h1>
          <p
            className="text-sm leading-relaxed"
            style={{ color: "var(--color-muted-foreground)" }}
          >
            Live weekly coaching with Dr. Paul is available for Level 3 and above. You&apos;re
            currently on <strong style={{ color: "var(--color-foreground)" }}>{tierLabel}</strong>.
          </p>
        </div>

        <Button href="/upgrade">
          Explore higher levels
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </Button>

        <p className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>
          Questions? Email us at{" "}
          <a href="mailto:hello@livetoday.com" style={{ color: "var(--color-primary)" }}>
            hello@livetoday.com
          </a>
        </p>
      </SurfaceCard>
    </div>
  );
}
