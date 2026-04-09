"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  deleteAffiliateLinkAction,
  getReferralLinkAction,
  savePayPalEmailAction,
  updateReferralSlugAction,
} from "@/app/account/affiliate/actions";
import type {
  AffiliateCommission,
  AffiliatePayout,
  PromoterStats,
} from "@/lib/firstpromoter/client";
import type {
  AffiliatePortalViewModel,
  AffiliateTrackedLink,
} from "@/lib/affiliate/portal";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { track } from "@/lib/analytics/ga";

interface AffiliateLink {
  id: string;
  code: string;
  label: string;
  destination: string | null;
  clicks: number;
}

interface Props {
  isAffiliate: boolean;
  affiliateId: string | null;
  affiliateLinkId: string | null;
  affiliateCreatedAt: string | null;
  token: string | null;
  stats: PromoterStats | null;
  commissions: AffiliateCommission[];
  payouts: AffiliatePayout[];
  memberName: string;
  paypalEmail: string;
  initialLinks?: AffiliateLink[];
  trackedLinks: AffiliateTrackedLink[];
  trackedLinksError: string | null;
  autoEnroll?: boolean;
  performance: AffiliatePortalViewModel;
}

type Tab = "link" | "performance" | "share" | "earnings";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "link", label: "My Links", icon: "🔗" },
  { id: "performance", label: "Performance", icon: "📈" },
  { id: "share", label: "Share Kit", icon: "✉️" },
  { id: "earnings", label: "Earnings", icon: "💸" },
];

