import Link from "next/link";
import { SurfaceCard } from "@/components/ui/SurfaceCard";

/**
 * components/affiliate/AffiliateCTA.tsx
 *
 * Shown on /account for members who are NOT yet affiliates.
 * Routes to /account/affiliate and auto-starts enrollment.
 */

const BENEFITS = [
  { icon: "💸", text: "20% recurring commission — every month they stay" },
  { icon: "🔗", text: "Unique referral link generated instantly, no approval" },
  { icon: "📊", text: "Track clicks, leads, and earnings in one place" },
];

export function AffiliateCTA() {
  return (
    <SurfaceCard elevated className="surface-card--editorial overflow-hidden relative">
      {/* Gradient accent strip */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: "linear-gradient(90deg, #2EC4B6 0%, #44A8D8 100%)",
          borderRadius: "1.25rem 1.25rem 0 0",
        }}
      />

      <div className="pt-2">
        {/* Eyebrow + badge row */}
        <div className="flex items-center gap-3 mb-3">
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.375rem",
              background: "linear-gradient(135deg, #2EC4B6 0%, #44A8D8 100%)",
              color: "#fff",
              fontSize: "0.7rem",
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              padding: "0.25rem 0.75rem",
              borderRadius: "9999px",
            }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            Affiliate Program
          </div>
        </div>

        <h2
          className="font-heading font-bold text-xl text-foreground tracking-[-0.03em]"
          style={{ textWrap: "balance" }}
        >
          Earn 20% for every member you refer
        </h2>
        <p className="mt-2 text-sm leading-body text-muted-foreground">
          Share Positives with people you love. When they join, you earn 20% of their
          membership&nbsp;— every month they stay active.
        </p>

        {/* Benefit list */}
        <ul className="mt-4 flex flex-col gap-2">
          {BENEFITS.map((b) => (
            <li key={b.text} className="flex items-start gap-2.5 text-sm text-muted-foreground">
              <span className="text-base leading-none mt-px">{b.icon}</span>
              <span className="leading-body">{b.text}</span>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <div className="mt-6">
          <Link
            href="/account/affiliate?auto_enroll=1"
            className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-sm"
          >
            Set up my referral link
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
          <p className="mt-2.5 text-xs text-muted-foreground">
            Free to join · Instant setup · No approval needed
          </p>
        </div>
      </div>
    </SurfaceCard>
  );
}
