"use client";

import { useState } from "react";
import { track } from "@/lib/analytics/ga";

/**
 * app/(member)/account/billing-button.tsx
 * Sprint 7: billing portal redirect button.
 * Sprint 11: improved visual affordance — shadow-medium, hover state,
 *   arrow icon, clearly interactive card treatment.
 */

export function BillingButton() {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const res = await fetch("/api/stripe/billing-portal", { method: "POST" });
    const data = await res.json();
    if (data?.url) {
      track("billing_portal_opened", {
        source_path: "/account",
      });
      window.location.href = data.url;
    } else {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="w-full text-left bg-card rounded-2xl border border-border px-6 py-5 flex items-center justify-between gap-4 hover:bg-muted/30 transition-colors group disabled:opacity-50"
      style={{ boxShadow: "var(--shadow-medium)" }}
      aria-label="Open billing portal"
    >
      <div>
        <p className="text-sm font-semibold text-foreground">
          {loading ? "Loading…" : "Open billing center"}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Change plan, cancel, invoices, and payment method
        </p>
      </div>
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0"
        aria-hidden="true"
      >
        <path d="M5 12h14M12 5l7 7-7 7" />
      </svg>
    </button>
  );
}
