"use client";

/**
 * components/affiliate/AffiliatePortal.tsx
 *
 * Full affiliate portal for Positives members.
 *
 * Pre-enrollment: single card CTA to provision a Rewardful account.
 * Post-enrollment: 4-tab experience — My Link | Stats | Share Kit | Earnings
 *
 * Design tokens: brand teal (#2EC4B6), sky blue (#44A8D8), amber (#F59E0B),
 * Montserrat headings, Poppins body, generous radii, shadow-medium cards.
 */

import { useState, useCallback } from "react";
import { getReferralLinkAction, savePayPalEmailAction, createAffiliateLinkAction, deleteAffiliateLinkAction } from "@/app/account/affiliate/actions";
import type { RewardfulCommission } from "@/lib/rewardful/client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Stats {
  visitors: number;
  leads: number;
  conversions: number;
}

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
  token: string | null;
  stats: Stats | null;
  commissions: RewardfulCommission[];
  memberName: string;
  paypalEmail: string;
  initialLinks?: AffiliateLink[];
}

type Tab = "link" | "stats" | "share" | "earnings";

const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: "link",     label: "My Link",   emoji: "🔗" },
  { id: "stats",    label: "Stats",     emoji: "📊" },
  { id: "share",    label: "Share Kit", emoji: "📨" },
  { id: "earnings", label: "Earnings",  emoji: "💸" },
];

// ─── Swipe copy ───────────────────────────────────────────────────────────────

function buildSwipes(link: string) {
  return [
    {
      id: "swipe-1",
      label: "Swipe 1 — Personal recommendation",
      subject: "This is the daily practice I swear by",
      body: `Hey [Name],

I've been doing this daily audio practice called Positives for a while now, and it's genuinely changed how I start my day.

It's 10 minutes of curated audio — interviews, stories, and perspectives that actually stick with you. Not self-help fluff. Real stuff that helps me stay grounded no matter what's going on.

I think you'd love it. You can try it here:
${link}

Let me know what you think.`,
    },
    {
      id: "swipe-2",
      label: "Swipe 2 — Short & punchy",
      subject: "10 minutes that changed my mornings",
      body: `Quick share —

I've been using Positives to start my mornings and it's been really good.

Daily audio, curated reminders, and a practice that actually helps me stay grounded without feeling like homework.

Check it out: ${link}`,
    },
  ];
}

const SOCIAL_CAPTIONS = (link: string) => [
  {
    id: "ig",
    label: "Instagram / Facebook",
    copy: `I've been doing a 10-minute daily audio practice and it's been a game changer for my mornings.

If you're looking for something that keeps you grounded and inspired — without the hustle noise — check out @positives.life

My link: ${link}

#Positives #MorningRoutine #DailyPractice`,
  },
  {
    id: "twitter",
    label: "Twitter / X",
    copy: `Started using @positives for my morning practice.

10 minutes of curated audio that actually sticks with you.

Worth trying: ${link}`,
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    copy: `I've been consistent with one new habit this year: a 10-minute morning audio practice from Positives.

It's not a podcast. It's a curated daily practice — stories, interviews, and perspectives that shift how you see the day.

If you're building a more intentional morning, I'd recommend giving it a try: ${link}`,
  },
];

const SMS_TEMPLATES = (link: string) => [
  {
    id: "sms-personal",
    label: "Personal intro",
    copy: `Hey! I've been using this daily audio practice called Positives and I really think you'd like it. 10 mins every morning — stories, interviews, real stuff that sticks with you. Check it out: ${link}`,
  },
  {
    id: "sms-quick",
    label: "Quick nudge",
    copy: `Random rec — I started this morning audio thing called Positives and it's been great. Worth a look: ${link}`,
  },
];

const DM_SCRIPTS = (link: string) => [
  {
    id: "dm-warm",
    label: "Warm DM (friend or follower)",
    copy: `Hey! Just wanted to share something I've been using — it's a 10-minute daily audio practice called Positives. Curated stories, interviews, perspectives that actually help you start the day right. Not a podcast, more like a daily ritual. Thought of you because [reason]. Here's my link if you want to try it: ${link}`,
  },
  {
    id: "dm-reply",
    label: "Reply to someone's post about routine/mindset",
    copy: `Love this! I've been doing something similar — there's this daily audio practice called Positives that's been a game changer for my mornings. 10 minutes, no fluff. Might be up your alley: ${link}`,
  },
];

