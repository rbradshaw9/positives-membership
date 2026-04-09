"use client";

import { useActionState, useState } from "react";
import Link from "next/link";

/**
 * app/upgrade/UpgradeForm.tsx
 * Client component — interactive upgrade UI for Membership members.
 *
 * Layout:
 *   - Tier cards: Membership + Events + Coaching Circle + Executive Coaching
 *   - Billing toggle (monthly / annual) for self-serve upgrades
 *
 * Brand voice: calm, clear, non-pushy. No urgency language.
 * L4 is never self-serve — CTA links to booking page.
 */

type Props = {
  memberName: string;
  currentTier: string;
  l2MonthlyPriceId: string;
  l2AnnualPriceId: string;
  l3MonthlyPriceId: string;
  l3AnnualPriceId: string;
  action: (prev: { error?: string }, formData: FormData) => Promise<{ error?: string }>;
};

const L1_FEATURES = [
  "Daily audio message from Dr. Paul",
  "Weekly reflections and practices",
  "Monthly theme videos",
  "Full content library access",
  "Private podcast feed",
];

const L2_ADDITIONS = [
  "Quarterly two-day live virtual events",
  "Event replay library",
  "Structured Q&A section",
  "Annual Positives event access",
];

const L3_ADDITIONS = [
  "Weekly live group coaching sessions",
  "Coaching session replays",
  "Implementation support from certified coaches",
];

function CheckIcon({ color = "#4E8C78" }: { color?: string }) {
  return (
    <span
      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
      style={{ background: color === "#2F6FED" ? "rgba(47,111,237,0.10)" : "rgba(78,140,120,0.10)" }}
      aria-hidden="true"
    >
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </span>
  );
}

