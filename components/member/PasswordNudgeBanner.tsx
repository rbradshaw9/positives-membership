"use client";

import Link from "next/link";
import { useState } from "react";

/**
 * components/member/PasswordNudgeBanner.tsx
 *
 * A subtle, dismissable nudge for guest-onboarded users who have not yet
 * set a password (member.password_set = false).
 *
 * - Non-blocking: rendered above content, not as a modal or gate
 * - Dismissable: hides for the session via local state (no server round-trip)
 * - Links to /account for password setup
 * - Matches Positives visual style: calm, minimal, not alarmist
 */
export function PasswordNudgeBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div
      role="banner"
      aria-label="Account security suggestion"
      className="w-full"
      style={{
        background: "rgba(47,111,237,0.06)",
        borderBottom: "1px solid rgba(47,111,237,0.12)",
      }}
    >
      <div
        className="max-w-lg mx-auto px-5 flex items-center justify-between gap-4"
        style={{ paddingTop: "0.65rem", paddingBottom: "0.65rem" }}
      >
        <p
          className="text-sm"
          style={{ color: "#4A5360", lineHeight: "1.5", letterSpacing: "-0.01em" }}
        >
          Add a password for faster sign-in next time.{" "}
          <Link
            href="/account"
            style={{
              color: "#2F6FED",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Set it up →
          </Link>
        </p>

        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full transition-colors"
          style={{
            color: "#9AA0A8",
            background: "transparent",
          }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
