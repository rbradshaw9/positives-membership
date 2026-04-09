"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  createAffiliateLinkAction,
  deleteAffiliateLinkAction,
  getReferralLinkAction,
  savePayPalEmailAction,
  saveW9Action,
  updateReferralSlugAction,
} from "@/app/account/affiliate/actions";
import type { W9FormData } from "@/app/account/affiliate/actions";
import type {
  AffiliateCommission,
  AffiliatePayout,
  PromoterStats,
} from "@/lib/firstpromoter/client";
import type { AffiliatePortalViewModel } from "@/lib/affiliate/portal";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { track } from "@/lib/analytics/ga";

interface AffiliateLink {
  id: string;
  code: string;
  label: string;
  destination: string | null;
  clicks: number;
}

interface ExistingW9 {
  legal_name: string;
  business_name: string | null;
  tax_classification: string;
  tax_id: string;
  address: string;
  city: string;
  state_code: string;
  zip: string;
  signature_name: string;
  signed_at: string;
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
  existingW9?: ExistingW9 | null;
  w9Preview?: "off" | "soft" | "hard";
  autoEnroll?: boolean;
  performance: AffiliatePortalViewModel;
}

type Tab = "link" | "performance" | "share" | "earnings";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "link", label: "My Link", icon: "🔗" },
  { id: "performance", label: "Performance", icon: "📈" },
  { id: "share", label: "Share Kit", icon: "✉️" },
  { id: "earnings", label: "Earnings", icon: "💸" },
];

const TAX_CLASSIFICATIONS = [
  { value: "individual", label: "Individual / Sole proprietor" },
  { value: "s_corp", label: "S Corporation" },
  { value: "c_corp", label: "C Corporation" },
  { value: "partnership", label: "Partnership" },
  { value: "llc_single", label: "LLC — Single member" },
  { value: "llc_multi", label: "LLC — Multi member" },
  { value: "other", label: "Other" },
];

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC",
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