const TALKING_POINTS = [
  "20% recurring commission — for as long as each member stays active",
  "Positives members listen daily — this is a high-retention product",
  "No approval needed — your link is live the moment you enroll",
  "Commissions are paid monthly via Rewardful directly to you",
  "Authentic recommendation only — share with people who would genuinely love it",
];

// ─── Small primitives ─────────────────────────────────────────────────────────

function StatChip({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1.5px solid #E4E4E7",
        borderRadius: "1rem",
        padding: "1.25rem 1rem",
        textAlign: "center",
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
      }}
    >
      <div
        style={{
          fontSize: "2rem",
          fontWeight: 700,
          color: "#09090B",
          fontFamily: "var(--font-heading)",
          letterSpacing: "-0.04em",
          lineHeight: 1,
          marginBottom: "0.375rem",
        }}
      >
        {value.toLocaleString()}
      </div>
      <div
        style={{
          fontSize: "0.7rem",
          fontWeight: 700,
          color: "#71717A",
          textTransform: "uppercase",
          letterSpacing: "0.07em",
        }}
      >
        {label}
      </div>
    </div>
  );
}

function CopyBlock({ id, label, content }: { id: string; label: string; content: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  }, [content]);

  return (
    <div style={{ marginBottom: "1.25rem" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "0.5rem",
        }}
      >
        <span
          style={{
            fontSize: "0.7rem",
            fontWeight: 700,
            color: "#71717A",
            textTransform: "uppercase",
            letterSpacing: "0.07em",
          }}
        >
          {label}
        </span>
        <button
          id={id}
          onClick={handleCopy}
          style={{
            fontSize: "0.78rem",
            fontWeight: 600,
            color: copied ? "#2EC4B6" : "#44A8D8",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
            transition: "color 0.2s",
          }}
        >
          {copied ? "✓ Copied!" : "Copy"}
        </button>
      </div>
      <pre
        style={{
          background: "#F4F4F5",
          border: "1px solid #E4E4E7",
          borderRadius: "0.875rem",
          padding: "1rem 1.125rem",
          fontSize: "0.83rem",
          color: "#3F3F46",
          lineHeight: 1.65,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          fontFamily: "var(--font-sans)",
          margin: 0,
        }}
      >
        {content}
      </pre>
    </div>
  );
}

function CommissionRow({ c }: { c: RewardfulCommission }) {
  const amount = `$${(c.amount / 100).toFixed(2)}`;
  const date = new Date(c.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const statusStyles: Record<string, { color: string; bg: string }> = {
    paid:    { color: "#16A34A", bg: "rgba(22,163,74,0.1)" },
    pending: { color: "#D97706", bg: "rgba(217,119,6,0.1)" },
    unpaid:  { color: "#71717A", bg: "rgba(113,113,122,0.1)" },
  };
  const style = statusStyles[c.status] ?? statusStyles.unpaid;

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0.875rem 0",
        borderBottom: "1px solid #F4F4F5",
      }}
    >
      <div>
        <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#09090B" }}>{amount}</div>
        <div style={{ fontSize: "0.75rem", color: "#71717A", marginTop: "0.125rem" }}>{date}</div>
      </div>
      <span
        style={{
          fontSize: "0.72rem",
          fontWeight: 700,
          color: style.color,
          background: style.bg,
          borderRadius: "9999px",
          padding: "0.25rem 0.75rem",
          textTransform: "capitalize",
          letterSpacing: "0.02em",
        }}
      >
        {c.status}
      </span>
    </div>
  );
}

// ─── Link Builder ─────────────────────────────────────────────────────────────