export function UpgradeForm({
  memberName,
  l2MonthlyPriceId,
  l2AnnualPriceId,
  l3MonthlyPriceId,
  l3AnnualPriceId,
  action,
}: Props) {
  const [state, formAction, isPending] = useActionState(action, {});
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [selectedTier, setSelectedTier] = useState<"level_2" | "level_3" | null>("level_2");

  const isAnnual = billing === "annual";

  // Pricing — founding member rates
  const l2Monthly = 97;
  const l2Annual = 970; // 10 × $97
  const l3Monthly = 297; // TBD — placeholder until L3 price is confirmed
  const l3Annual = 2970; // 10 × $297

  const activePriceId = selectedTier === "level_3"
    ? (isAnnual ? l3AnnualPriceId : l3MonthlyPriceId)
    : (isAnnual ? l2AnnualPriceId : l2MonthlyPriceId);
  const firstName = memberName ? memberName.split(" ")[0] : "";

  return (
    <div className="member-container py-10 md:py-16">
      {/* Back */}
      <Link
        href="/account"
        className="mb-8 inline-flex items-center gap-1.5 text-sm"
        style={{ color: "var(--color-muted-fg)" }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M19 12H5M12 5l-7 7 7 7" />
        </svg>
        Back to account
      </Link>

      {/* Header */}
      <div className="mb-10">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em]" style={{ color: "var(--color-accent)" }}>
          Membership upgrade
        </p>
        <h1
          className="font-heading font-bold tracking-tight"
          style={{ fontSize: "clamp(1.75rem, 3vw, 2.5rem)", letterSpacing: "-0.04em", color: "var(--color-text-default)" }}
        >
          {firstName ? `Ready to go deeper, ${firstName}?` : "Ready to go deeper?"}
        </h1>
        <p className="mt-3 text-base" style={{ color: "var(--color-text-subtle)", maxWidth: "540px", lineHeight: "1.7" }}>
          You&apos;re building a great foundation. When you&apos;re ready, these options add more to your practice.
        </p>
      </div>

      {/* Billing toggle */}
      <div className="mb-8 flex items-center gap-3">
        <div
          className="flex rounded-xl p-1"
          style={{ background: "var(--color-muted)", gap: "2px" }}
          role="group"
          aria-label="Billing frequency"
        >
          {(["monthly", "annual"] as const).map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => setBilling(b)}
              className="rounded-lg px-4 py-2 text-xs font-semibold capitalize transition-all"
              style={{
                background: billing === b ? "var(--color-card)" : "transparent",
                color: billing === b ? "var(--color-text-default)" : "var(--color-muted-fg)",
                boxShadow: billing === b ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
              }}
            >
              {b}
              {b === "annual" && (
                <span className="ml-1.5 rounded-full px-1.5 py-0.5 text-[10px]" style={{ background: "rgba(78,140,120,0.14)", color: "#4E8C78" }}>
                  2 months free
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {state.error && (
        <div
          className="mb-6 rounded-xl px-4 py-3 text-sm"
          style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.18)", color: "#dc2626" }}
          role="alert"
        >
          {state.error}
        </div>
      )}

      {/* Tier cards */}
      <div className="grid gap-5 md:grid-cols-3">

        {/* Membership + Events */}
        <div
          className="relative flex flex-col rounded-2xl p-6 transition-all cursor-pointer"
          style={{
            background: selectedTier === "level_2"
              ? "linear-gradient(135deg, rgba(47,111,237,0.05) 0%, rgba(78,140,120,0.03) 100%)"
              : "var(--color-card)",
            border: selectedTier === "level_2"
              ? "2px solid rgba(47,111,237,0.35)"
              : "2px solid var(--color-border)",
          }}
          onClick={() => setSelectedTier("level_2")}
          role="radio"
          aria-checked={selectedTier === "level_2"}
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && setSelectedTier("level_2")}
        >
          <div className="mb-4 flex items-start justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: "var(--color-primary)" }}>
                Live events
              </span>
              <p className="mt-0.5 font-heading font-bold text-lg tracking-tight" style={{ color: "var(--color-text-default)" }}>
                Events + Q&A
              </p>
            </div>
            <div
              className="h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5"
              style={{
                borderColor: selectedTier === "level_2" ? "#2F6FED" : "var(--color-border)",
                background: selectedTier === "level_2" ? "#2F6FED" : "transparent",
              }}
              aria-hidden="true"
            >
              {selectedTier === "level_2" && (
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
          </div>

          <div className="mb-5">
            <div className="flex items-end gap-1">
              <span className="font-heading font-bold text-3xl tracking-tight" style={{ color: "var(--color-text-default)" }}>
                ${isAnnual ? Math.round(l2Annual / 12) : l2Monthly}
              </span>
              <span className="mb-1 text-xs" style={{ color: "var(--color-muted-fg)" }}>
                /mo{isAnnual ? ", billed annually" : ""}
              </span>
            </div>
            {isAnnual && (
              <p className="text-xs mt-0.5" style={{ color: "var(--color-muted-fg)" }}>
                ${l2Annual}/year — 2 months free
              </p>
            )}
            <p className="mt-1 text-xs" style={{ color: "#4E8C78" }}>
              Founding member rate
            </p>
          </div>

          <ul className="flex flex-col gap-2.5 mb-5">
            <li className="text-xs font-medium" style={{ color: "var(--color-muted-fg)" }}>Everything in Membership, plus:</li>
            {L2_ADDITIONS.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm" style={{ color: "var(--color-text-default)" }}>
                <CheckIcon color="#2F6FED" />
                {f}
              </li>
            ))}
          </ul>

          {selectedTier === "level_2" && (
            <form action={formAction} className="mt-auto">
              <input type="hidden" name="priceId" value={activePriceId} />
              <button
                type="submit"
                disabled={isPending}
                className="w-full rounded-full py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
                style={{
                  background: "linear-gradient(135deg, #2F6FED 0%, #245DD0 100%)",
                  boxShadow: "0 4px 16px rgba(47,111,237,0.25)",
                }}
              >
                {isPending ? "Upgrading…" : "Upgrade to Membership + Events"}
              </button>
            </form>
          )}
        </div>

        {/* Coaching Circle */}
        <div
          className="relative flex flex-col rounded-2xl p-6 transition-all cursor-pointer"
          style={{
            background: selectedTier === "level_3"
              ? "linear-gradient(135deg, rgba(47,111,237,0.05) 0%, rgba(78,140,120,0.03) 100%)"
              : "var(--color-card)",
            border: selectedTier === "level_3"
              ? "2px solid rgba(47,111,237,0.35)"
              : "2px solid var(--color-border)",
          }}
          onClick={() => setSelectedTier("level_3")}
          role="radio"
          aria-checked={selectedTier === "level_3"}
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && setSelectedTier("level_3")}
        >
          <div className="mb-4 flex items-start justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: "var(--color-accent)" }}>
                Coaching
              </span>
              <p className="mt-0.5 font-heading font-bold text-lg tracking-tight" style={{ color: "var(--color-text-default)" }}>
                Coaching Circle
              </p>
            </div>
            <div
              className="h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5"
              style={{
                borderColor: selectedTier === "level_3" ? "#2F6FED" : "var(--color-border)",
                background: selectedTier === "level_3" ? "#2F6FED" : "transparent",
              }}
              aria-hidden="true"
            >
              {selectedTier === "level_3" && (
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
          </div>

          <div className="mb-5">
            <div className="flex items-end gap-1">
              <span className="font-heading font-bold text-3xl tracking-tight" style={{ color: "var(--color-text-default)" }}>
                ${isAnnual ? Math.round(l3Annual / 12) : l3Monthly}
              </span>
              <span className="mb-1 text-xs" style={{ color: "var(--color-muted-fg)" }}>
                /mo{isAnnual ? ", billed annually" : ""}
              </span>
            </div>
            {isAnnual && (
              <p className="text-xs mt-0.5" style={{ color: "var(--color-muted-fg)" }}>
                ${l3Annual}/year — 2 months free
              </p>
            )}
            <p className="mt-1 text-xs" style={{ color: "#4E8C78" }}>
              Founding member rate
            </p>
          </div>

          <ul className="flex flex-col gap-2.5 mb-5">
            <li className="text-xs font-medium" style={{ color: "var(--color-muted-fg)" }}>Everything in Levels 1 & 2, plus:</li>
            {L3_ADDITIONS.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm" style={{ color: "var(--color-text-default)" }}>
                <CheckIcon color="#2F6FED" />
                {f}
              </li>
            ))}
          </ul>

          {selectedTier === "level_3" && (
            <form action={formAction} className="mt-auto">
              <input type="hidden" name="priceId" value={activePriceId} />
              <button
                type="submit"
                disabled={isPending}
                className="w-full rounded-full py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
                style={{
                  background: "linear-gradient(135deg, #2F6FED 0%, #245DD0 100%)",
                  boxShadow: "0 4px 16px rgba(47,111,237,0.25)",
                }}
              >
                {isPending ? "Upgrading…" : "Upgrade to Coaching Circle"}
              </button>
            </form>
          )}
        </div>

        {/* Executive Coaching — never self-serve */}
        <div
          className="flex flex-col rounded-2xl p-6"
          style={{
            background: "var(--color-card)",
            border: "2px solid var(--color-border)",
          }}
        >
          <div className="mb-4">
            <span className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: "var(--color-muted-fg)" }}>
              Personalized support
            </span>
            <p className="mt-0.5 font-heading font-bold text-lg tracking-tight" style={{ color: "var(--color-text-default)" }}>
              Executive Coaching
            </p>
          </div>

          <div className="mb-5">
            <p className="font-heading font-bold text-2xl tracking-tight" style={{ color: "var(--color-text-default)" }}>
              By application
            </p>
            <p className="mt-1 text-xs" style={{ color: "var(--color-muted-fg)" }}>
              Pricing discussed on your Breakthrough Session call
            </p>
          </div>

          <ul className="flex flex-col gap-2.5 mb-5">
            <li className="text-xs font-medium" style={{ color: "var(--color-muted-fg)" }}>Everything in Levels 1–3, plus:</li>
            {[
              "Bi-weekly 1:1 coaching with a certified coach",
              "Personalized support for your situation",
            ].map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm" style={{ color: "var(--color-text-default)" }}>
                <CheckIcon />
                {f}
              </li>
            ))}
          </ul>

          <a
            href="https://calendly.com/positives/breakthrough"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-auto w-full rounded-full py-3 text-sm font-semibold text-center block transition-colors"
            style={{
              background: "var(--color-muted)",
              color: "var(--color-text-default)",
              border: "1px solid var(--color-border)",
            }}
          >
            Book a Breakthrough Session →
          </a>
        </div>
      </div>

      {/* What you already have */}
      <div
        className="mt-8 rounded-2xl p-6"
        style={{ background: "var(--color-muted)", border: "1px solid var(--color-border)" }}
      >
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.12em]" style={{ color: "var(--color-muted-fg)" }}>
          Already included in Membership
        </p>
        <ul className="flex flex-wrap gap-x-6 gap-y-2">
          {L1_FEATURES.map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm" style={{ color: "var(--color-text-subtle)" }}>
              <CheckIcon />
              {f}
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-6 text-center text-xs" style={{ color: "var(--color-muted-fg)" }}>
        Questions?{" "}
        <a href="/support" style={{ color: "var(--color-primary)" }}>
          Contact support
        </a>{" "}
        · All upgrades are prorated from your current billing cycle · Cancel anytime
      </p>
    </div>
  );
}