function W9Form({
  existingW9,
  onSaved,
}: {
  existingW9: ExistingW9 | null;
  onSaved: () => void;
}) {
  const isEdit = Boolean(existingW9);
  const [open, setOpen] = useState(!isEdit);
  const [form, setForm] = useState<W9FormData>({
    legal_name: existingW9?.legal_name ?? "",
    business_name: existingW9?.business_name ?? "",
    tax_classification: existingW9?.tax_classification ?? "individual",
    tax_id: existingW9?.tax_id ?? "",
    address: existingW9?.address ?? "",
    city: existingW9?.city ?? "",
    state_code: existingW9?.state_code ?? "",
    zip: existingW9?.zip ?? "",
    signature_name: existingW9?.signature_name ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setField = (field: keyof W9FormData, value: string) =>
    setForm((current) => ({ ...current, [field]: value }));

  const inputStyle: CSSProperties = {
    width: "100%",
    padding: "0.75rem 1rem",
    fontSize: "0.875rem",
    border: "1.5px solid #E4E4E7",
    borderRadius: "0.75rem",
    outline: "none",
    fontFamily: "var(--font-sans)",
    color: "#09090B",
    background: "#FAFAFA",
    boxSizing: "border-box",
  };

  const labelStyle: CSSProperties = {
    fontSize: "0.72rem",
    fontWeight: 700,
    color: "#71717A",
    textTransform: "uppercase",
    letterSpacing: "0.07em",
    display: "block",
    marginBottom: "0.375rem",
  };

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    const result = await saveW9Action(form);
    setSaving(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setSaved(true);
    setOpen(false);
    onSaved();
  }

  if (saved || (isEdit && !open)) {
    const signedDate = existingW9?.signed_at
      ? new Date(existingW9.signed_at).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : null;

    return (
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "0.875rem",
          background: "rgba(22,163,74,0.06)",
          border: "1px solid rgba(22,163,74,0.18)",
          borderRadius: "1rem",
          padding: "1rem 1.25rem",
        }}
      >
        <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>✅</span>
        <div style={{ flex: 1 }}>
          <p style={{ margin: "0 0 0.2rem", fontSize: "0.88rem", fontWeight: 700, color: "#15803D" }}>
            W-9 on file
          </p>
          <p style={{ margin: 0, fontSize: "0.8rem", color: "#4B5563", lineHeight: 1.55 }}>
            {existingW9?.legal_name ?? form.legal_name}
            {signedDate ? ` · Signed ${signedDate}` : ""}
          </p>
        </div>
        <button
          onClick={() => setOpen(true)}
          style={{ border: "none", background: "transparent", color: "#44A8D8", fontWeight: 700, cursor: "pointer" }}
        >
          Update
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "#09090B" }}>W-9 Tax Form</h3>
          <p style={{ margin: "0.25rem 0 0", fontSize: "0.8rem", color: "#71717A", lineHeight: 1.55 }}>
            Required for US persons earning $600+ in commissions annually.
          </p>
        </div>
        {isEdit ? (
          <button onClick={() => setOpen(false)} style={{ border: "none", background: "transparent", color: "#A1A1AA", cursor: "pointer" }}>
            Cancel
          </button>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label style={labelStyle}>Legal name *</label>
          <input style={inputStyle} value={form.legal_name} onChange={(event) => setField("legal_name", event.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Business name</label>
          <input style={inputStyle} value={form.business_name} onChange={(event) => setField("business_name", event.target.value)} />
        </div>
      </div>

      <div>
        <label style={labelStyle}>Tax classification *</label>
        <select
          style={inputStyle}
          value={form.tax_classification}
          onChange={(event) => setField("tax_classification", event.target.value)}
        >
          {TAX_CLASSIFICATIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label style={labelStyle}>SSN or EIN *</label>
        <input style={inputStyle} value={form.tax_id} onChange={(event) => setField("tax_id", event.target.value)} />
        <p style={{ margin: "0.35rem 0 0", fontSize: "0.72rem", color: "#A1A1AA" }}>
          Stored securely and used only for 1099 reporting if you reach the $600 threshold.
        </p>
      </div>

      <div>
        <label style={labelStyle}>Street address *</label>
        <input style={inputStyle} value={form.address} onChange={(event) => setField("address", event.target.value)} />
      </div>

      <div className="grid gap-3 md:grid-cols-[2fr_1fr_1fr]">
        <div>
          <label style={labelStyle}>City *</label>
          <input style={inputStyle} value={form.city} onChange={(event) => setField("city", event.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>State *</label>
          <select style={inputStyle} value={form.state_code} onChange={(event) => setField("state_code", event.target.value)}>
            <option value="">—</option>
            {US_STATES.map((stateCode) => (
              <option key={stateCode} value={stateCode}>
                {stateCode}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>ZIP *</label>
          <input style={inputStyle} value={form.zip} onChange={(event) => setField("zip", event.target.value)} />
        </div>
      </div>

      <div style={{ background: "#F8F8F8", border: "1px solid #E4E4E7", borderRadius: "0.875rem", padding: "1rem 1.125rem" }}>
        <label style={{ ...labelStyle, color: "#52525B" }}>Electronic signature *</label>
        <p style={{ margin: "0 0 0.75rem", fontSize: "0.78rem", color: "#71717A", lineHeight: 1.55 }}>
          By typing your name below, you certify under penalty of perjury that the information provided is correct and complete.
        </p>
        <input
          style={{ ...inputStyle, fontStyle: "italic", fontSize: "1rem" }}
          value={form.signature_name}
          onChange={(event) => setField("signature_name", event.target.value)}
          placeholder="Your legal name"
        />
      </div>

      {error ? <p style={{ margin: 0, fontSize: "0.8rem", color: "#DC2626" }}>{error}</p> : null}

      <button
        onClick={handleSubmit}
        disabled={saving || !form.legal_name.trim() || !form.tax_id.trim() || !form.signature_name.trim()}
        style={{
          alignSelf: "flex-start",
          border: "none",
          borderRadius: "9999px",
          padding: "0.8rem 1.5rem",
          background: saving || !form.legal_name.trim() || !form.tax_id.trim() || !form.signature_name.trim()
            ? "#A1A1AA"
            : "linear-gradient(135deg, #2EC4B6 0%, #44A8D8 100%)",
          color: "#FFFFFF",
          fontWeight: 700,
          cursor: saving ? "wait" : "pointer",
        }}
      >
        {saving ? "Submitting…" : isEdit ? "Update W-9" : "Submit W-9"}
      </button>
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
            "You can create simple source-tagged links for blogs, email, or bio links",
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
  onSkip,
  saving,
  error,
}: {
  paypalEmail: string;
  onPaypalChange: (value: string) => void;
  onSave: () => void;
  onSkip: () => void;
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
          Your link is ready. Where should we send commissions?
        </h1>
        <p style={{ margin: "0.8rem auto 0", maxWidth: 440, fontSize: "0.9rem", color: "#52525B", lineHeight: 1.65 }}>
          Add your PayPal email now so payout coordination stays smooth. You can always update it later in earnings settings.
        </p>

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
          {saving ? "Saving…" : "Save & view portal"}
        </button>

        <button
          id="payout-skip-btn"
          onClick={onSkip}
          style={{ marginTop: "0.85rem", border: "none", background: "transparent", color: "#A1A1AA", cursor: "pointer" }}
        >
          Skip for now
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
  links: AffiliateLink[];
  onLinksChange: (links: AffiliateLink[]) => void;
}) {
  const [label, setLabel] = useState("");
  const [destination, setDestination] = useState("");
  const [subId, setSubId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  const handleCreate = useCallback(async () => {
    const result = await createAffiliateLinkAction({
      label: label.trim(),
      destination: destination.trim() || null,
      subId: subId.trim() || null,
    });

    setSaving(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }

    const nextLinks = [result.link, ...links];
    onLinksChange(nextLinks);
    track("affiliate_custom_link_created", {
      source_path: "/account/affiliate",
      has_destination: Boolean(destination.trim()),
      has_sub_id: Boolean(subId.trim()),
    });
    setLabel("");
    setDestination("");
    setSubId("");
    setError(null);
  }, [destination, label, links, onLinksChange, subId]);

  const handleDelete = useCallback(async (id: string) => {
    const result = await deleteAffiliateLinkAction(id);
    if ("error" in result) return;
    onLinksChange(links.filter((link) => link.id !== id));
  }, [links, onLinksChange]);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-[1.3fr_0.9fr]">
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
            Keep this as your simplest all-purpose link. Use custom campaign links below when you want to track a specific source.
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
            Campaign links
          </p>
          <h2 style={{ margin: "0.65rem 0 0.25rem", fontSize: "1.1rem", fontWeight: 700, color: "#09090B", letterSpacing: "-0.03em", textWrap: "balance" }}>
            Create a source-tagged link
          </h2>
          <p style={{ margin: 0, fontSize: "0.84rem", lineHeight: 1.6, color: "#71717A" }}>
            Use these for things like your blog, newsletter, bio link, or a specific post. They stay simple for the person clicking, but give you better source visibility.
          </p>

          <div className="mt-4 flex flex-col gap-3">
            <input
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Link name, like Blog CTA or April newsletter"
              style={{ padding: "0.8rem 0.95rem", borderRadius: "0.8rem", border: "1.5px solid #E4E4E7", fontSize: "0.88rem" }}
            />
            <input
              value={destination}
              onChange={(event) => setDestination(event.target.value)}
              placeholder="Destination URL, or leave blank for the homepage"
              style={{ padding: "0.8rem 0.95rem", borderRadius: "0.8rem", border: "1.5px solid #E4E4E7", fontSize: "0.88rem" }}
            />
            <input
              value={subId}
              onChange={(event) => setSubId(event.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
              placeholder="Optional source tag, like blog or april-email"
              style={{ padding: "0.8rem 0.95rem", borderRadius: "0.8rem", border: "1.5px solid #E4E4E7", fontSize: "0.88rem" }}
            />
            <p style={{ margin: 0, fontSize: "0.75rem", color: "#A1A1AA", lineHeight: 1.55 }}>
              Source tags are for your internal tracking. Use simple labels like <code>blog</code>, <code>email</code>, or <code>ig-bio</code>.
            </p>
            {error ? <p style={{ margin: 0, fontSize: "0.8rem", color: "#DC2626" }}>{error}</p> : null}
            <button
              onClick={async () => {
                if (!label.trim()) {
                  setError("Please enter a name for this link.");
                  return;
                }
                setSaving(true);
                await handleCreate();
              }}
              disabled={saving || !label.trim()}
              style={{
                alignSelf: "flex-start",
                border: "none",
                borderRadius: "9999px",
                padding: "0.75rem 1.25rem",
                background: saving || !label.trim() ? "#A1A1AA" : "linear-gradient(135deg, #2EC4B6 0%, #44A8D8 100%)",
                color: "#FFFFFF",
                fontWeight: 700,
                cursor: saving ? "wait" : "pointer",
              }}
            >
              {saving ? "Creating…" : "Create campaign link"}
            </button>
          </div>
        </SurfaceCard>
      </div>

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
              Existing short links
            </p>
            <h2 style={{ margin: "0.6rem 0 0.2rem", fontSize: "1.1rem", fontWeight: 700, color: "#09090B", letterSpacing: "-0.03em" }}>
              Your managed share links
            </h2>
            <p style={{ margin: 0, fontSize: "0.84rem", lineHeight: 1.6, color: "#71717A" }}>
              These are still fully supported. Use them when you want a cleaner share URL like <code>positives.life/go/your-code</code>.
            </p>
          </div>
        </div>

        {links.length === 0 ? (
          <p style={{ margin: "1rem 0 0", fontSize: "0.84rem", color: "#A1A1AA" }}>
            No custom campaign links yet. Start with one for your blog, newsletter, or bio link.
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
                    <span style={{ fontSize: "0.76rem", color: "#71717A" }}>{link.clicks} clicks</span>
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
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard label="Visitors" value={performance.visitors.toLocaleString()} />
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
              </div>
            </div>

            {performance.topSources.length > 0 ? (
              <div className="mt-4 flex flex-col gap-3">
                {performance.topSources.map((source) => (
                  <div key={source.id} style={{ border: "1px solid #E4E4E7", borderRadius: "0.95rem", padding: "0.95rem 1rem" }}>
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p style={{ margin: 0, fontSize: "0.9rem", fontWeight: 700, color: "#09090B" }}>{source.label}</p>
                        <p style={{ margin: "0.15rem 0 0", fontSize: "0.78rem", color: "#71717A" }}>{source.detail}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-right sm:grid-cols-4">
                        <div>
                          <p style={{ margin: 0, fontSize: "0.68rem", color: "#A1A1AA", textTransform: "uppercase" }}>Clicks</p>
                          <p style={{ margin: "0.15rem 0 0", fontSize: "0.9rem", fontWeight: 700, color: "#09090B" }}>{source.clicks}</p>
                        </div>
                        <div>
                          <p style={{ margin: 0, fontSize: "0.68rem", color: "#A1A1AA", textTransform: "uppercase" }}>Leads</p>
                          <p style={{ margin: "0.15rem 0 0", fontSize: "0.9rem", fontWeight: 700, color: "#09090B" }}>{source.leads}</p>
                        </div>
                        <div>
                          <p style={{ margin: 0, fontSize: "0.68rem", color: "#A1A1AA", textTransform: "uppercase" }}>Members</p>
                          <p style={{ margin: "0.15rem 0 0", fontSize: "0.9rem", fontWeight: 700, color: "#09090B" }}>{source.members}</p>
                        </div>
                        <div>
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
            Start with one warm share, one source-tagged link for your blog or email, and one follow-up message. That is enough to get meaningful signal without overcomplicating it.
          </p>
        </SurfaceCard>
      )}
    </div>
  );
}

function ShareTab({
  referralLink,
  links,
}: {
  referralLink: string;
  links: AffiliateLink[];
}) {
  const shareOptions = useMemo(() => {
    const options = [
      {
        id: "primary",
        label: "Primary referral link",
        detail: "Best for general sharing",
        url: referralLink,
      },
      ...links.map((link) => ({
        id: link.id,
        label: link.label,
        detail: buildManagedDestination({
          destination: link.destination,
          subId: extractSubId(link.destination),
        }),
        url: shortUrl(link.code),
      })),
    ];
    return options;
  }, [links, referralLink]);

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
          Use your primary link for general sharing, or select one of your source-tagged campaign links before copying any templates below.
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
  existingW9,
  w9Filed,
  onW9Saved,
  w9Preview,
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
  existingW9: ExistingW9 | null;
  w9Filed: boolean;
  onW9Saved: () => void;
  w9Preview: "off" | "soft" | "hard";
}) {
  const totalEarned = w9Preview === "hard" ? 65000 : w9Preview === "soft" ? 55000 : performance.totalEarned;
  const needsW9 = !w9Filed && totalEarned >= 60000;
  const shouldWarnW9 = !w9Filed && totalEarned >= 50000 && totalEarned < 60000;

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
              { label: "W-9 is on file if required", complete: performance.totalEarned < 60000 || w9Filed },
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
            This is the email Positives should use when coordinating your affiliate payouts.
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

      {w9Preview !== "off" ? (
        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem", background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)", borderRadius: "9999px", padding: "0.25rem 0.75rem", fontSize: "0.72rem", fontWeight: 700, color: "#6366F1" }}>
          DEV PREVIEW — {w9Preview === "hard" ? "$650 earned" : "$550 earned"}
        </div>
      ) : null}

      <SurfaceCard elevated className="surface-card--editorial">
        {needsW9 ? (
          <div style={{ marginBottom: "1rem", background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "0.875rem", padding: "0.875rem 1rem" }}>
            <p style={{ margin: 0, fontSize: "0.83rem", color: "#B91C1C", lineHeight: 1.55 }}>
              Action required: you&apos;ve earned {formatMoney(totalEarned)} in commissions. We need a W-9 before issuing further payouts.
            </p>
          </div>
        ) : shouldWarnW9 ? (
          <div style={{ marginBottom: "1rem", background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: "0.875rem", padding: "0.875rem 1rem" }}>
            <p style={{ margin: 0, fontSize: "0.83rem", color: "#92400E", lineHeight: 1.55 }}>
              Heads up: you&apos;ve earned {formatMoney(totalEarned)} so far. Once you hit $600, we&apos;ll need a W-9 for 1099 reporting.
            </p>
          </div>
        ) : null}

        <W9Form existingW9={w9Filed ? existingW9 : null} onSaved={onW9Saved} />
      </SurfaceCard>

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
  existingW9 = null,
  w9Preview = "off",
  autoEnroll = false,
  performance,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("link");
  const [loading, setLoading] = useState(false);
  const [enrolled, setEnrolled] = useState(isAffiliate);
  const [payoutStep, setPayoutStep] = useState(false);
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
  const [w9Filed, setW9Filed] = useState(Boolean(existingW9));
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
    if (!paypalEmail.trim()) {
      setPayoutStep(true);
    }
  }, [paypalEmail]);

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

  if (enrolled && payoutStep) {
    return (
      <PayoutSetupStep
        paypalEmail={paypalEmail}
        onPaypalChange={setPaypalEmail}
        onSave={async () => {
          await handleSavePayPal();
          setPayoutStep(false);
        }}
        onSkip={() => setPayoutStep(false)}
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
            Keep your core link simple, create a few source-tagged links when you need them, and watch which sharing efforts are actually moving.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  border: active ? "1px solid rgba(46,196,182,0.2)" : "1px solid #E4E4E7",
                  borderRadius: "9999px",
                  padding: "0.65rem 0.95rem",
                  background: active ? "rgba(46,196,182,0.08)" : "#FFFFFF",
                  color: active ? "#0F766E" : "#52525B",
                  fontWeight: 700,
                  cursor: "pointer",
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
          links={managedLinks}
          onLinksChange={setManagedLinks}
        />
      ) : null}

      {activeTab === "performance" ? <PerformanceTab performance={performance} /> : null}
      {activeTab === "share" ? <ShareTab referralLink={referralLink} links={managedLinks} /> : null}
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
          existingW9={existingW9}
          w9Filed={w9Filed}
          onW9Saved={() => setW9Filed(true)}
          w9Preview={w9Preview}
        />
      ) : null}
    </div>
  );
}