function LinkBuilder({ token, initialLinks }: { token: string; initialLinks: AffiliateLink[] }) {
  const appUrl = "https://positives.life";
  const [links, setLinks]             = useState<AffiliateLink[]>(initialLinks);
  const [label, setLabel]             = useState("");
  const [destination, setDestination] = useState("");
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [copiedId, setCopiedId]       = useState<string | null>(null);

  const shortUrl = (code: string) => `${appUrl}/go/${code}`;

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(shortUrl(code)).catch(() => {});
    setCopiedId(code);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreate = async () => {
    const trimLabel = label.trim();
    const trimDest  = destination.trim();
    if (!trimLabel) { setError("Please enter a name for this link."); return; }
    setSaving(true);
    setError(null);
    const result = await createAffiliateLinkAction({ label: trimLabel, destination: trimDest || null });
    setSaving(false);
    if ("error" in result) {
      setError(result.error);
    } else {
      setLinks(prev => [result.link, ...prev]);
      setLabel("");
      setDestination("");
    }
  };

  const handleDelete = async (id: string) => {
    const result = await deleteAffiliateLinkAction(id);
    if (!("error" in result)) setLinks(prev => prev.filter(l => l.id !== id));
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.75rem 1rem",
    fontSize: "0.875rem",
    borderRadius: "0.75rem",
    border: "1.5px solid #E4E4E7",
    outline: "none",
    fontFamily: "var(--font-sans)",
    color: "#09090B",
    background: "#FAFAFA",
    boxSizing: "border-box",
  };

  void token; // token used server-side for code generation

  return (
    <div style={{ background: "#FFFFFF", border: "1.5px solid #E4E4E7", borderRadius: "1.25rem", padding: "1.75rem", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
      <p style={{ fontSize: "0.68rem", fontWeight: 700, color: "#71717A", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.75rem" }}>
        🔗 Link Builder
      </p>
      <p style={{ fontSize: "0.83rem", color: "#52525B", marginBottom: "1.25rem", lineHeight: 1.5 }}>
        Create short tracked links to any page — your blog, Instagram bio, emails, or any Positives page.
        Anyone who clicks gets your referral cookie set automatically.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem", marginBottom: "1.25rem" }}>
        <input style={inputStyle} placeholder="Link name (e.g. My blog post, IG bio)" value={label} onChange={e => setLabel(e.target.value)} maxLength={60} />
        <input style={inputStyle} placeholder="Destination URL — any site (blank = positives.life homepage)" value={destination} onChange={e => setDestination(e.target.value)} />
        {error && <p style={{ fontSize: "0.78rem", color: "#DC2626", margin: 0 }}>{error}</p>}
        <button
          onClick={handleCreate}
          disabled={saving || !label.trim()}
          style={{ alignSelf: "flex-start", padding: "0.625rem 1.25rem", fontSize: "0.83rem", fontWeight: 700, color: "#FFFFFF", background: saving || !label.trim() ? "#A1A1AA" : "linear-gradient(135deg, #2EC4B6 0%, #44A8D8 100%)", border: "none", borderRadius: "9999px", cursor: saving || !label.trim() ? "not-allowed" : "pointer" }}
        >
          {saving ? "Creating…" : "Create link"}
        </button>
      </div>

      {links.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {links.map(link => (
            <div key={link.id} style={{ display: "flex", alignItems: "center", gap: "0.625rem", background: "#F8FBFC", border: "1px solid rgba(46,196,182,0.15)", borderRadius: "0.875rem", padding: "0.75rem 1rem" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "#09090B", margin: "0 0 0.1rem" }}>{link.label}</p>
                <p style={{ fontSize: "0.73rem", color: "#2EC4B6", margin: 0, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{shortUrl(link.code)}</p>
              </div>
              <span style={{ fontSize: "0.7rem", color: "#71717A", flexShrink: 0 }}>{link.clicks} clicks</span>
              <button onClick={() => handleCopy(link.code)} style={{ flexShrink: 0, fontSize: "0.75rem", fontWeight: 700, color: copiedId === link.code ? "#2EC4B6" : "#44A8D8", background: "transparent", border: "none", cursor: "pointer", padding: "0.25rem 0.5rem" }}>
                {copiedId === link.code ? "Copied!" : "Copy"}
              </button>
              <button onClick={() => handleDelete(link.id)} style={{ flexShrink: 0, fontSize: "0.75rem", color: "#A1A1AA", background: "transparent", border: "none", cursor: "pointer", padding: "0.25rem" }} aria-label="Delete link">✕</button>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ fontSize: "0.78rem", color: "#A1A1AA", textAlign: "center", margin: "0.5rem 0 0" }}>No custom links yet — create one above.</p>
      )}
    </div>
  );
}

// ─── Pre-enrollment screen ────────────────────────────────────────────────────

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
    <div
      style={{
        maxWidth: 480,
        margin: "3rem auto",
        padding: "0 1rem",
      }}
    >
      <div
        style={{
          background: "#FFFFFF",
          border: "1.5px solid #E4E4E7",
          borderRadius: "1.5rem",
          padding: "2.5rem 2rem",
          boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Top gradient strip */}
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

        {/* Icon */}
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
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#2EC4B6"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>

        <h1
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "1.4rem",
            fontWeight: 700,
            color: "#09090B",
            letterSpacing: "-0.03em",
            lineHeight: 1.2,
            marginBottom: "0.75rem",
            textWrap: "balance",
          }}
        >
          Earn 20% for every member you refer
        </h1>

        <p style={{ fontSize: "0.9rem", color: "#52525B", lineHeight: 1.65, marginBottom: "1.75rem" }}>
          Share Positives with people you care about. When they join, you earn 20% of their
          monthly membership — for as long as they stay.
        </p>

        {/* Benefits */}
        <ul
          style={{
            listStyle: "none",
            margin: "0 0 2rem",
            padding: 0,
            display: "flex",
            flexDirection: "column",
            gap: "0.625rem",
            textAlign: "left",
          }}
        >
          {[
            ["🔗", "Unique referral link — generated instantly"],
            ["💰", "20% recurring — paid monthly via Rewardful"],
            ["📊", "Real-time stats, earnings, and share resources"],
          ].map(([icon, text]) => (
            <li
              key={text}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "0.75rem",
                fontSize: "0.875rem",
                color: "#3F3F46",
              }}
            >
              <span style={{ fontSize: "1rem", lineHeight: 1.4, flexShrink: 0 }}>{icon}</span>
              <span style={{ lineHeight: 1.55 }}>{text}</span>
            </li>
          ))}
        </ul>

        {error && (
          <p
            style={{
              fontSize: "0.85rem",
              color: "#EF4444",
              marginBottom: "1rem",
              background: "rgba(239,68,68,0.07)",
              borderRadius: "0.75rem",
              padding: "0.625rem 1rem",
            }}
          >
            {error}
          </p>
        )}

        <button
          id="affiliate-enroll-btn"
          onClick={onEnroll}
          disabled={loading}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            background: loading
              ? "linear-gradient(135deg, #5DDDD4 0%, #74C0E0 100%)"
              : "linear-gradient(135deg, #2EC4B6 0%, #44A8D8 100%)",
            color: "#FFFFFF",
            border: "none",
            borderRadius: "9999px",
            padding: "0.875rem 2rem",
            fontSize: "0.9rem",
            fontWeight: 700,
            cursor: loading ? "wait" : "pointer",
            letterSpacing: "-0.01em",
            boxShadow: "0 4px 20px rgba(46,196,182,0.3), 0 0 0 0 rgba(46,196,182,0)",
            transition: "opacity 0.2s, box-shadow 0.2s",
            width: "100%",
            maxWidth: 320,
          }}
        >
          {loading ? (
            <>
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                aria-hidden="true"
                style={{ animation: "spin 0.75s linear infinite" }}
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              Setting up your link…
            </>
          ) : (
            <>
              Get my referral link
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </>
          )}
        </button>

        <p style={{ fontSize: "0.75rem", color: "#A1A1AA", marginTop: "1rem" }}>
          Free to join · Instant link · No approval needed
        </p>
      </div>
    </div>
  );
}

