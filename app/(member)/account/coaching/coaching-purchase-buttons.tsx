"use client";

import { useState } from "react";
import { SurfaceCard } from "@/components/ui/SurfaceCard";

/**
 * app/(member)/account/coaching/coaching-purchase-buttons.tsx
 *
 * Client component — calls POST /api/stripe/coaching-checkout and redirects
 * to the returned Stripe Checkout URL.
 *
 * Two SKUs:
 *   single     — 1 session  ($225)
 *   punch_pass — 10 sessions ($1,997 — best value)
 */

type PackType = "single" | "punch_pass";

function CheckIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--color-primary)"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="flex-shrink-0 mt-0.5"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

const PACKS = [
  {
    id: "single" as PackType,
    name: "Single Session",
    price: "$225",
    priceNote: "per session",
    sessions: 1,
    description:
      "A focused 1:1 coaching call with Dr. Paul Jenkins. Ideal if you want to try personal coaching first.",
    features: [
      "50-minute 1:1 video call",
      "Recorded and shared with you",
      "Direct guidance on your situation",
    ],
    badge: null,
  },
  {
    id: "punch_pass" as PackType,
    name: "10-Session Punch Pass",
    price: "$1,997",
    priceNote: "for 10 sessions · $199.70/session",
    sessions: 10,
    description:
      "The most effective way to work with a coach is consistently over time. The Punch Pass gives you 10 sessions to use at your own pace.",
    features: [
      "10 × 50-minute 1:1 video calls",
      "All sessions recorded and shared",
      "Use at your own pace — sessions never expire",
      "Save $352 vs. buying individually",
    ],
    badge: "Best Value",
  },
];

export function CoachingPurchaseButtons() {
  const [loading, setLoading] = useState<PackType | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handlePurchase(packType: PackType) {
    setError(null);
    setLoading(packType);

    try {
      const res = await fetch("/api/stripe/coaching-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packType }),
      });

      const data = await res.json();

      if (!res.ok || !data.url) {
        setError(
          data.error ?? "Something went wrong starting checkout. Please try again."
        );
        setLoading(null);
        return;
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch {
      setError("Could not connect to the checkout server. Please try again.");
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {PACKS.map((pack) => (
          <SurfaceCard
            key={pack.id}
            elevated
            className={[
              "surface-card--editorial flex flex-col",
              pack.badge ? "ring-2 ring-primary/20 ring-offset-1" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {/* Badge */}
            {pack.badge && (
              <span
                className="mb-4 inline-flex w-fit items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white"
                style={{ background: "var(--color-primary)" }}
              >
                {pack.badge}
              </span>
            )}

            {/* Header */}
            <p className="member-detail-kicker">{pack.sessions === 1 ? "1 session" : `${pack.sessions} sessions`}</p>
            <h3 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-foreground">
              {pack.name}
            </h3>
            <p className="mt-2 text-sm leading-body text-muted-foreground">
              {pack.description}
            </p>

            {/* Price */}
            <div className="mt-5 flex items-end gap-2">
              <span className="font-heading text-3xl font-bold tracking-[-0.03em] text-foreground">
                {pack.price}
              </span>
              <span className="mb-0.5 text-sm text-muted-foreground">{pack.priceNote}</span>
            </div>

            {/* Features */}
            <ul className="mt-5 flex flex-col gap-2.5">
              {pack.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckIcon />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            {/* CTA */}
            <div className="mt-6 pt-5 border-t border-border/70">
              <button
                id={`coaching-purchase-${pack.id}`}
                onClick={() => handlePurchase(pack.id)}
                disabled={loading !== null}
                className={[
                  "w-full rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-150",
                  pack.badge
                    ? "bg-primary text-white hover:bg-primary/90 disabled:opacity-50"
                    : "border border-border bg-card text-foreground hover:bg-muted/60 disabled:opacity-50",
                  loading === pack.id ? "cursor-wait" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {loading === pack.id ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="h-4 w-4 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                    </svg>
                    Opening checkout…
                  </span>
                ) : (
                  `Purchase ${pack.name}`
                )}
              </button>
            </div>
          </SurfaceCard>
        ))}
      </div>

      <p className="text-xs leading-body text-muted-foreground text-center">
        All purchases are processed securely via Stripe. Sessions are available immediately after payment.
      </p>
    </div>
  );
}
