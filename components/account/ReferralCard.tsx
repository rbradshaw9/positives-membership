"use client";

/**
 * components/account/ReferralCard.tsx
 *
 * Affiliate enrollment + portal access for Positives members.
 *
 * State 1 — Not yet an affiliate:
 *   "Get my referral link" CTA → provisions Rewardful account, shows link.
 *
 * State 2 — Already an affiliate:
 *   Shows referral link with copy button.
 *   Shows "Open Affiliate Portal →" button → hits /account/affiliate/portal,
 *   which generates a Rewardful SSO magic link and redirects (Growth plan).
 */

import { useState } from "react";
import { getReferralLinkAction } from "@/app/account/affiliate/actions";

interface ReferralCardProps {
  /** Pre-fetched token from server if member is already an affiliate */
  initialToken?: string | null;
  /** Pre-fetched Rewardful affiliate ID — if set, show portal button */
  initialAffiliateId?: string | null;
}

export function ReferralCard({ initialToken, initialAffiliateId }: ReferralCardProps) {
  const [token, setToken] = useState<string | null>(initialToken ?? null);
  const [affiliateId, setAffiliateId] = useState<string | null>(initialAffiliateId ?? null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const referralLink = token ? `https://positives.life/join?via=${token}` : null;
  const isAffiliate = Boolean(token && affiliateId);

  async function handleGetLink() {
    setLoading(true);
    setError(null);
    const result = await getReferralLinkAction();
    setLoading(false);

    if ("error" in result) {
      setError(result.error);
      return;
    }
    setToken(result.token);
    setAffiliateId(result.affiliateId);
  }

  async function handleCopy() {
    if (!referralLink) return;
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1.5px solid rgba(221,215,207,0.7)",
        borderRadius: "1.25rem",
        padding: "1.75rem",
        boxShadow: "0 2px 8px rgba(18,20,23,0.04)",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", marginBottom: "1rem" }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "0.75rem",
            background: "rgba(78,140,120,0.10)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4E8C78" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
        <div>
          <h3
            style={{
              fontFamily: "var(--font-montserrat)",
              fontWeight: 700,
              fontSize: "1rem",
              letterSpacing: "-0.025em",
              color: "#121417",
              marginBottom: "0.25rem",
            }}
          >
            Earn 20% for every member you refer
          </h3>
          <p style={{ fontSize: "0.875rem", color: "#68707A", lineHeight: 1.55 }}>
            Share your unique link. When someone joins, you earn 20% of their
            membership every month — for as long as they stay.
          </p>
        </div>
      </div>

      {/* State 2: Already an affiliate */}
      {isAffiliate && referralLink ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
          {/* Referral link row */}
          <div>
            <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "#9AA0A8", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.5rem" }}>
              Your referral link
            </p>
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                alignItems: "center",
                background: "#F9F7F4",
                border: "1px solid rgba(221,215,207,0.7)",
                borderRadius: "0.75rem",
                padding: "0.625rem 0.75rem",
              }}
            >
              <span
                style={{
                  flex: 1,
                  fontSize: "0.875rem",
                  color: "#121417",
                  fontFamily: "monospace",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {referralLink}
              </span>
              <button
                onClick={handleCopy}
                style={{
                  flexShrink: 0,
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: copied ? "#4E8C78" : "#2F6FED",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "0 0.25rem",
                  transition: "color 0.2s",
                }}
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>

          {/* Portal button */}
          <a
            href="/account/affiliate/portal"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              background: "linear-gradient(135deg, #4E8C78 0%, #3D7262 100%)",
              color: "#FFFFFF",
              borderRadius: "99px",
              padding: "0.75rem 1.5rem",
              fontSize: "0.875rem",
              fontWeight: 600,
              textDecoration: "none",
              transition: "opacity 0.2s",
              boxShadow: "0 4px 16px rgba(78,140,120,0.25)",
              letterSpacing: "-0.01em",
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.88")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            Open Affiliate Portal
          </a>
          <p style={{ fontSize: "0.75rem", color: "#9AA0A8", marginTop: "-0.25rem" }}>
            View your earnings, payouts, and resources — opens securely in a new tab.
          </p>
        </div>
      ) : (
        /* State 1: Not yet an affiliate */
        <div>
          {error && (
            <p style={{ fontSize: "0.8rem", color: "#C0392B", marginBottom: "0.75rem" }}>
              {error}
            </p>
          )}
          <button
            onClick={handleGetLink}
            disabled={loading}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              background: loading
                ? "linear-gradient(135deg, #5A8FF4 0%, #4A7DE0 100%)"
                : "linear-gradient(135deg, #2F6FED 0%, #245DD0 100%)",
              color: "#FFFFFF",
              border: "none",
              borderRadius: "99px",
              padding: "0.75rem 1.5rem",
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: loading ? "wait" : "pointer",
              opacity: loading ? 0.8 : 1,
              transition: "opacity 0.2s",
              boxShadow: "0 4px 16px rgba(47,111,237,0.25)",
              letterSpacing: "-0.01em",
            }}
          >
            {loading ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true" style={{ animation: "spin 0.8s linear infinite" }}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                Setting up your link…
              </>
            ) : (
              "Get my referral link →"
            )}
          </button>
          <p style={{ fontSize: "0.75rem", color: "#9AA0A8", marginTop: "0.625rem" }}>
            Free to join · Instant link · No approval needed
          </p>
        </div>
      )}
    </div>
  );
}