function formatMoney(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatShortDate(value: string | null) {
  if (!value) return "No payouts yet";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function extractSubId(destination: string | null) {
  if (!destination) return null;
  try {
    return new URL(destination, "https://positives.life").searchParams.get("sub_id");
  } catch {
    return null;
  }
}

function shortUrl(code: string) {
  return `https://positives.life/go/${code}`;
}

function buildManagedDestination(input: { destination: string | null; subId: string | null }) {
  const destination = input.destination?.trim() ?? "";
  const subId = input.subId?.trim() ?? "";
  if (!destination && !subId) return "Homepage";
  if (!destination && subId) return `Homepage · source tag: ${subId}`;

  try {
    const url = new URL(destination);
    return `${url.hostname}${url.pathname}${subId ? ` · ${subId}` : ""}`;
  } catch {
    return destination || "Custom destination";
  }
}

function buildTaggedTrackedLink(link: string, subId: string) {
  try {
    const url = new URL(link);
    const trimmed = subId.trim().toLowerCase();
    if (trimmed) {
      url.searchParams.set("sub_id", trimmed);
    } else {
      url.searchParams.delete("sub_id");
    }
    return url.toString();
  } catch {
    return link;
  }
}

function formatTrackedDestination(destinationPath: string) {
  if (!destinationPath || destinationPath === "/") return "Homepage";
  return destinationPath;
}

function buildSparklinePath(values: number[], width = 240, height = 72) {
  if (values.length === 0) return "";
  if (values.length === 1) return `M 0 ${height / 2} L ${width} ${height / 2}`;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function buildSwipes(link: string) {
  return [
    {
      id: "email-personal",
      label: "Personal email",
      content: `Subject: I think you'd really like this\n\nI've been using Positives as part of my daily routine and it has been one of the most grounding things in my week.\n\nIt's a short daily audio practice with Dr. Paul Jenkins, plus a weekly principle and monthly masterclass. Thought of you because I think you'd actually use it.\n\nHere's my link if you want to take a look:\n${link}`,
    },
    {
      id: "email-followup",
      label: "Simple follow-up",
      content: `Subject: Quick follow-up\n\nWanted to send this over in case it helps.\n\nPositives is a daily practice membership I keep coming back to because it is simple, calming, and actually usable in real life.\n\nHere's my link:\n${link}`,
    },
  ];
}

function buildSocialCaptions(link: string) {
  return [
    {
      id: "text-message",
      label: "Text / DM",
      content: `I've been using Positives as a short daily audio practice and I think you'd really like it. It's simple, grounding, and easy to stay consistent with.\n\nHere's my link: ${link}`,
    },
    {
      id: "social-caption",
      label: "Social caption",
      content: `One of the best habits I've added lately is a short daily practice with Positives.\n\nIt helps me reset, refocus, and start the day with a better frame of mind.\n\nIf you want to check it out, here's my link: ${link}`,
    },
    {
      id: "blog-cta",
      label: "Blog / newsletter CTA",
      content: `If you want a simple daily practice for more clarity and steadiness, I recommend Positives. It's short, thoughtful, and easy to return to.\n\nExplore it here: ${link}`,
    },
  ];
}

function MetricCard({
  label,
  value,
  tone = "default",
  detail,
}: {
  label: string;
  value: string;
  tone?: "default" | "positive" | "warning";
  detail?: string;
}) {
  const toneStyles =
    tone === "positive"
      ? { valueColor: "#15803D", bg: "rgba(22,163,74,0.06)", border: "rgba(22,163,74,0.18)" }
      : tone === "warning"
        ? { valueColor: "#B45309", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.2)" }
        : { valueColor: "#09090B", bg: "transparent", border: "rgba(228,228,231,1)" };

  return (
    <div
      style={{
        border: `1px solid ${toneStyles.border}`,
        background: toneStyles.bg,
        borderRadius: "1rem",
        padding: "1rem 1.05rem",
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: "0.7rem",
          fontWeight: 700,
          color: "#71717A",
          letterSpacing: "0.07em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </p>
      <p
        style={{
          margin: "0.35rem 0 0",
          fontSize: "1.75rem",
          lineHeight: 1,
          fontWeight: 700,
          color: toneStyles.valueColor,
          fontFamily: "var(--font-heading)",
          letterSpacing: "-0.04em",
        }}
      >
        {value}
      </p>
      {detail ? (
        <p style={{ margin: "0.45rem 0 0", fontSize: "0.8rem", lineHeight: 1.5, color: "#71717A" }}>
          {detail}
        </p>
      ) : null}
    </div>
  );
}

function InsightCard({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <SurfaceCard elevated className="surface-card--editorial h-full">
      <p
        style={{
          margin: 0,
          fontSize: "0.68rem",
          fontWeight: 700,
          color: "#71717A",
          letterSpacing: "0.07em",
          textTransform: "uppercase",
        }}
      >
        {eyebrow}
      </p>
      <h3
        style={{
          margin: "0.55rem 0 0.35rem",
          fontSize: "1rem",
          fontWeight: 700,
          color: "#09090B",
          letterSpacing: "-0.02em",
          textWrap: "balance",
        }}
      >
        {title}
      </h3>
      <p style={{ margin: 0, fontSize: "0.85rem", lineHeight: 1.6, color: "#52525B" }}>{body}</p>
    </SurfaceCard>
  );
}

function TrendCard({
  title,
  subtitle,
  values,
  labels,
  formatter = (value: number) => String(value),
}: {
  title: string;
  subtitle: string;
  values: number[];
  labels: string[];
  formatter?: (value: number) => string;
}) {
  const path = buildSparklinePath(values);
  const latest = values.at(-1) ?? 0;

  return (
    <SurfaceCard elevated className="surface-card--editorial h-full">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p
            style={{
              margin: 0,
              fontSize: "0.68rem",
              fontWeight: 700,
              color: "#71717A",
              letterSpacing: "0.07em",
              textTransform: "uppercase",
            }}
          >
            Trend
          </p>
          <h3 style={{ margin: "0.55rem 0 0.2rem", fontSize: "1rem", fontWeight: 700, color: "#09090B", letterSpacing: "-0.02em" }}>
            {title}
          </h3>
          <p style={{ margin: 0, fontSize: "0.82rem", color: "#71717A", lineHeight: 1.5 }}>{subtitle}</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ margin: 0, fontSize: "0.78rem", color: "#71717A" }}>Latest</p>
          <p style={{ margin: "0.2rem 0 0", fontSize: "1.15rem", fontWeight: 700, color: "#09090B" }}>{formatter(latest)}</p>
        </div>
      </div>

      {values.length > 0 ? (
        <div style={{ marginTop: "1rem" }}>
          <svg viewBox="0 0 240 72" width="100%" height="72" aria-hidden="true">
            <defs>
              <linearGradient id={`gradient-${title.replace(/\s+/g, "-").toLowerCase()}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#2EC4B6" />
                <stop offset="100%" stopColor="#44A8D8" />
              </linearGradient>
            </defs>
            <path
              d={path}
              fill="none"
              stroke={`url(#gradient-${title.replace(/\s+/g, "-").toLowerCase()})`}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {labels.map((label) => (
              <span key={label} style={{ fontSize: "0.72rem", color: "#A1A1AA" }}>
                {label}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <p style={{ margin: "1rem 0 0", fontSize: "0.82rem", color: "#A1A1AA" }}>
          Trend data will appear as clicks and commissions start coming in.
        </p>
      )}
    </SurfaceCard>
  );
}

function CopyBlock({
  label,
  content,
  onCopied,
}: {
  label: string;
  content: string;
  onCopied?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(content);
    onCopied?.();
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2200);
  }, [content, onCopied]);

  return (
    <div style={{ border: "1px solid #E4E4E7", borderRadius: "0.95rem", padding: "1rem", background: "#FAFAFA" }}>
      <div className="flex items-center justify-between gap-3">
        <p
          style={{
            margin: 0,
            fontSize: "0.72rem",
            fontWeight: 700,
            color: "#71717A",
            letterSpacing: "0.07em",
            textTransform: "uppercase",
          }}
        >
          {label}
        </p>
        <button
          onClick={handleCopy}
          style={{
            border: "none",
            background: "transparent",
            color: copied ? "#15803D" : "#44A8D8",
            fontSize: "0.78rem",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre
        style={{
          margin: "0.75rem 0 0",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          fontFamily: "var(--font-sans)",
          fontSize: "0.84rem",
          lineHeight: 1.65,
          color: "#3F3F46",
        }}
      >
        {content}
      </pre>
    </div>
  );
}

function CommissionRow({ commission }: { commission: AffiliateCommission }) {
  const statusStyles: Record<string, { color: string; bg: string }> = {
    paid: { color: "#15803D", bg: "rgba(22,163,74,0.08)" },
    pending: { color: "#B45309", bg: "rgba(245,158,11,0.1)" },
    approved: { color: "#0F766E", bg: "rgba(46,196,182,0.12)" },
    unpaid: { color: "#71717A", bg: "rgba(113,113,122,0.12)" },
  };
  const tone = statusStyles[commission.status] ?? statusStyles.unpaid;

  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-3 last:border-b-0">
      <div>
        <p style={{ margin: 0, fontSize: "0.92rem", fontWeight: 700, color: "#09090B" }}>
          {formatMoney(commission.amount)}
        </p>
        <p style={{ margin: "0.2rem 0 0", fontSize: "0.78rem", color: "#71717A" }}>
          {new Date(commission.created_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
          {commission.customer_email ? ` · ${commission.customer_email}` : ""}
        </p>
      </div>
      <span
        style={{
          borderRadius: "9999px",
          padding: "0.3rem 0.75rem",
          fontSize: "0.72rem",
          fontWeight: 700,
          color: tone.color,
          background: tone.bg,
          textTransform: "capitalize",
        }}
      >
        {commission.status}
      </span>
    </div>
  );
}

function PayoutRow({ payout }: { payout: AffiliatePayout }) {
  const tone =
    payout.state === "paid"
      ? { color: "#15803D", bg: "rgba(22,163,74,0.08)" }
      : payout.state === "processing"
        ? { color: "#0F766E", bg: "rgba(46,196,182,0.12)" }
        : payout.state === "due"
          ? { color: "#B45309", bg: "rgba(245,158,11,0.1)" }
          : { color: "#71717A", bg: "rgba(113,113,122,0.12)" };

  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-3 last:border-b-0">
      <div>
        <p style={{ margin: 0, fontSize: "0.92rem", fontWeight: 700, color: "#09090B" }}>
          {formatMoney(payout.amount)}
        </p>
        <p style={{ margin: "0.2rem 0 0", fontSize: "0.78rem", color: "#71717A" }}>
          {new Date(payout.created_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      </div>
      <span
        style={{
          borderRadius: "9999px",
          padding: "0.3rem 0.75rem",
          fontSize: "0.72rem",
          fontWeight: 700,
          color: tone.color,
          background: tone.bg,
          textTransform: "capitalize",
        }}
      >
        {payout.state}
      </span>
    </div>
  );
}

function EnrollScreen({
  onEnroll,
  loading,
  error,
}: {
  onEnroll: () => void;
  loading: boolean;
  error: string | null;
}) {
  return (
    <div style={{ maxWidth: 560, margin: "3rem auto", padding: "0 1rem" }}>
      <SurfaceCard elevated className="surface-card--editorial relative overflow-hidden p-8 text-center">
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: "linear-gradient(90deg, #2EC4B6 0%, #44A8D8 100%)",
          }}
        />
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: "1.125rem",
            background: "linear-gradient(135deg, rgba(46,196,182,0.12) 0%, rgba(68,168,216,0.08) 100%)",
            border: "1px solid rgba(46,196,182,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0.75rem auto 1.75rem",
          }}
        >
          <span style={{ fontSize: "1.6rem", lineHeight: 1 }}>🌱</span>
        </div>

        <h1
          style={{
            margin: 0,
            fontSize: "clamp(1.5rem, 4vw, 2rem)",
            fontWeight: 700,
            color: "#09090B",
            letterSpacing: "-0.04em",
            lineHeight: 1.08,
            textWrap: "balance",
          }}
        >
          Earn 20% for every member you refer
        </h1>
        <p style={{ margin: "0.9rem auto 0", maxWidth: 460, fontSize: "0.94rem", lineHeight: 1.7, color: "#52525B" }}>
          Share Positives with people you trust. We&apos;ll create your referral account instantly and give you a link you can start using right away.
        </p>

        <div className="mx-auto mt-6 flex max-w-md flex-col gap-3 text-left">
          {[
            "Your primary referral link is ready immediately",
            "You earn 20% recurring for active memberships you refer",
            "Any extra tracked campaign links assigned in FirstPromoter will appear automatically",
          ].map((item) => (
            <div key={item} className="flex items-start gap-3 text-sm text-muted-foreground">
              <span aria-hidden="true">✓</span>
              <span>{item}</span>
            </div>
          ))}
        </div>

        {error ? (
          <p
            style={{
              margin: "1rem auto 0",
              maxWidth: 460,
              fontSize: "0.85rem",
              color: "#DC2626",
              background: "rgba(239,68,68,0.07)",
              borderRadius: "0.75rem",
              padding: "0.75rem 1rem",
            }}
          >
            {error}
          </p>
        ) : null}

        <button
          id="affiliate-enroll-btn"
          onClick={onEnroll}
          disabled={loading}
          style={{
            marginTop: "1.5rem",
            width: "100%",
            maxWidth: 360,
            border: "none",
            borderRadius: "9999px",
            padding: "0.95rem 1.75rem",
            background: loading ? "#7DD4CB" : "linear-gradient(135deg, #2EC4B6 0%, #44A8D8 100%)",
            color: "#FFFFFF",
            fontWeight: 700,
            fontSize: "0.95rem",
            cursor: loading ? "wait" : "pointer",
          }}
        >
          {loading ? "Setting up your link…" : "Get my referral link"}
        </button>
        <p style={{ margin: "0.85rem 0 0", fontSize: "0.76rem", color: "#A1A1AA" }}>
          Free to join · Instant setup · No approval needed
        </p>
      </SurfaceCard>
    </div>
  );
}

function PayoutSetupStep({
  paypalEmail,
  onPaypalChange,
  onSave,
  saving,
  error,
}: {
  paypalEmail: string;
  onPaypalChange: (value: string) => void;
  onSave: () => void;
  saving: boolean;
  error: string | null;
}) {
  return (
    <div style={{ maxWidth: 560, margin: "3rem auto", padding: "0 1rem" }}>
      <SurfaceCard elevated className="surface-card--editorial relative overflow-hidden p-8 text-center">
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: "linear-gradient(90deg, #2EC4B6 0%, #44A8D8 100%)",
          }}
        />
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: "1.125rem",
            background: "linear-gradient(135deg, rgba(46,196,182,0.12) 0%, rgba(68,168,216,0.08) 100%)",
            border: "1px solid rgba(46,196,182,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0.75rem auto 1.75rem",
            fontSize: "1.75rem",
          }}
        >
          💳
        </div>

        <h1 style={{ margin: 0, fontSize: "clamp(1.4rem, 3.5vw, 1.85rem)", fontWeight: 700, color: "#09090B", lineHeight: 1.1, textWrap: "balance", letterSpacing: "-0.04em" }}>
          One more step before your affiliate portal opens
        </h1>
        <p style={{ margin: "0.8rem auto 0", maxWidth: 440, fontSize: "0.9rem", color: "#52525B", lineHeight: 1.65 }}>
          Add your PayPal email now so your commissions are payout-ready from day one. We require this before opening the affiliate dashboard, and you can update it later anytime.
        </p>

        <div style={{ marginTop: "1rem", textAlign: "left", border: "1px solid rgba(68,168,216,0.16)", background: "rgba(68,168,216,0.06)", borderRadius: "0.95rem", padding: "0.95rem 1rem" }}>
          <p style={{ margin: 0, fontSize: "0.8rem", fontWeight: 700, color: "#2563EB", letterSpacing: "0.04em", textTransform: "uppercase" }}>
            No PayPal yet?
          </p>
          <p style={{ margin: "0.4rem 0 0", fontSize: "0.84rem", lineHeight: 1.6, color: "#52525B" }}>
            That&apos;s okay. You can create a PayPal account first, then come right back here and finish setup. We ask for this up front so we can pay affiliates smoothly without cleanup later.
          </p>
          <a
            href="https://www.paypal.com/us/webapps/mpp/account-selection"
            target="_blank"
            rel="noreferrer"
            style={{ display: "inline-block", marginTop: "0.75rem", color: "#0F766E", fontWeight: 700, textDecoration: "none" }}
          >
            Create a PayPal account
          </a>
        </div>

        <div style={{ marginTop: "1.5rem", textAlign: "left" }}>
          <input
            id="payout-paypal-input"
            type="email"
            placeholder="your-paypal@email.com"
            value={paypalEmail}
            onChange={(event) => onPaypalChange(event.target.value)}
            style={{
              width: "100%",
              padding: "0.95rem 1rem",
              fontSize: "0.9rem",
              border: "1.5px solid #E4E4E7",
              borderRadius: "0.875rem",
              outline: "none",
              fontFamily: "var(--font-sans)",
              color: "#09090B",
              background: "#FAFAFA",
              boxSizing: "border-box",
            }}
            autoFocus
          />
          {error ? <p style={{ margin: "0.55rem 0 0", fontSize: "0.8rem", color: "#DC2626" }}>{error}</p> : null}
        </div>

        <button
          id="payout-save-btn"
          onClick={onSave}
          disabled={saving || !paypalEmail.trim()}
          style={{
            marginTop: "1rem",
            width: "100%",
            border: "none",
            borderRadius: "9999px",
            padding: "0.95rem 1.5rem",
            background: saving || !paypalEmail.trim() ? "#A1A1AA" : "linear-gradient(135deg, #2EC4B6 0%, #44A8D8 100%)",
            color: "#FFFFFF",
            fontWeight: 700,
            cursor: saving || !paypalEmail.trim() ? "not-allowed" : "pointer",
          }}
        >
          {saving ? "Saving…" : "Save payout email & open portal"}
        </button>
      </SurfaceCard>
    </div>
  );
}