// ─── Main portal ──────────────────────────────────────────────────────────────

export function AffiliatePortal({
  isAffiliate,
  affiliateId,
  token,
  stats,
  commissions,
  memberName,
  paypalEmail: initialPaypalEmail,
  initialLinks = [],
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("link");
  const [loading, setLoading]     = useState(false);
  const [enrolled, setEnrolled]   = useState(isAffiliate);
  const [currentToken, setCurrentToken] = useState(token);
  const [copiedLink, setCopiedLink]     = useState(false);
  const [error, setError]               = useState<string | null>(null);

  // PayPal payout state
  const [paypalEmail, setPaypalEmail]       = useState(initialPaypalEmail);
  const [paypalSaving, setPaypalSaving]     = useState(false);
  const [paypalSaved, setPaypalSaved]       = useState(false);
  const [paypalError, setPaypalError]       = useState<string | null>(null);

  void affiliateId;
  void memberName;

  const referralLink = currentToken
    ? `https://positives.life?via=${currentToken}`
    : null;

  // Enroll handler
  async function handleEnroll() {
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
  }

  async function handleCopyLink() {
    if (!referralLink) return;
    await navigator.clipboard.writeText(referralLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  }

  const totalPaid    = commissions.filter(c => c.status === "paid").reduce((s, c) => s + c.amount, 0);
  const totalPending = commissions.filter(c => c.status !== "paid").reduce((s, c) => s + c.amount, 0);

  async function handleSavePayPal() {
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
    setTimeout(() => setPaypalSaved(false), 4000);
  }

  // ── Pre-enrollment ──
  if (!enrolled) {
    return (
      <EnrollScreen
        onEnroll={handleEnroll}
        loading={loading}
        error={error}
      />
    );
  }

  const swipes  = referralLink ? buildSwipes(referralLink) : [];
  const socials = referralLink ? SOCIAL_CAPTIONS(referralLink) : [];
  const smsTemplates = referralLink ? SMS_TEMPLATES(referralLink) : [];
  const dmScripts    = referralLink ? DM_SCRIPTS(referralLink) : [];

  // ── Full portal ──
  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "1.5rem 1rem 5rem" }}>

      {/* Page header */}
      <div style={{ marginBottom: "2rem" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.375rem",
            background: "linear-gradient(135deg, #2EC4B6 0%, #44A8D8 100%)",
            color: "#fff",
            fontSize: "0.68rem",
            fontWeight: 700,
            letterSpacing: "0.07em",
            textTransform: "uppercase",
            padding: "0.25rem 0.75rem",
            borderRadius: "9999px",
            marginBottom: "0.875rem",
          }}
        >
          <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          Affiliate Program
        </div>
        <h1
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "clamp(1.4rem, 3vw, 1.75rem)",
            fontWeight: 700,
            color: "#09090B",
            letterSpacing: "-0.035em",
            lineHeight: 1.15,
            marginBottom: "0.375rem",
            textWrap: "balance",
          }}
        >
          Your Affiliate Portal
        </h1>
        <p style={{ fontSize: "0.875rem", color: "#71717A", lineHeight: 1.55 }}>
          Referral link, share resources, stats, and earnings — all in one place.
        </p>
      </div>

      {/* Tab bar */}
      <div
        role="tablist"
        aria-label="Affiliate portal sections"
        style={{
          display: "flex",
          gap: "0.25rem",
          background: "#F4F4F5",
          borderRadius: "1rem",
          padding: "0.3rem",
          marginBottom: "1.75rem",
        }}
      >
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                padding: "0.5rem 0.25rem",
                fontSize: "clamp(0.72rem, 1.8vw, 0.82rem)",
                fontWeight: 600,
                border: "none",
                borderRadius: "0.75rem",
                cursor: "pointer",
                transition: "all 0.18s ease",
                background: isActive ? "#FFFFFF" : "transparent",
                color: isActive ? "#09090B" : "#71717A",
                boxShadow: isActive ? "0 1px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)" : "none",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.15rem",
              }}
            >
              <span style={{ fontSize: "1rem", lineHeight: 1 }}>{tab.emoji}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Tab: My Link ── */}
      {activeTab === "link" && (
        <div
          id="panel-link"
          role="tabpanel"
          aria-labelledby="tab-link"
          style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
        >
          {/* Link card */}
          <div
            style={{
              background: "#FFFFFF",
              border: "1.5px solid #E4E4E7",
              borderRadius: "1.25rem",
              padding: "1.75rem",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                top: 0, left: 0, right: 0,
                height: 3,
                background: "linear-gradient(90deg, #2EC4B6 0%, #44A8D8 100%)",
              }}
            />
            <p
              style={{
                fontSize: "0.68rem",
                fontWeight: 700,
                color: "#71717A",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: "0.75rem",
                marginTop: "0.25rem",
              }}
            >
              Your referral link
            </p>

            {/* Link display + copy */}
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                alignItems: "center",
                background: "#F8FBFC",
                border: "1.5px solid rgba(46,196,182,0.2)",
                borderRadius: "0.875rem",
                padding: "0.875rem 1rem",
                marginBottom: "1.125rem",
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#2EC4B6"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ flexShrink: 0 }}
                aria-hidden="true"
              >
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              <span
                style={{
                  flex: 1,
                  fontSize: "0.875rem",
                  color: "#09090B",
                  fontFamily: "var(--font-sans)",
                  fontWeight: 500,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {referralLink}
              </span>
              <button
                id="copy-referral-link"
                onClick={handleCopyLink}
                style={{
                  flexShrink: 0,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.3rem",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  color: copiedLink ? "#2EC4B6" : "#44A8D8",
                  background: copiedLink ? "rgba(46,196,182,0.08)" : "transparent",
                  border: `1px solid ${copiedLink ? "rgba(46,196,182,0.3)" : "transparent"}`,
                  borderRadius: "9999px",
                  padding: "0.3rem 0.75rem",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                {copiedLink ? (
                  <>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    Copy
                  </>
                )}
              </button>
            </div>

            {/* Commission callout */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.625rem",
                background: "rgba(245,158,11,0.08)",
                border: "1px solid rgba(245,158,11,0.2)",
                borderRadius: "0.875rem",
                padding: "0.75rem 1rem",
                marginBottom: "1.125rem",
              }}
            >
              <span style={{ fontSize: "1.1rem", lineHeight: 1 }}>💰</span>
              <p style={{ fontSize: "0.85rem", color: "#92400E", lineHeight: 1.5, margin: 0 }}>
                <strong style={{ fontWeight: 700 }}>You earn 20% recurring.</strong>{" "}
                Every month your referrals stay active, that commission is yours.
              </p>
            </div>

            {/* Rewardful dashboard link */}
            <a
              href="/account/affiliate/portal"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                fontSize: "0.83rem",
                fontWeight: 600,
                color: "#44A8D8",
                textDecoration: "none",
                transition: "opacity 0.15s",
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "0.75")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              Open Rewardful Dashboard
            </a>
          </div>

          {/* Link Builder */}
          {currentToken && <LinkBuilder token={currentToken} initialLinks={initialLinks ?? []} />}

          {/* Quick-stats peek (if any data) */}
          {stats && (stats.visitors > 0 || stats.conversions > 0) && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
              <StatChip label="Clicks" value={stats.visitors} />
              <StatChip label="Leads"  value={stats.leads}    />
              <StatChip label="Members" value={stats.conversions} />
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Stats ── */}
      {activeTab === "stats" && (
        <div
          id="panel-stats"
          role="tabpanel"
          aria-labelledby="tab-stats"
        >
          {stats ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.875rem" }}>
                <StatChip label="Clicks"  value={stats.visitors}    />
                <StatChip label="Leads"   value={stats.leads}       />
                <StatChip label="Members" value={stats.conversions} />
              </div>
              <div
                style={{
                  background: "#F4F4F5",
                  border: "1px solid #E4E4E7",
                  borderRadius: "1rem",
                  padding: "1rem 1.25rem",
                }}
              >
                <p style={{ fontSize: "0.8rem", color: "#71717A", margin: 0, lineHeight: 1.55 }}>
                  Stats reflect all-time activity on your referral link. Updates may take up to 24 hours to appear.
                </p>
              </div>
            </div>
          ) : (
            <div
              style={{
                background: "#FFFFFF",
                border: "1.5px solid #E4E4E7",
                borderRadius: "1.25rem",
                padding: "3rem 2rem",
                textAlign: "center",
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              }}
            >
              <div style={{ fontSize: "2.5rem", marginBottom: "0.875rem" }}>📊</div>
              <p style={{ fontSize: "0.9rem", fontWeight: 600, color: "#09090B", marginBottom: "0.375rem" }}>
                No stats yet
              </p>
              <p style={{ fontSize: "0.85rem", color: "#71717A", lineHeight: 1.55 }}>
                Share your link and check back once you&apos;ve had some clicks.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Share Kit ── */}
      {activeTab === "share" && (
        <div
          id="panel-share"
          role="tabpanel"
          aria-labelledby="tab-share"
          style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
        >
          {/* Email Swipes */}
          <div
            style={{
              background: "#FFFFFF",
              border: "1.5px solid #E4E4E7",
              borderRadius: "1.25rem",
              padding: "1.75rem",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}
          >
            <h2
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "0.95rem",
                fontWeight: 700,
                color: "#09090B",
                marginBottom: "0.25rem",
                letterSpacing: "-0.02em",
              }}
            >
              📧 Email Swipes
            </h2>
            <p style={{ fontSize: "0.8rem", color: "#71717A", marginBottom: "1.25rem", lineHeight: 1.5 }}>
              Your referral link is already embedded — just swap in the recipient&apos;s name and send.
            </p>
            {swipes.map(s => (
              <CopyBlock
                key={s.id}
                id={`copy-${s.id}`}
                label={s.label}
                content={`Subject: ${s.subject}\n\n${s.body}`}
              />
            ))}
          </div>

          {/* SMS Templates */}
          <div
            style={{
              background: "#FFFFFF",
              border: "1.5px solid #E4E4E7",
              borderRadius: "1.25rem",
              padding: "1.75rem",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}
          >
            <h2
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "0.95rem",
                fontWeight: 700,
                color: "#09090B",
                marginBottom: "0.25rem",
                letterSpacing: "-0.02em",
              }}
            >
              💬 Text / SMS
            </h2>
            <p style={{ fontSize: "0.8rem", color: "#71717A", marginBottom: "1.25rem", lineHeight: 1.5 }}>
              Copy, paste into a text to a friend. Personal texts convert the best.
            </p>
            {smsTemplates.map(s => (
              <CopyBlock key={s.id} id={`copy-${s.id}`} label={s.label} content={s.copy} />
            ))}
          </div>

          {/* DM Scripts */}
          <div
            style={{
              background: "#FFFFFF",
              border: "1.5px solid #E4E4E7",
              borderRadius: "1.25rem",
              padding: "1.75rem",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}
          >
            <h2
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "0.95rem",
                fontWeight: 700,
                color: "#09090B",
                marginBottom: "0.25rem",
                letterSpacing: "-0.02em",
              }}
            >
              📩 DM Scripts
            </h2>
            <p style={{ fontSize: "0.8rem", color: "#71717A", marginBottom: "1.25rem", lineHeight: 1.5 }}>
              For Instagram DMs, Facebook Messenger, or any direct message.
            </p>
            {dmScripts.map(s => (
              <CopyBlock key={s.id} id={`copy-${s.id}`} label={s.label} content={s.copy} />
            ))}
          </div>

          {/* Social Captions */}
          <div
            style={{
              background: "#FFFFFF",
              border: "1.5px solid #E4E4E7",
              borderRadius: "1.25rem",
              padding: "1.75rem",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}
          >
            <h2
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "0.95rem",
                fontWeight: 700,
                color: "#09090B",
                marginBottom: "0.25rem",
                letterSpacing: "-0.02em",
              }}
            >
              📱 Social Captions
            </h2>
            <p style={{ fontSize: "0.8rem", color: "#71717A", marginBottom: "1.25rem", lineHeight: 1.5 }}>
              Ready-to-post captions with your link already included.
            </p>
            {socials.map(s => (
              <CopyBlock key={s.id} id={`copy-${s.id}`} label={s.label} content={s.copy} />
            ))}
          </div>

          {/* Talking Points */}
          <div
            style={{
              background: "#FFFFFF",
              border: "1.5px solid #E4E4E7",
              borderRadius: "1.25rem",
              padding: "1.75rem",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}
          >
            <h2
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "0.95rem",
                fontWeight: 700,
                color: "#09090B",
                marginBottom: "1rem",
                letterSpacing: "-0.02em",
              }}
            >
              💬 Key Talking Points
            </h2>
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "0.625rem" }}>
              {TALKING_POINTS.map((p, i) => (
                <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: "0.625rem" }}>
                  <span
                    style={{
                      flexShrink: 0,
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #2EC4B6 0%, #44A8D8 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginTop: "0.1rem",
                    }}
                  >
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  <span style={{ fontSize: "0.875rem", color: "#3F3F46", lineHeight: 1.55 }}>{p}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* ── Tab: Earnings ── */}
      {activeTab === "earnings" && (
        <div
          id="panel-earnings"
          role="tabpanel"
          aria-labelledby="tab-earnings"
          style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
        >
          {/* Summary totals */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.875rem" }}>
            <div
              style={{
                background: "#FFFFFF",
                border: "1.5px solid #E4E4E7",
                borderRadius: "1.25rem",
                padding: "1.5rem",
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              }}
            >
              <p style={{ fontSize: "0.68rem", fontWeight: 700, color: "#71717A", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.5rem" }}>
                Total Paid
              </p>
              <p
                style={{
                  fontSize: "1.875rem",
                  fontWeight: 700,
                  color: "#16A34A",
                  fontFamily: "var(--font-heading)",
                  letterSpacing: "-0.04em",
                  lineHeight: 1,
                }}
              >
                ${(totalPaid / 100).toFixed(2)}
              </p>
            </div>
            <div
              style={{
                background: "#FFFFFF",
                border: "1.5px solid #E4E4E7",
                borderRadius: "1.25rem",
                padding: "1.5rem",
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              }}
            >
              <p style={{ fontSize: "0.68rem", fontWeight: 700, color: "#71717A", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.5rem" }}>
                Pending
              </p>
              <p
                style={{
                  fontSize: "1.875rem",
                  fontWeight: 700,
                  color: "#D97706",
                  fontFamily: "var(--font-heading)",
                  letterSpacing: "-0.04em",
                  lineHeight: 1,
                }}
              >
                ${(totalPending / 100).toFixed(2)}
              </p>
            </div>
          </div>

          {/* PayPal payout setup */}
          <div
            style={{
              background: "#FFFFFF",
              border: "1.5px solid #E4E4E7",
              borderRadius: "1.25rem",
              padding: "1.5rem",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}
          >
            <h2
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "0.9rem",
                fontWeight: 700,
                color: "#09090B",
                marginBottom: "0.25rem",
                letterSpacing: "-0.02em",
              }}
            >
              💳 Payout Settings
            </h2>
            <p style={{ fontSize: "0.8rem", color: "#71717A", marginBottom: "1rem", lineHeight: 1.5 }}>
              Enter your PayPal email to receive monthly commission payouts.
            </p>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <input
                id="paypal-email-input"
                type="email"
                placeholder="your-paypal@email.com"
                value={paypalEmail}
                onChange={e => setPaypalEmail(e.target.value)}
                style={{
                  flex: 1,
                  padding: "0.75rem 1rem",
                  fontSize: "0.875rem",
                  border: "1.5px solid #E4E4E7",
                  borderRadius: "0.875rem",
                  outline: "none",
                  fontFamily: "var(--font-sans)",
                  color: "#09090B",
                  background: "#FAFAFA",
                  transition: "border-color 0.2s",
                }}
                onFocus={e => (e.currentTarget.style.borderColor = "#2EC4B6")}
                onBlur={e => (e.currentTarget.style.borderColor = "#E4E4E7")}
              />
              <button
                id="save-paypal-btn"
                onClick={handleSavePayPal}
                disabled={paypalSaving || !paypalEmail.trim()}
                style={{
                  padding: "0.75rem 1.25rem",
                  fontSize: "0.83rem",
                  fontWeight: 700,
                  color: "#FFFFFF",
                  background: paypalSaved
                    ? "#16A34A"
                    : paypalSaving
                    ? "#A1A1AA"
                    : "linear-gradient(135deg, #2EC4B6 0%, #44A8D8 100%)",
                  border: "none",
                  borderRadius: "0.875rem",
                  cursor: paypalSaving ? "wait" : "pointer",
                  whiteSpace: "nowrap",
                  transition: "all 0.2s",
                }}
              >
                {paypalSaved ? "✓ Saved!" : paypalSaving ? "Saving…" : "Save"}
              </button>
            </div>
            {paypalError && (
              <p style={{ fontSize: "0.8rem", color: "#EF4444", marginTop: "0.5rem" }}>
                {paypalError}
              </p>
            )}
            {paypalSaved && (
              <p style={{ fontSize: "0.8rem", color: "#16A34A", marginTop: "0.5rem" }}>
                PayPal email saved. Commissions will be sent to this address.
              </p>
            )}
          </div>

          {/* Commission history */}
          <div
            style={{
              background: "#FFFFFF",
              border: "1.5px solid #E4E4E7",
              borderRadius: "1.25rem",
              padding: "1.5rem",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}
          >
            <h2
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "0.9rem",
                fontWeight: 700,
                color: "#09090B",
                marginBottom: "0.125rem",
                letterSpacing: "-0.02em",
              }}
            >
              Commission History
            </h2>
            {commissions.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2rem 0" }}>
                <p style={{ fontSize: "0.875rem", color: "#71717A" }}>
                  No commissions yet — share your link to start earning.
                </p>
              </div>
            ) : (
              <div style={{ marginTop: "0.75rem" }}>
                {commissions.map(c => (
                  <CommissionRow key={c.id} c={c} />
                ))}
              </div>
            )}
          </div>

          {/* Tax info note */}
          <div
            style={{
              background: "#F4F4F5",
              border: "1px solid #E4E4E7",
              borderRadius: "1rem",
              padding: "1rem 1.25rem",
            }}
          >
            <p style={{ fontSize: "0.78rem", color: "#71717A", margin: 0, lineHeight: 1.55 }}>
              <strong style={{ color: "#52525B" }}>Tax info:</strong> If your total commissions reach $600 in a calendar year, we&apos;ll reach out to collect a W-9 for 1099 reporting. No action needed until then.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