function LinkTab({
  currentToken,
  referralLink,
  copiedLink,
  onCopyPrimaryLink,
  slugEditing,
  slugDraft,
  slugSaving,
  slugSaved,
  slugError,
  slugConfirmed,
  onSlugDraftChange,
  onSlugEdit,
  onSlugCancel,
  onSlugSave,
  onSlugConfirmChange,
  trackedLinks,
  trackedLinksError,
  links,
  onLinksChange,
}: {
  currentToken: string | null;
  referralLink: string | null;
  copiedLink: boolean;
  onCopyPrimaryLink: () => void;
  slugEditing: boolean;
  slugDraft: string;
  slugSaving: boolean;
  slugSaved: boolean;
  slugError: string | null;
  slugConfirmed: boolean;
  onSlugDraftChange: (value: string) => void;
  onSlugEdit: () => void;
  onSlugCancel: () => void;
  onSlugSave: () => void;
  onSlugConfirmChange: (value: boolean) => void;
  trackedLinks: AffiliateTrackedLink[];
  trackedLinksError: string | null;
  links: AffiliateLink[];
  onLinksChange: (links: AffiliateLink[]) => void;
}) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedTrackedLinkId, setExpandedTrackedLinkId] = useState<string | null>(null);
  const [tagDrafts, setTagDrafts] = useState<Record<string, string>>({});

  const availableTrackedLinks = useMemo(
    () => trackedLinks.filter((link) => link.url !== referralLink),
    [referralLink, trackedLinks]
  );

  const handleCopyManagedLink = useCallback(async (link: AffiliateLink) => {
    await navigator.clipboard.writeText(shortUrl(link.code));
    track("affiliate_custom_link_copied", {
      source_path: "/account/affiliate",
      link_code: link.code,
      sub_id: extractSubId(link.destination) ?? undefined,
    });
    setCopiedId(link.id);
    window.setTimeout(() => setCopiedId(null), 2200);
  }, []);

  const handleCopyTrackedLink = useCallback(async (link: AffiliateTrackedLink) => {
    await navigator.clipboard.writeText(link.url);
    track("affiliate_custom_link_copied", {
      source_path: "/account/affiliate",
      link_kind: link.kind,
      link_name: link.name,
      has_sub_id: false,
    });
    setCopiedId(`tracked:${link.id}`);
    window.setTimeout(() => setCopiedId(null), 2200);
  }, []);

  const handleCopyTaggedLink = useCallback(async (link: AffiliateTrackedLink) => {
    const subId = (tagDrafts[link.id] ?? "").trim();
    const taggedLink = buildTaggedTrackedLink(link.url, subId);
    await navigator.clipboard.writeText(taggedLink);
    track("affiliate_custom_link_copied", {
      source_path: "/account/affiliate",
      link_kind: link.kind,
      link_name: link.name,
      sub_id: subId || undefined,
    });
    setCopiedId(`tagged:${link.id}`);
    window.setTimeout(() => setCopiedId(null), 2200);
  }, [tagDrafts]);

  const handleDelete = useCallback(async (id: string) => {
    const result = await deleteAffiliateLinkAction(id);
    if ("error" in result) return;
    onLinksChange(links.filter((link) => link.id !== id));
  }, [links, onLinksChange]);

  return (
    <div className="flex flex-col gap-4">
      <SurfaceCard elevated className="surface-card--editorial">
        <p
          style={{
            margin: 0,
            fontSize: "0.68rem",
            fontWeight: 700,
            color: "#71717A",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Primary link
        </p>
        <h2 style={{ margin: "0.65rem 0 0.25rem", fontSize: "1.25rem", fontWeight: 700, color: "#09090B", letterSpacing: "-0.03em", textWrap: "balance" }}>
          Your main referral link
        </h2>
        <p style={{ margin: 0, fontSize: "0.86rem", lineHeight: 1.6, color: "#71717A" }}>
          This is the link most affiliates will use. It goes straight to your default FirstPromoter-tracked sales page and is the simplest link to share anywhere.
        </p>

        <div
          style={{
            marginTop: "1rem",
            display: "flex",
            alignItems: "center",
            gap: "0.65rem",
            border: "1px solid rgba(46,196,182,0.22)",
            background: "#F8FBFC",
            borderRadius: "0.95rem",
            padding: "0.9rem 1rem",
          }}
        >
          <span aria-hidden="true">🔗</span>
          <span style={{ flex: 1, minWidth: 0, fontSize: "0.9rem", color: "#09090B", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {referralLink}
          </span>
          <button
            id="copy-referral-link"
            onClick={onCopyPrimaryLink}
            style={{
              border: "none",
              borderRadius: "9999px",
              background: copiedLink ? "rgba(22,163,74,0.12)" : "rgba(68,168,216,0.1)",
              color: copiedLink ? "#15803D" : "#0F766E",
              fontWeight: 700,
              padding: "0.45rem 0.85rem",
              cursor: "pointer",
            }}
          >
            {copiedLink ? "Copied!" : "Copy"}
          </button>
        </div>

        <div style={{ marginTop: "1rem" }}>
          {slugEditing ? (
            <div className="flex flex-col gap-3">
              <div style={{ background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: "0.75rem", padding: "0.75rem 0.9rem" }}>
                <p style={{ margin: 0, fontSize: "0.76rem", lineHeight: 1.55, color: "#92400E" }}>
                  Your old direct <code>?fpr=</code> links stop tracking the moment you save. Any Positives-managed <code>/go/</code> links in this portal will be updated automatically.
                </p>
              </div>
              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                <span style={{ fontSize: "0.82rem", color: "#71717A", whiteSpace: "nowrap" }}>positives.life?fpr=</span>
                <input
                  value={slugDraft}
                  onChange={(event) => onSlugDraftChange(event.target.value)}
                  style={{
                    flex: 1,
                    padding: "0.75rem 0.9rem",
                    borderRadius: "0.8rem",
                    border: "1.5px solid #2EC4B6",
                    fontFamily: "monospace",
                    fontSize: "0.9rem",
                  }}
                />
                <div className="flex items-center gap-2">
                  <button
                    id="slug-save-btn"
                    onClick={onSlugSave}
                    disabled={slugSaving || slugDraft.length < 3 || !slugConfirmed}
                    style={{
                      border: "none",
                      borderRadius: "0.8rem",
                      padding: "0.75rem 1rem",
                      background: slugSaving || slugDraft.length < 3 || !slugConfirmed ? "#A1A1AA" : "linear-gradient(135deg, #2EC4B6 0%, #44A8D8 100%)",
                      color: "#FFFFFF",
                      fontWeight: 700,
                      cursor: slugSaving ? "wait" : "pointer",
                    }}
                  >
                    {slugSaving ? "Saving…" : "Change slug"}
                  </button>
                  <button onClick={onSlugCancel} style={{ border: "none", background: "transparent", color: "#A1A1AA", cursor: "pointer" }}>
                    Cancel
                  </button>
                </div>
              </div>
              {slugError ? <p style={{ margin: 0, fontSize: "0.8rem", color: "#DC2626" }}>{slugError}</p> : null}
              <label style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem", fontSize: "0.8rem", color: "#52525B", lineHeight: 1.55, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={slugConfirmed}
                  onChange={(event) => onSlugConfirmChange(event.target.checked)}
                  style={{ marginTop: "0.15rem" }}
                />
                <span>I understand that any old direct <code>?fpr=</code> links I already shared will stop tracking after this change.</span>
              </label>
              <p style={{ margin: 0, fontSize: "0.75rem", color: "#A1A1AA" }}>
                3–30 characters. Lowercase letters, numbers, and hyphens only. If FirstPromoter reports the slug is already taken, you&apos;ll need to choose another one.
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <span style={{ fontSize: "0.8rem", color: "#71717A" }}>Link slug</span>
              <code style={{ borderRadius: "0.5rem", background: "rgba(46,196,182,0.08)", padding: "0.2rem 0.55rem", color: "#0F766E", fontWeight: 700 }}>
                {currentToken}
              </code>
              {slugSaved ? <span style={{ fontSize: "0.75rem", color: "#15803D", fontWeight: 700 }}>Updated</span> : null}
              <button onClick={onSlugEdit} style={{ border: "none", background: "transparent", color: "#44A8D8", fontWeight: 700, cursor: "pointer" }}>
                Customize
              </button>
            </div>
          )}
        </div>
      </SurfaceCard>

      <SurfaceCard elevated className="surface-card--editorial">
        <p
          style={{
            margin: 0,
            fontSize: "0.68rem",
            fontWeight: 700,
            color: "#71717A",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Available tracked links
        </p>
        <h2 style={{ margin: "0.65rem 0 0.25rem", fontSize: "1.1rem", fontWeight: 700, color: "#09090B", letterSpacing: "-0.03em", textWrap: "balance" }}>
          FirstPromoter links available to you
        </h2>
        <p style={{ margin: 0, fontSize: "0.84rem", lineHeight: 1.6, color: "#71717A" }}>
          Any campaign or co-branded links configured for you in FirstPromoter will show up here automatically. Add an optional source tag when you want to compare traffic from email, social, or a specific campaign.
        </p>

        {trackedLinksError ? (
          <div style={{ marginTop: "1rem", border: "1px solid rgba(245,158,11,0.2)", background: "rgba(245,158,11,0.07)", borderRadius: "0.85rem", padding: "0.8rem 0.95rem" }}>
            <p style={{ margin: 0, fontSize: "0.8rem", lineHeight: 1.55, color: "#92400E" }}>
              {trackedLinksError}
            </p>
          </div>
        ) : null}

        {availableTrackedLinks.length === 0 ? (
          <div style={{ marginTop: "1rem", border: "1px solid #E4E4E7", borderRadius: "1rem", padding: "1rem 1.05rem", background: "#FAFAFA" }}>
            <p style={{ margin: 0, fontSize: "0.84rem", color: "#52525B", lineHeight: 1.6 }}>
              No extra FirstPromoter links are configured for your account yet. Your main referral link above is ready to use now, and any future campaign links will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            {availableTrackedLinks.map((link) => {
              const subId = tagDrafts[link.id] ?? "";
              const taggedLink = buildTaggedTrackedLink(link.url, subId);
              const tagEditorOpen = expandedTrackedLinkId === link.id;

              return (
                <div key={link.id} style={{ border: "1px solid #E4E4E7", borderRadius: "1rem", padding: "1rem" }}>
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div style={{ minWidth: 0 }}>
                        <div className="flex flex-wrap items-center gap-2">
                          <p style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "#09090B" }}>{link.name}</p>
                          <span style={{ borderRadius: "9999px", background: "rgba(68,168,216,0.1)", color: "#0F766E", fontSize: "0.72rem", fontWeight: 700, padding: "0.2rem 0.55rem" }}>
                            {link.kind === "primary" ? "Default" : "Campaign"}
                          </span>
                        </div>
                        <p style={{ margin: "0.2rem 0 0", fontSize: "0.8rem", color: "#71717A" }}>
                          {formatTrackedDestination(link.destinationPath)}
                        </p>
                        <p style={{ margin: "0.45rem 0 0", fontSize: "0.78rem", color: "#0F766E", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {link.url}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => void handleCopyTrackedLink(link)}
                          style={{ border: "none", borderRadius: "9999px", padding: "0.45rem 0.85rem", background: copiedId === `tracked:${link.id}` ? "rgba(22,163,74,0.12)" : "rgba(68,168,216,0.1)", color: copiedId === `tracked:${link.id}` ? "#15803D" : "#0F766E", fontWeight: 700, cursor: "pointer" }}
                        >
                          {copiedId === `tracked:${link.id}` ? "Copied!" : "Copy"}
                        </button>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          style={{ borderRadius: "9999px", padding: "0.45rem 0.85rem", background: "#F4F4F5", color: "#52525B", fontWeight: 700, textDecoration: "none" }}
                        >
                          Open
                        </a>
                        <button
                          onClick={() =>
                            setExpandedTrackedLinkId((current) => (current === link.id ? null : link.id))
                          }
                          style={{ border: "1px solid #E4E4E7", borderRadius: "9999px", padding: "0.45rem 0.85rem", background: "#FFFFFF", color: "#52525B", fontWeight: 700, cursor: "pointer" }}
                        >
                          {tagEditorOpen ? "Hide source tag" : "Add source tag"}
                        </button>
                      </div>
                    </div>

                    {tagEditorOpen ? (
                      <div style={{ borderTop: "1px solid #F1F5F9", paddingTop: "0.85rem" }}>
                        <div className="grid gap-3 lg:grid-cols-[0.95fr_1.25fr_auto] lg:items-end">
                          <div>
                            <label
                              htmlFor={`tracked-link-subid-${link.id}`}
                              style={{ display: "block", marginBottom: "0.45rem", fontSize: "0.72rem", fontWeight: 700, color: "#71717A", letterSpacing: "0.07em", textTransform: "uppercase" }}
                            >
                              Source tag
                            </label>
                            <input
                              id={`tracked-link-subid-${link.id}`}
                              value={subId}
                              onChange={(event) =>
                                setTagDrafts((current) => ({
                                  ...current,
                                  [link.id]: event.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""),
                                }))
                              }
                              placeholder="email, april-webinar, ig-bio"
                              style={{ width: "100%", padding: "0.8rem 0.95rem", borderRadius: "0.8rem", border: "1.5px solid #E4E4E7", fontSize: "0.88rem" }}
                            />
                          </div>
                          <div style={{ border: "1px solid rgba(68,168,216,0.16)", background: "rgba(68,168,216,0.06)", borderRadius: "0.95rem", padding: "0.85rem 0.95rem" }}>
                            <p style={{ margin: 0, fontSize: "0.72rem", fontWeight: 700, color: "#2563EB", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                              Tagged link preview
                            </p>
                            <p style={{ margin: "0.4rem 0 0", fontSize: "0.82rem", lineHeight: 1.6, color: "#0F766E", wordBreak: "break-word", fontFamily: "monospace" }}>
                              {taggedLink}
                            </p>
                          </div>
                          <button
                            onClick={() => void handleCopyTaggedLink(link)}
                            style={{ border: "none", borderRadius: "9999px", padding: "0.8rem 1.05rem", background: copiedId === `tagged:${link.id}` ? "rgba(22,163,74,0.12)" : "linear-gradient(135deg, #2EC4B6 0%, #44A8D8 100%)", color: copiedId === `tagged:${link.id}` ? "#15803D" : "#FFFFFF", fontWeight: 700, cursor: "pointer" }}
                          >
                            {copiedId === `tagged:${link.id}` ? "Copied!" : "Copy tagged link"}
                          </button>
                        </div>
                        <p style={{ margin: "0.55rem 0 0", fontSize: "0.76rem", color: "#A1A1AA", lineHeight: 1.55 }}>
                          Source tags help you compare where clicks and conversions are coming from inside FirstPromoter without creating a separate link record.
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SurfaceCard>

      <SurfaceCard elevated className="surface-card--editorial">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p
              style={{
                margin: 0,
                fontSize: "0.68rem",
                fontWeight: 700,
                color: "#71717A",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Legacy Positives redirects
            </p>
            <h2 style={{ margin: "0.6rem 0 0.2rem", fontSize: "1.1rem", fontWeight: 700, color: "#09090B", letterSpacing: "-0.03em" }}>
              Older convenience links you can still manage
            </h2>
            <p style={{ margin: 0, fontSize: "0.84rem", lineHeight: 1.6, color: "#71717A" }}>
              These still work as share redirects, but they are not the canonical FirstPromoter tracking system. For attribution you should rely on your main FirstPromoter referral link or the tracked links shown above.
            </p>
          </div>
        </div>

        {links.length === 0 ? (
          <p style={{ margin: "1rem 0 0", fontSize: "0.84rem", color: "#A1A1AA" }}>
            No legacy redirects on file.
          </p>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            {links.map((link) => (
              <div key={link.id} style={{ border: "1px solid #E4E4E7", borderRadius: "1rem", padding: "1rem" }}>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: "0.92rem", fontWeight: 700, color: "#09090B" }}>{link.label}</p>
                    <p style={{ margin: "0.15rem 0 0", fontSize: "0.8rem", color: "#71717A" }}>
                      {buildManagedDestination({
                        destination: link.destination,
                        subId: extractSubId(link.destination),
                      })}
                    </p>
                    <p style={{ margin: "0.35rem 0 0", fontSize: "0.78rem", color: "#0F766E", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {shortUrl(link.code)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => void handleCopyManagedLink(link)}
                      style={{ border: "none", borderRadius: "9999px", padding: "0.45rem 0.85rem", background: copiedId === link.id ? "rgba(22,163,74,0.12)" : "rgba(68,168,216,0.1)", color: copiedId === link.id ? "#15803D" : "#0F766E", fontWeight: 700, cursor: "pointer" }}
                    >
                      {copiedId === link.id ? "Copied!" : "Copy"}
                    </button>
                    <a
                      href={shortUrl(link.code)}
                      target="_blank"
                      rel="noreferrer"
                      style={{ borderRadius: "9999px", padding: "0.45rem 0.85rem", background: "#F4F4F5", color: "#52525B", fontWeight: 700, textDecoration: "none" }}
                    >
                      Open
                    </a>
                    <button
                      onClick={() => void handleDelete(link.id)}
                      style={{ border: "none", background: "transparent", color: "#A1A1AA", cursor: "pointer", fontWeight: 700 }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SurfaceCard>
    </div>
  );
}

function PerformanceTab({ performance }: { performance: AffiliatePortalViewModel }) {
  const earningsValues = performance.earningsTrend.map((point) => point.value);
  const earningsLabels = performance.earningsTrend.map((point) => point.label);
  const memberValues = performance.membersTrend.map((point) => point.value);
  const memberLabels = performance.membersTrend.map((point) => point.label);
  const hasPerformanceData =
    performance.visitors > 0 ||
    performance.leads > 0 ||
    performance.members > 0 ||
    performance.totalEarned > 0;

  useEffect(() => {
    track("affiliate_performance_viewed", {
      source_path: "/account/affiliate",
      has_data: hasPerformanceData,
      visitors: performance.visitors,
      conversions: performance.members,
    });
  }, [hasPerformanceData, performance.members, performance.visitors]);

  return (
    <div className="flex flex-col gap-4">
      <SurfaceCard elevated className="surface-card--editorial">
        <p style={{ margin: 0, fontSize: "0.68rem", fontWeight: 700, color: "#71717A", letterSpacing: "0.07em", textTransform: "uppercase" }}>
          FirstPromoter data
        </p>
        <h2 style={{ margin: "0.55rem 0 0.25rem", fontSize: "1.05rem", fontWeight: 700, color: "#09090B", letterSpacing: "-0.03em", textWrap: "balance" }}>
          This tab shows FirstPromoter attribution only
        </h2>
        <p style={{ margin: 0, fontSize: "0.84rem", lineHeight: 1.65, color: "#71717A" }}>
          Visitors, leads, members, and earnings here all come from FirstPromoter. If a click does not appear here, FirstPromoter did not count it as an attributed referral interaction.
        </p>
      </SurfaceCard>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          label="Visitors"
          value={performance.visitors.toLocaleString()}
          detail="Attributed by FirstPromoter"
        />
        <MetricCard label="Leads" value={performance.leads.toLocaleString()} />
        <MetricCard label="Members" value={performance.members.toLocaleString()} tone="positive" />
        <MetricCard label="Visitor → member" value={`${performance.conversionRate.toFixed(1)}%`} />
        <MetricCard label="Total earned" value={formatMoney(performance.totalEarned)} tone="positive" />
        <MetricCard label="Pending" value={formatMoney(performance.totalPending)} tone="warning" />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <InsightCard eyebrow="Momentum" title={performance.momentumTitle} body={performance.momentumBody} />
        <SurfaceCard elevated className="surface-card--editorial h-full">
          <p style={{ margin: 0, fontSize: "0.68rem", fontWeight: 700, color: "#71717A", letterSpacing: "0.07em", textTransform: "uppercase" }}>
            Milestone
          </p>
          <h3 style={{ margin: "0.55rem 0 0.25rem", fontSize: "1rem", fontWeight: 700, color: "#09090B", letterSpacing: "-0.02em" }}>
            {performance.milestoneLabel}
          </h3>
          <p style={{ margin: 0, fontSize: "0.84rem", color: "#71717A", lineHeight: 1.55 }}>{performance.milestoneValue}</p>
          <div style={{ marginTop: "1rem", height: 10, borderRadius: 9999, background: "#E4E4E7", overflow: "hidden" }}>
            <div
              style={{
                width: `${performance.milestoneProgress}%`,
                height: "100%",
                background: "linear-gradient(90deg, #2EC4B6 0%, #44A8D8 100%)",
              }}
            />
          </div>
        </SurfaceCard>
        <InsightCard eyebrow="Best next action" title={performance.nextActionTitle} body={performance.nextActionBody} />
      </div>

      {hasPerformanceData ? (
        <>
          <div className="grid gap-4 xl:grid-cols-2">
            <TrendCard title="Earnings trend" subtitle="Recent monthly commission movement" values={earningsValues} labels={earningsLabels} formatter={(value) => `$${value}`} />
            <TrendCard title="Member trend" subtitle="Recent monthly conversion movement" values={memberValues} labels={memberLabels} />
          </div>

          <SurfaceCard elevated className="surface-card--editorial">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p style={{ margin: 0, fontSize: "0.68rem", fontWeight: 700, color: "#71717A", letterSpacing: "0.07em", textTransform: "uppercase" }}>
                  Top sources
                </p>
                <h2 style={{ margin: "0.6rem 0 0.2rem", fontSize: "1.1rem", fontWeight: 700, color: "#09090B", letterSpacing: "-0.03em" }}>
                  What is getting attention
                </h2>
                <p style={{ margin: 0, fontSize: "0.84rem", lineHeight: 1.6, color: "#71717A" }}>
                  This gives you a simple read on which links or source tags are doing the most work.
                </p>
                <p style={{ margin: "0.45rem 0 0", fontSize: "0.76rem", lineHeight: 1.55, color: "#A1A1AA" }}>
                  These rows come from FirstPromoter reporting. If a custom destination is not showing up here, it is not being counted by FirstPromoter yet.
                </p>
              </div>
            </div>

            {performance.topSources.length > 0 ? (
              <div className="mt-4 flex flex-col gap-3">
                {performance.topSources.map((source) => (
                  <div
                    key={source.id}
                    style={{
                      border: "1px solid #E4E4E7",
                      borderRadius: "1rem",
                      padding: "1rem 1rem 0.95rem",
                      background: source.clicks > 0 ? "linear-gradient(180deg, rgba(248,251,252,1) 0%, rgba(255,255,255,1) 100%)" : "#FFFFFF",
                    }}
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p style={{ margin: 0, fontSize: "0.9rem", fontWeight: 700, color: "#09090B" }}>{source.label}</p>
                        <p style={{ margin: "0.15rem 0 0", fontSize: "0.78rem", color: "#71717A" }}>{source.detail}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[340px]">
                        <div style={{ textAlign: "left" }}>
                          <p style={{ margin: 0, fontSize: "0.68rem", color: "#A1A1AA", textTransform: "uppercase" }}>Clicks</p>
                          <p style={{ margin: "0.15rem 0 0", fontSize: "0.9rem", fontWeight: 700, color: "#09090B" }}>{source.clicks}</p>
                        </div>
                        <div style={{ textAlign: "left" }}>
                          <p style={{ margin: 0, fontSize: "0.68rem", color: "#A1A1AA", textTransform: "uppercase" }}>Leads</p>
                          <p style={{ margin: "0.15rem 0 0", fontSize: "0.9rem", fontWeight: 700, color: "#09090B" }}>{source.leads}</p>
                        </div>
                        <div style={{ textAlign: "left" }}>
                          <p style={{ margin: 0, fontSize: "0.68rem", color: "#A1A1AA", textTransform: "uppercase" }}>Members</p>
                          <p style={{ margin: "0.15rem 0 0", fontSize: "0.9rem", fontWeight: 700, color: "#09090B" }}>{source.members}</p>
                        </div>
                        <div style={{ textAlign: "left" }}>
                          <p style={{ margin: 0, fontSize: "0.68rem", color: "#A1A1AA", textTransform: "uppercase" }}>Earned</p>
                          <p style={{ margin: "0.15rem 0 0", fontSize: "0.9rem", fontWeight: 700, color: "#09090B" }}>{formatMoney(source.earnings)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ margin: "1rem 0 0", fontSize: "0.84rem", color: "#A1A1AA" }}>
                Create a source-tagged link and start sharing. This section gets more useful as those links collect clicks.
              </p>
            )}
          </SurfaceCard>
        </>
      ) : (
        <SurfaceCard elevated className="surface-card--editorial text-center">
          <div style={{ fontSize: "2rem" }}>🌿</div>
          <h2 style={{ margin: "0.75rem 0 0.35rem", fontSize: "1.15rem", fontWeight: 700, color: "#09090B", letterSpacing: "-0.02em", textWrap: "balance" }}>
            Your performance view will come to life as you share
          </h2>
          <p style={{ margin: "0 auto", maxWidth: 560, fontSize: "0.88rem", lineHeight: 1.65, color: "#71717A" }}>
            Start with one warm share, then use your FirstPromoter referral link or FirstPromoter custom links for real campaign tracking. This tab will stay clean because it only reflects what FirstPromoter actually attributes.
          </p>
        </SurfaceCard>
      )}
    </div>
  );
}

function ShareTab({
  referralLink,
}: {
  referralLink: string;
}) {
  const shareOptions = useMemo(() => {
    const options = [
      {
        id: "primary",
        label: "Primary referral link",
        detail: "Best for general sharing",
        url: referralLink,
      },
    ];
    return options;
  }, [referralLink]);

  const [selectedLinkId, setSelectedLinkId] = useState(shareOptions[0]?.id ?? "primary");
  const activeLink = shareOptions.find((option) => option.id === selectedLinkId) ?? shareOptions[0];
  const emailSwipes = buildSwipes(activeLink?.url ?? referralLink);
  const shareBlocks = buildSocialCaptions(activeLink?.url ?? referralLink);

  return (
    <div className="flex flex-col gap-4">
      <SurfaceCard elevated className="surface-card--editorial">
        <p style={{ margin: 0, fontSize: "0.68rem", fontWeight: 700, color: "#71717A", letterSpacing: "0.07em", textTransform: "uppercase" }}>
          Share setup
        </p>
        <h2 style={{ margin: "0.6rem 0 0.25rem", fontSize: "1.15rem", fontWeight: 700, color: "#09090B", letterSpacing: "-0.03em", textWrap: "balance" }}>
          Choose which link you want to share
        </h2>
        <p style={{ margin: 0, fontSize: "0.84rem", lineHeight: 1.6, color: "#71717A" }}>
          Use your primary referral link for general sharing. If you want to use a specific tracked page from My Links, paste that version into these templates before sending.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-[1.2fr_1fr]">
          <select
            value={selectedLinkId}
            onChange={(event) => setSelectedLinkId(event.target.value)}
            style={{ padding: "0.9rem 1rem", borderRadius: "0.8rem", border: "1.5px solid #E4E4E7", fontSize: "0.88rem" }}
          >
            {shareOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <div style={{ border: "1px solid #E4E4E7", borderRadius: "0.8rem", padding: "0.9rem 1rem", background: "#FAFAFA" }}>
            <p style={{ margin: 0, fontSize: "0.76rem", color: "#71717A" }}>{activeLink?.detail}</p>
            <p style={{ margin: "0.2rem 0 0", fontSize: "0.82rem", color: "#09090B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {activeLink?.url}
            </p>
          </div>
        </div>
      </SurfaceCard>

      <div className="grid gap-4 xl:grid-cols-2">
        <SurfaceCard elevated className="surface-card--editorial">
          <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#09090B", letterSpacing: "-0.02em" }}>Best places to share</h2>
          <div className="mt-4 flex flex-col gap-3">
            {[
              "A personal text or email to someone who already trusts you",
              "A blog post, newsletter, or creator page where you already have attention",
              "Your bio link, if you want a steady source of warm traffic",
            ].map((tip) => (
              <div key={tip} className="flex items-start gap-3 text-sm text-muted-foreground">
                <span aria-hidden="true">•</span>
                <span>{tip}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: "1rem", border: "1px solid rgba(46,196,182,0.18)", background: "rgba(46,196,182,0.05)", borderRadius: "0.9rem", padding: "0.9rem 1rem" }}>
            <p style={{ margin: 0, fontSize: "0.82rem", color: "#0F766E", lineHeight: 1.6 }}>
              Share in a way that feels like a genuine recommendation, not a campaign blast. Affiliates usually do best when the invitation feels personal and specific.
            </p>
          </div>
        </SurfaceCard>

        <SurfaceCard elevated className="surface-card--editorial">
          <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#09090B", letterSpacing: "-0.02em" }}>Email</h2>
          <div className="mt-4 flex flex-col gap-3">
            {emailSwipes.map((swipe) => (
              <CopyBlock
                key={swipe.id}
                label={swipe.label}
                content={swipe.content}
                onCopied={() =>
                  track("affiliate_share_asset_copied", {
                    source_path: "/account/affiliate",
                    asset_type: swipe.id,
                    selected_link: activeLink?.label,
                  })
                }
              />
            ))}
          </div>
        </SurfaceCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SurfaceCard elevated className="surface-card--editorial">
          <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#09090B", letterSpacing: "-0.02em" }}>Text / DM</h2>
          <div className="mt-4">
            <CopyBlock
              label={shareBlocks[0].label}
              content={shareBlocks[0].content}
              onCopied={() =>
                track("affiliate_share_asset_copied", {
                  source_path: "/account/affiliate",
                  asset_type: shareBlocks[0].id,
                  selected_link: activeLink?.label,
                })
              }
            />
          </div>
        </SurfaceCard>

        <SurfaceCard elevated className="surface-card--editorial">
          <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#09090B", letterSpacing: "-0.02em" }}>Social or blog CTA</h2>
          <div className="mt-4 flex flex-col gap-3">
            {shareBlocks.slice(1).map((block) => (
              <CopyBlock
                key={block.id}
                label={block.label}
                content={block.content}
                onCopied={() =>
                  track("affiliate_share_asset_copied", {
                    source_path: "/account/affiliate",
                    asset_type: block.id,
                    selected_link: activeLink?.label,
                  })
                }
              />
            ))}
          </div>
        </SurfaceCard>
      </div>
    </div>
  );
}

function EarningsTab({
  performance,
  commissions,
  payouts,
  paypalEmail,
  onPaypalChange,
  onSavePayPal,
  paypalSaving,
  paypalSaved,
  paypalError,
}: {
  performance: AffiliatePortalViewModel;
  commissions: AffiliateCommission[];
  payouts: AffiliatePayout[];
  paypalEmail: string;
  onPaypalChange: (value: string) => void;
  onSavePayPal: () => void;
  paypalSaving: boolean;
  paypalSaved: boolean;
  paypalError: string | null;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total paid" value={formatMoney(performance.totalPaid)} tone="positive" />
        <MetricCard label="Pending" value={formatMoney(performance.totalPending)} tone="warning" />
        <MetricCard label="Last payout" value={formatShortDate(performance.lastPayoutDate)} detail="Latest FirstPromoter payout record" />
        <MetricCard
          label="Payout readiness"
          value={performance.payoutReady ? "Ready" : "Needs attention"}
          tone={performance.payoutReady ? "positive" : "warning"}
          detail={performance.payoutReady ? "Payment details are in good shape." : "Add payout details or tax info to stay ready."}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <SurfaceCard elevated className="surface-card--editorial">
          <p style={{ margin: 0, fontSize: "0.68rem", fontWeight: 700, color: "#71717A", letterSpacing: "0.07em", textTransform: "uppercase" }}>
            Payout checklist
          </p>
          <div className="mt-4 flex flex-col gap-3">
            {[
              { label: "Affiliate account is active", complete: true },
              { label: "PayPal email is saved", complete: Boolean(paypalEmail.trim()) },
              { label: "Payout details are ready", complete: Boolean(paypalEmail.trim()) },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-4 rounded-2xl border border-border px-4 py-3">
                <span style={{ fontSize: "0.88rem", color: "#09090B", fontWeight: 600 }}>{item.label}</span>
                <span style={{ fontSize: "0.78rem", fontWeight: 700, color: item.complete ? "#15803D" : "#B45309" }}>
                  {item.complete ? "Ready" : "Needs attention"}
                </span>
              </div>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard elevated className="surface-card--editorial">
          <p style={{ margin: 0, fontSize: "0.68rem", fontWeight: 700, color: "#71717A", letterSpacing: "0.07em", textTransform: "uppercase" }}>
            Payout settings
          </p>
          <h2 style={{ margin: "0.6rem 0 0.25rem", fontSize: "1rem", fontWeight: 700, color: "#09090B", letterSpacing: "-0.02em" }}>
            PayPal email
          </h2>
          <p style={{ margin: 0, fontSize: "0.84rem", lineHeight: 1.6, color: "#71717A" }}>
            This is the email Positives should use when coordinating your affiliate payouts. If PayPal needs any tax or verification details later, they will handle that in their own flow.
          </p>

          <div className="mt-4 flex flex-col gap-3">
            <input
              type="email"
              value={paypalEmail}
              onChange={(event) => onPaypalChange(event.target.value)}
              placeholder="your-paypal@email.com"
              style={{ padding: "0.85rem 0.95rem", borderRadius: "0.8rem", border: "1.5px solid #E4E4E7", fontSize: "0.88rem" }}
            />
            {paypalError ? <p style={{ margin: 0, fontSize: "0.8rem", color: "#DC2626" }}>{paypalError}</p> : null}
            {paypalSaved ? <p style={{ margin: 0, fontSize: "0.8rem", color: "#15803D" }}>PayPal email saved.</p> : null}
            <button
              onClick={onSavePayPal}
              disabled={paypalSaving || !paypalEmail.trim()}
              style={{
                alignSelf: "flex-start",
                border: "none",
                borderRadius: "9999px",
                padding: "0.75rem 1.2rem",
                background: paypalSaving || !paypalEmail.trim() ? "#A1A1AA" : "linear-gradient(135deg, #2EC4B6 0%, #44A8D8 100%)",
                color: "#FFFFFF",
                fontWeight: 700,
                cursor: paypalSaving ? "wait" : "pointer",
              }}
            >
              {paypalSaving ? "Saving…" : "Save payout email"}
            </button>
          </div>
        </SurfaceCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SurfaceCard elevated className="surface-card--editorial">
          <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#09090B", letterSpacing: "-0.02em" }}>Commission history</h2>
          {commissions.length === 0 ? (
            <p style={{ margin: "1rem 0 0", fontSize: "0.84rem", color: "#A1A1AA" }}>
              No commissions yet. Once your referrals start converting, they&apos;ll appear here.
            </p>
          ) : (
            <div className="mt-4">
              {commissions.map((commission) => (
                <CommissionRow key={commission.id} commission={commission} />
              ))}
            </div>
          )}
        </SurfaceCard>

        <SurfaceCard elevated className="surface-card--editorial">
          <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#09090B", letterSpacing: "-0.02em" }}>Payout history</h2>
          {payouts.length === 0 ? (
            <p style={{ margin: "1rem 0 0", fontSize: "0.84rem", color: "#A1A1AA" }}>
              No payouts recorded yet. When payouts are issued through FirstPromoter, they&apos;ll show up here.
            </p>
          ) : (
            <div className="mt-4">
              {payouts.map((payout) => (
                <PayoutRow key={payout.id} payout={payout} />
              ))}
            </div>
          )}
        </SurfaceCard>
      </div>
    </div>
  );
}

export function AffiliatePortal({
  isAffiliate,
  affiliateId,
  affiliateLinkId,
  affiliateCreatedAt,
  token,
  stats,
  commissions,
  payouts,
  memberName,
  paypalEmail: initialPaypalEmail,
  initialLinks = [],
  trackedLinks,
  trackedLinksError,
  autoEnroll = false,
  performance,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("link");
  const [loading, setLoading] = useState(false);
  const [enrolled, setEnrolled] = useState(isAffiliate);
  const [currentToken, setCurrentToken] = useState(token);
  const [copiedLink, setCopiedLink] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paypalEmail, setPaypalEmail] = useState(initialPaypalEmail);
  const [paypalSaving, setPaypalSaving] = useState(false);
  const [paypalSaved, setPaypalSaved] = useState(false);
  const [paypalError, setPaypalError] = useState<string | null>(null);
  const [slugEditing, setSlugEditing] = useState(false);
  const [slugDraft, setSlugDraft] = useState(currentToken ?? "");
  const [slugSaving, setSlugSaving] = useState(false);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [slugSaved, setSlugSaved] = useState(false);
  const [slugConfirmed, setSlugConfirmed] = useState(false);
  const [managedLinks, setManagedLinks] = useState<AffiliateLink[]>(initialLinks);
  const autoEnrollStartedRef = useRef(false);

  void affiliateId;
  void affiliateLinkId;
  void affiliateCreatedAt;
  void memberName;
  void stats;

  const referralLink = currentToken ? `https://positives.life?fpr=${currentToken}` : null;

  useEffect(() => {
    track("affiliate_portal_viewed", {
      source_path: "/account/affiliate",
      is_affiliate: enrolled,
    });
  }, [enrolled]);

  const handleEnroll = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await getReferralLinkAction();
    setLoading(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setCurrentToken(result.token);
    setEnrolled(true);
    track("affiliate_enrollment_completed", {
      source_path: "/account/affiliate",
      affiliate_token_present: Boolean(result.token),
    });
  }, []);

  useEffect(() => {
    if (!autoEnroll || enrolled || loading || autoEnrollStartedRef.current) return;
    autoEnrollStartedRef.current = true;
    const timer = window.setTimeout(() => void handleEnroll(), 0);
    return () => window.clearTimeout(timer);
  }, [autoEnroll, enrolled, handleEnroll, loading]);

  const handleCopyPrimaryLink = useCallback(async () => {
    if (!referralLink) return;
    await navigator.clipboard.writeText(referralLink);
    track("affiliate_link_copied", { source_path: "/account/affiliate" });
    setCopiedLink(true);
    window.setTimeout(() => setCopiedLink(false), 2200);
  }, [referralLink]);

  const handleSavePayPal = useCallback(async () => {
    setPaypalSaving(true);
    setPaypalError(null);
    setPaypalSaved(false);
    const result = await savePayPalEmailAction(paypalEmail);
    setPaypalSaving(false);
    if ("error" in result) {
      setPaypalError(result.error);
      return;
    }
    setPaypalSaved(true);
    track("affiliate_payout_details_saved", { source_path: "/account/affiliate" });
    window.setTimeout(() => setPaypalSaved(false), 4000);
  }, [paypalEmail]);

  const handleSlugSave = useCallback(async () => {
    setSlugSaving(true);
    setSlugError(null);
    const result = await updateReferralSlugAction(slugDraft);
    setSlugSaving(false);
    if ("error" in result) {
      setSlugError(result.error);
      return;
    }
    setCurrentToken(result.newToken);
    setSlugEditing(false);
    setSlugConfirmed(false);
    setSlugSaved(true);
    window.setTimeout(() => setSlugSaved(false), 3000);
  }, [slugDraft]);

  if (enrolled && !paypalEmail.trim()) {
    return (
      <PayoutSetupStep
        paypalEmail={paypalEmail}
        onPaypalChange={setPaypalEmail}
        onSave={async () => {
          await handleSavePayPal();
        }}
        saving={paypalSaving}
        error={paypalError}
      />
    );
  }

  if (!enrolled) {
    return <EnrollScreen onEnroll={handleEnroll} loading={loading} error={error} />;
  }

  if (!referralLink) {
    return <EnrollScreen onEnroll={handleEnroll} loading={loading} error={error} />;
  }

  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", padding: "1.75rem 1rem 5rem" }}>
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div style={{ maxWidth: 700 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              borderRadius: "9999px",
              padding: "0.3rem 0.8rem",
              background: "linear-gradient(135deg, #2EC4B6 0%, #44A8D8 100%)",
              color: "#FFFFFF",
              fontSize: "0.68rem",
              fontWeight: 700,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
            }}
          >
            Affiliate Program
          </div>
          <h1
            style={{
              margin: "0.9rem 0 0.35rem",
              fontFamily: "var(--font-heading)",
              fontSize: "clamp(1.7rem, 4vw, 2.35rem)",
              fontWeight: 700,
              color: "#09090B",
              letterSpacing: "-0.045em",
              lineHeight: 1.02,
              textWrap: "balance",
            }}
          >
            Your affiliate portal
          </h1>
          <p style={{ margin: 0, fontSize: "0.94rem", color: "#71717A", lineHeight: 1.65 }}>
            Keep your core link simple, add source tags when you need more visibility, and watch which sharing efforts are actually moving.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: "0.55rem",
            overflowX: "auto",
            paddingBottom: "0.25rem",
            scrollbarWidth: "none",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flexShrink: 0,
                  border: active ? "1px solid rgba(46,196,182,0.2)" : "1px solid #E4E4E7",
                  borderRadius: "9999px",
                  padding: "0.72rem 1rem",
                  background: active ? "linear-gradient(180deg, rgba(46,196,182,0.14) 0%, rgba(68,168,216,0.08) 100%)" : "#FFFFFF",
                  color: active ? "#0F766E" : "#52525B",
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: active ? "0 10px 24px rgba(46,196,182,0.08)" : "none",
                }}
              >
                <span aria-hidden="true" style={{ marginRight: "0.4rem" }}>{tab.icon}</span>
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === "link" ? (
        <LinkTab
          currentToken={currentToken}
          referralLink={referralLink}
          copiedLink={copiedLink}
          onCopyPrimaryLink={handleCopyPrimaryLink}
          slugEditing={slugEditing}
          slugDraft={slugDraft}
          slugSaving={slugSaving}
          slugSaved={slugSaved}
          slugError={slugError}
          slugConfirmed={slugConfirmed}
          onSlugDraftChange={(value) => setSlugDraft(value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
          onSlugEdit={() => {
            setSlugEditing(true);
            setSlugDraft(currentToken ?? "");
            setSlugError(null);
            setSlugConfirmed(false);
          }}
          onSlugCancel={() => {
            setSlugEditing(false);
            setSlugDraft(currentToken ?? "");
            setSlugError(null);
            setSlugConfirmed(false);
          }}
          onSlugSave={handleSlugSave}
          onSlugConfirmChange={setSlugConfirmed}
          trackedLinks={trackedLinks}
          trackedLinksError={trackedLinksError}
          links={managedLinks}
          onLinksChange={setManagedLinks}
        />
      ) : null}

      {activeTab === "performance" ? <PerformanceTab performance={performance} /> : null}
      {activeTab === "share" ? <ShareTab referralLink={referralLink} /> : null}
      {activeTab === "earnings" ? (
        <EarningsTab
          performance={performance}
          commissions={commissions}
          payouts={payouts}
          paypalEmail={paypalEmail}
          onPaypalChange={setPaypalEmail}
          onSavePayPal={() => void handleSavePayPal()}
          paypalSaving={paypalSaving}
          paypalSaved={paypalSaved}
          paypalError={paypalError}
        />
      ) : null}
    </div>
  );
}
