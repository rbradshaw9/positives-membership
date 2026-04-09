"use client";

/**
 * components/affiliate/AffiliatePortal.tsx
 *
 * Full affiliate portal for Positives members.
 *
 * Pre-enrollment: single card CTA to provision an affiliate account.
 * Post-enrollment: 4-tab experience — My Link | Stats | Share Kit | Earnings
 *
 * Design tokens: brand teal (#2EC4B6), sky blue (#44A8D8), amber (#F59E0B),
 * Montserrat headings, Poppins body, generous radii, shadow-medium cards.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { getReferralLinkAction, savePayPalEmailAction, createAffiliateLinkAction, deleteAffiliateLinkAction, updateAffiliateLinkAction, updateReferralSlugAction, saveW9Action } from "@/app/account/affiliate/actions";
import type {
  AffiliateCommission,
  AffiliatePayout,
  PromoterStats,
} from "@/lib/firstpromoter/client";
import type { W9FormData } from "@/app/account/affiliate/actions";
import { track } from "@/lib/analytics/ga";

// ─── Types ────────────────────────────────────────────────────────────────────

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
  /** Dev-only: override the W9 threshold display without real commission data. */
  w9Preview?: "off" | "soft" | "hard";
  autoEnroll?: boolean;
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
  "Payouts are coordinated monthly using the payment details on your account",
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

function CommissionRow({ c }: { c: AffiliateCommission }) {
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

function PayoutRow({ p }: { p: AffiliatePayout }) {
  const amount = `$${(p.amount / 100).toFixed(2)}`;
  const date = new Date(p.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const stateStyles: Record<string, { color: string; bg: string; label: string }> = {
    paid:       { color: "#16A34A", bg: "rgba(22,163,74,0.1)",   label: "Paid" },
    processing: { color: "#44A8D8", bg: "rgba(68,168,216,0.1)", label: "Processing" },
    due:        { color: "#D97706", bg: "rgba(217,119,6,0.1)",  label: "Due" },
    pending:    { color: "#71717A", bg: "rgba(113,113,122,0.1)", label: "Pending" },
  };
  const st = stateStyles[p.state] ?? stateStyles.pending;

  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.875rem 0", borderBottom: "1px solid #F4F4F5" }}>
      <div>
        <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#09090B" }}>{amount}</div>
        <div style={{ fontSize: "0.75rem", color: "#71717A", marginTop: "0.125rem" }}>{date}</div>
      </div>
      <span style={{ fontSize: "0.72rem", fontWeight: 700, color: st.color, background: st.bg, borderRadius: "9999px", padding: "0.25rem 0.75rem", letterSpacing: "0.02em" }}>
        {st.label}
      </span>
    </div>
  );
}

// ─── W9 Form ──────────────────────────────────────────────────────────────────

const TAX_CLASSIFICATIONS = [
  { value: "individual",   label: "Individual / Sole proprietor" },
  { value: "s_corp",       label: "S Corporation" },
  { value: "c_corp",       label: "C Corporation" },
  { value: "partnership",  label: "Partnership" },
  { value: "llc_single",   label: "LLC — Single member" },
  { value: "llc_multi",    label: "LLC — Multi member" },
  { value: "other",        label: "Other" },
];

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC",
];

function W9Form({
  existingW9,
  onSaved,
}: {
  existingW9: ExistingW9 | null;
  onSaved: () => void;
}) {
  const isEdit = Boolean(existingW9);
  const [open, setOpen] = useState(!isEdit);

  const blank: W9FormData = {
    legal_name: existingW9?.legal_name ?? "",
    business_name: existingW9?.business_name ?? "",
    tax_classification: existingW9?.tax_classification ?? "individual",
    tax_id: existingW9?.tax_id ?? "",
    address: existingW9?.address ?? "",
    city: existingW9?.city ?? "",
    state_code: existingW9?.state_code ?? "",
    zip: existingW9?.zip ?? "",
    signature_name: existingW9?.signature_name ?? "",
  };

  const [form, setForm] = useState<W9FormData>(blank);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (field: keyof W9FormData, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const inputStyle: React.CSSProperties = {
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
    transition: "border-color 0.18s",
  };

  const labelStyle: React.CSSProperties = {
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
      ? new Date(existingW9.signed_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
      : null;
    return (
      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.875rem", background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.2)", borderRadius: "1rem", padding: "1rem 1.25rem" }}>
        <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>✅</span>
        <div style={{ flex: 1 }}>
          <p style={{ margin: "0 0 0.25rem", fontSize: "0.875rem", fontWeight: 700, color: "#15803D" }}>W-9 on file</p>
          <p style={{ margin: 0, fontSize: "0.78rem", color: "#4B5563", lineHeight: 1.55 }}>
            {existingW9?.legal_name ?? form.legal_name}{signedDate ? ` · Signed ${signedDate}` : ""}
          </p>
        </div>
        <button
          onClick={() => setOpen(true)}
          style={{ fontSize: "0.75rem", color: "#44A8D8", background: "none", border: "none", cursor: "pointer", padding: "0.25rem", flexShrink: 0, fontWeight: 600 }}
        >
          Update
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "0.9rem", fontWeight: 700, color: "#09090B", letterSpacing: "-0.02em" }}>
            📋 W-9 Tax Form
          </h3>
          <p style={{ margin: "0.25rem 0 0", fontSize: "0.78rem", color: "#71717A", lineHeight: 1.5 }}>
            Required for US persons earning $600+ in commissions annually. Treated as an electronic W-9.
          </p>
        </div>
        {isEdit && (
          <button onClick={() => setOpen(false)} style={{ fontSize: "0.75rem", color: "#A1A1AA", background: "none", border: "none", cursor: "pointer", padding: "0.25rem", flexShrink: 0 }}>Cancel</button>
        )}
      </div>

      {/* Name row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        <div>
          <label style={labelStyle}>Legal name *</label>
          <input style={inputStyle} value={form.legal_name} onChange={e => set("legal_name", e.target.value)} placeholder="As shown on your tax return" />
        </div>
        <div>
          <label style={labelStyle}>Business name (optional)</label>
          <input style={inputStyle} value={form.business_name} onChange={e => set("business_name", e.target.value)} placeholder="DBA, LLC name, etc." />
        </div>
      </div>

      {/* Tax classification */}
      <div>
        <label style={labelStyle}>Tax classification *</label>
        <select
          style={{ ...inputStyle, appearance: "none", backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2371717A' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 1rem center" }}
          value={form.tax_classification}
          onChange={e => set("tax_classification", e.target.value)}
        >
          {TAX_CLASSIFICATIONS.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      {/* Tax ID */}
      <div>
        <label style={labelStyle}>SSN or EIN *</label>
        <input
          style={inputStyle}
          value={form.tax_id}
          onChange={e => set("tax_id", e.target.value)}
          placeholder={form.tax_classification === "individual" || form.tax_classification === "llc_single" ? "XXX-XX-XXXX" : "XX-XXXXXXX"}
          maxLength={11}
        />
        <p style={{ margin: "0.375rem 0 0", fontSize: "0.72rem", color: "#A1A1AA" }}>Stored securely and used only for 1099 reporting if you reach the $600 threshold.</p>
      </div>

      {/* Address */}
      <div>
        <label style={labelStyle}>Street address *</label>
        <input style={inputStyle} value={form.address} onChange={e => set("address", e.target.value)} placeholder="123 Main St, Apt 4B" />
      </div>

      {/* City / State / ZIP */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "0.75rem" }}>
        <div>
          <label style={labelStyle}>City *</label>
          <input style={inputStyle} value={form.city} onChange={e => set("city", e.target.value)} placeholder="City" />
        </div>
        <div>
          <label style={labelStyle}>State *</label>
          <select
            style={{ ...inputStyle, appearance: "none", backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2371717A' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 0.75rem center" }}
            value={form.state_code}
            onChange={e => set("state_code", e.target.value)}
          >
            <option value="">—</option>
            {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>ZIP *</label>
          <input style={inputStyle} value={form.zip} onChange={e => set("zip", e.target.value)} placeholder="10001" maxLength={10} />
        </div>
      </div>

      {/* Signature */}
      <div style={{ background: "#F8F8F8", border: "1px solid #E4E4E7", borderRadius: "0.875rem", padding: "1rem 1.125rem" }}>
        <label style={{ ...labelStyle, color: "#52525B" }}>Electronic signature *</label>
        <p style={{ margin: "0 0 0.75rem", fontSize: "0.78rem", color: "#71717A", lineHeight: 1.55 }}>
          By typing your name below, you certify under penalty of perjury that the information provided is correct and complete.
        </p>
        <input
          style={{ ...inputStyle, fontStyle: "italic", fontSize: "1rem" }}
          value={form.signature_name}
          onChange={e => set("signature_name", e.target.value)}
          placeholder="Your legal name"
        />
      </div>

      {error && <p style={{ fontSize: "0.8rem", color: "#EF4444", margin: 0 }}>{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={saving || !form.legal_name.trim() || !form.tax_id.trim() || !form.signature_name.trim()}
        style={{
          alignSelf: "flex-start",
          padding: "0.75rem 1.5rem",
          fontSize: "0.875rem",
          fontWeight: 700,
          color: "#FFFFFF",
          background: saving || !form.legal_name.trim() || !form.tax_id.trim() || !form.signature_name.trim()
            ? "#A1A1AA"
            : "linear-gradient(135deg, #2EC4B6 0%, #44A8D8 100%)",
          border: "none",
          borderRadius: "9999px",
          cursor: saving ? "wait" : "pointer",
          transition: "all 0.2s",
        }}
      >
        {saving ? "Submitting…" : isEdit ? "Update W-9" : "Submit W-9"}
      </button>
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
  // Edit state: maps link id → draft destination string (falsy = not editing)
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [editDraft, setEditDraft]     = useState("");
  const [editSaving, setEditSaving]   = useState(false);
  const [editError, setEditError]     = useState<string | null>(null);

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

  const startEdit = (link: AffiliateLink) => {
    setEditingId(link.id);
    setEditDraft(link.destination ?? "");
    setEditError(null);
  };

  const cancelEdit = () => { setEditingId(null); setEditError(null); };

  const handleSaveEdit = async (id: string) => {
    setEditSaving(true);
    setEditError(null);
    const result = await updateAffiliateLinkAction(id, editDraft.trim() || null);
    setEditSaving(false);
    if ("error" in result) {
      setEditError(result.error);
    } else {
      setLinks(prev => prev.map(l => l.id === id ? { ...l, destination: editDraft.trim() || null } : l));
      setEditingId(null);
    }
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

  void token;

  return (
    <div style={{ background: "#FFFFFF", border: "1.5px solid #E4E4E7", borderRadius: "1.25rem", padding: "1.75rem", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
      <p style={{ fontSize: "0.68rem", fontWeight: 700, color: "#71717A", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.75rem" }}>
        🔗 Link Builder
      </p>
      <p style={{ fontSize: "0.83rem", color: "#52525B", marginBottom: "1.25rem", lineHeight: 1.5 }}>
        Create short tracked links to any page — your blog, Instagram bio, emails, or any Positives page.
        Anyone who clicks gets your referral cookie set automatically.
      </p>

      {/* Create form */}
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

      {/* Existing links */}
      {links.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {links.map(link => (
            <div key={link.id} style={{ background: "#F8FBFC", border: "1px solid rgba(46,196,182,0.15)", borderRadius: "0.875rem", padding: "0.75rem 1rem" }}>
              {/* Top row: label + short URL + actions */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "#09090B", margin: "0 0 0.1rem" }}>{link.label}</p>
                  <p style={{ fontSize: "0.73rem", color: "#2EC4B6", margin: 0, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{shortUrl(link.code)}</p>
                </div>
                <span style={{ fontSize: "0.7rem", color: "#71717A", flexShrink: 0 }}>{link.clicks} clicks</span>
                <button onClick={() => handleCopy(link.code)} style={{ flexShrink: 0, fontSize: "0.75rem", fontWeight: 700, color: copiedId === link.code ? "#2EC4B6" : "#44A8D8", background: "transparent", border: "none", cursor: "pointer", padding: "0.25rem 0.5rem" }}>
                  {copiedId === link.code ? "Copied!" : "Copy"}
                </button>
                {editingId !== link.id && (
                  <button onClick={() => startEdit(link)} style={{ flexShrink: 0, fontSize: "0.7rem", color: "#71717A", background: "transparent", border: "none", cursor: "pointer", padding: "0.25rem" }} aria-label="Edit destination">✏️</button>
                )}
                <button onClick={() => handleDelete(link.id)} style={{ flexShrink: 0, fontSize: "0.75rem", color: "#A1A1AA", background: "transparent", border: "none", cursor: "pointer", padding: "0.25rem" }} aria-label="Delete link">✕</button>
              </div>

              {/* Inline edit row */}
              {editingId === link.id && (
                <div style={{ marginTop: "0.625rem", display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                  <input
                    style={{ ...inputStyle, fontSize: "0.8rem", padding: "0.5rem 0.75rem" }}
                    placeholder="New destination URL"
                    value={editDraft}
                    onChange={e => setEditDraft(e.target.value)}
                    autoFocus
                  />
                  {editError && <p style={{ fontSize: "0.75rem", color: "#DC2626", margin: 0 }}>{editError}</p>}
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      onClick={() => handleSaveEdit(link.id)}
                      disabled={editSaving}
                      style={{ fontSize: "0.75rem", fontWeight: 700, color: "#FFFFFF", background: editSaving ? "#A1A1AA" : "linear-gradient(135deg, #2EC4B6 0%, #44A8D8 100%)", border: "none", borderRadius: "9999px", padding: "0.375rem 0.875rem", cursor: editSaving ? "not-allowed" : "pointer" }}
                    >
                      {editSaving ? "Saving…" : "Save"}
                    </button>
                    <button onClick={cancelEdit} style={{ fontSize: "0.75rem", color: "#71717A", background: "transparent", border: "none", cursor: "pointer", padding: "0.375rem 0.5rem" }}>Cancel</button>
                  </div>
                </div>
              )}
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
            ["💰", "20% recurring — paid monthly to your PayPal email"],
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

// ─── Payout setup step (shown after enrollment if no PayPal email) ────────────

function PayoutSetupStep({
  paypalEmail,
  onPaypalChange,
  onSave,
  onSkip,
  saving,
  error,
}: {
  paypalEmail: string;
  onPaypalChange: (v: string) => void;
  onSave: () => void;
  onSkip: () => void;
  saving: boolean;
  error: string | null;
}) {
  return (
    <div style={{ maxWidth: 480, margin: "3rem auto", padding: "0 1rem" }}>
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
        <div aria-hidden="true" style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: "linear-gradient(90deg, #2EC4B6 0%, #44A8D8 100%)" }} />

        <div style={{ width: 60, height: 60, borderRadius: "1.125rem", background: "linear-gradient(135deg, rgba(46,196,182,0.12) 0%, rgba(68,168,216,0.08) 100%)", border: "1px solid rgba(46,196,182,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0.75rem auto 1.75rem", fontSize: "1.75rem", lineHeight: 1 }}>
          💳
        </div>

        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.3rem", fontWeight: 700, color: "#09090B", letterSpacing: "-0.03em", lineHeight: 1.2, marginBottom: "0.625rem", textWrap: "balance" }}>
          Your link is ready — where should we send your commissions?
        </h1>

        <p style={{ fontSize: "0.875rem", color: "#52525B", lineHeight: 1.65, marginBottom: "1.75rem" }}>
          You earn 20% recurring. Enter your PayPal email so we know where to send it.
        </p>

        <div style={{ textAlign: "left", marginBottom: "1rem" }}>
          <input
            id="payout-paypal-input"
            type="email"
            placeholder="your-paypal@email.com"
            value={paypalEmail}
            onChange={e => onPaypalChange(e.target.value)}
            style={{ width: "100%", padding: "0.875rem 1rem", fontSize: "0.9rem", border: "1.5px solid #E4E4E7", borderRadius: "0.875rem", outline: "none", fontFamily: "var(--font-sans)", color: "#09090B", background: "#FAFAFA", boxSizing: "border-box", transition: "border-color 0.2s" }}
            onFocus={e => (e.currentTarget.style.borderColor = "#2EC4B6")}
            onBlur={e => (e.currentTarget.style.borderColor = "#E4E4E7")}
            autoFocus
          />
          {error && <p style={{ fontSize: "0.8rem", color: "#EF4444", marginTop: "0.5rem" }}>{error}</p>}
        </div>

        <button
          id="payout-save-btn"
          onClick={onSave}
          disabled={saving || !paypalEmail.trim()}
          style={{ width: "100%", padding: "0.875rem", fontSize: "0.9rem", fontWeight: 700, color: "#FFFFFF", background: saving || !paypalEmail.trim() ? "#A1A1AA" : "linear-gradient(135deg, #2EC4B6 0%, #44A8D8 100%)", border: "none", borderRadius: "9999px", cursor: saving || !paypalEmail.trim() ? "not-allowed" : "pointer", marginBottom: "0.875rem", transition: "all 0.2s" }}
        >
          {saving ? "Saving…" : "Save & view my link →"}
        </button>

        <button
          id="payout-skip-btn"
          onClick={onSkip}
          style={{ background: "none", border: "none", fontSize: "0.83rem", color: "#A1A1AA", cursor: "pointer", padding: "0.25rem", display: "block", margin: "0 auto 1rem" }}
        >
          Skip for now →
        </button>

        <p style={{ fontSize: "0.75rem", color: "#A1A1AA", margin: 0 }}>
          Don&apos;t have PayPal?{" "}
          <a href="https://www.paypal.com/us/webapps/mpp/account-selection" target="_blank" rel="noopener noreferrer" style={{ color: "#44A8D8", textDecoration: "none" }}>
            Create a free account →
          </a>
        </p>
      </div>
    </div>
  );
}

// ─── Main portal ──────────────────────────────────────────────────────────────

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
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("link");
  const [loading, setLoading]     = useState(false);
  const [enrolled, setEnrolled]   = useState(isAffiliate);
  const [payoutStep, setPayoutStep] = useState(false);
  const [currentToken, setCurrentToken] = useState(token);
  const [copiedLink, setCopiedLink]     = useState(false);
  const [error, setError]               = useState<string | null>(null);

  // PayPal payout state
  const [paypalEmail, setPaypalEmail]       = useState(initialPaypalEmail);
  const [paypalSaving, setPaypalSaving]     = useState(false);
  const [paypalSaved, setPaypalSaved]       = useState(false);
  const [paypalError, setPaypalError]       = useState<string | null>(null);

  // Slug customizer state
  const [slugEditing, setSlugEditing]   = useState(false);
  const [slugDraft, setSlugDraft]       = useState(currentToken ?? "");
  const [slugSaving, setSlugSaving]     = useState(false);
  const [slugError, setSlugError]       = useState<string | null>(null);
  const [slugSaved, setSlugSaved]       = useState(false);

  // W9 filed state
  const [w9Filed, setW9Filed] = useState(Boolean(existingW9));
  const autoEnrollStartedRef = useRef(false);

  void affiliateId;
  void affiliateLinkId;
  void memberName;

  const referralLink = currentToken
    ? `https://positives.life?fpr=${currentToken}`
    : null;

  useEffect(() => {
    track("affiliate_portal_viewed", {
      source_path: "/account/affiliate",
      is_affiliate: enrolled,
    });
  }, [enrolled]);

  // Enroll handler
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
    // Show PayPal setup step if they haven't set one yet
    if (!paypalEmail.trim()) setPayoutStep(true);
  }, [paypalEmail]);

  useEffect(() => {
    if (!autoEnroll || enrolled || loading || autoEnrollStartedRef.current) return;
    autoEnrollStartedRef.current = true;
    const timer = window.setTimeout(() => {
      void handleEnroll();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [autoEnroll, enrolled, loading, handleEnroll]);

  async function handleCopyLink() {
    if (!referralLink) return;
    await navigator.clipboard.writeText(referralLink);
    track("affiliate_link_copied", {
      source_path: "/account/affiliate",
    });
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  }

  const totalPaid = payouts
    .filter((payout) => payout.state === "paid")
    .reduce((sum, payout) => sum + payout.amount, 0);
  const totalPending = commissions
    .filter((commission) => !["paid", "rejected", "denied", "voided", "canceled", "cancelled"].includes(commission.status.toLowerCase()))
    .reduce((sum, commission) => sum + commission.amount, 0);
  // In dev preview mode, override totalEarned to simulate the threshold crossing
  const totalEarned  = w9Preview === "hard" ? 65000
    : w9Preview === "soft" ? 55000
    : totalPaid + totalPending;

  // Slug customizer handlers
  async function handleSlugSave() {
    setSlugSaving(true);
    setSlugError(null);
    const result = await updateReferralSlugAction(slugDraft);
    setSlugSaving(false);
    if ("error" in result) { setSlugError(result.error); return; }
    setCurrentToken(result.newToken);
    setSlugEditing(false);
    setSlugSaved(true);
    setTimeout(() => setSlugSaved(false), 4000);
  }

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
    track("affiliate_payout_details_saved", {
      source_path: "/account/affiliate",
    });
    setTimeout(() => setPaypalSaved(false), 4000);
  }

  // ── Payout setup step (after enrollment, no PayPal set) ──
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
                marginBottom: "0.875rem",
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

            {/* ── Slug customizer ── */}
            <div style={{ marginBottom: "1.125rem" }}>
              {slugEditing ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {/* Warning */}
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start", background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: "0.75rem", padding: "0.625rem 0.875rem" }}>
                    <span style={{ fontSize: "0.9rem", flexShrink: 0 }}>⚠️</span>
                    <p style={{ margin: 0, fontSize: "0.75rem", color: "#92400E", lineHeight: 1.5 }}>Your old link will stop tracking the moment you save. Update any posts or bios where it appears.</p>
                  </div>
                  {/* Input row */}
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <span style={{ fontSize: "0.83rem", color: "#71717A", flexShrink: 0, whiteSpace: "nowrap" }}>positives.life?fpr=</span>
                    <input
                      id="slug-input"
                      type="text"
                      value={slugDraft}
                      onChange={e => setSlugDraft(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                      maxLength={30}
                      autoFocus
                      style={{ flex: 1, padding: "0.625rem 0.875rem", fontSize: "0.875rem", border: "1.5px solid #2EC4B6", borderRadius: "0.75rem", outline: "none", fontFamily: "monospace", color: "#09090B", background: "#FAFAFA", boxSizing: "border-box" }}
                    />
                    <button
                      id="slug-save-btn"
                      onClick={handleSlugSave}
                      disabled={slugSaving || slugDraft.length < 3}
                      style={{ flexShrink: 0, padding: "0.625rem 1rem", fontSize: "0.8rem", fontWeight: 700, color: "#fff", background: slugSaving || slugDraft.length < 3 ? "#A1A1AA" : "linear-gradient(135deg, #2EC4B6 0%, #44A8D8 100%)", border: "none", borderRadius: "0.75rem", cursor: slugSaving ? "wait" : "pointer", whiteSpace: "nowrap" }}
                    >
                      {slugSaving ? "Saving…" : "Save"}
                    </button>
                    <button onClick={() => { setSlugEditing(false); setSlugDraft(currentToken ?? ""); setSlugError(null); }} style={{ flexShrink: 0, fontSize: "0.75rem", color: "#A1A1AA", background: "none", border: "none", cursor: "pointer", padding: "0.25rem" }}>Cancel</button>
                  </div>
                  {slugError && <p style={{ fontSize: "0.78rem", color: "#EF4444", margin: 0 }}>{slugError}</p>}
                  <p style={{ fontSize: "0.72rem", color: "#A1A1AA", margin: 0 }}>3–30 characters. Lowercase letters, numbers, and hyphens only.</p>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ fontSize: "0.78rem", color: "#71717A" }}>Link slug:</span>
                  <code style={{ fontSize: "0.83rem", color: "#2EC4B6", background: "rgba(46,196,182,0.08)", borderRadius: "0.375rem", padding: "0.125rem 0.5rem", fontWeight: 600 }}>{currentToken}</code>
                  {slugSaved && <span style={{ fontSize: "0.75rem", color: "#16A34A", fontWeight: 600 }}>✓ Updated!</span>}
                  <button
                    id="slug-edit-btn"
                    onClick={() => { setSlugEditing(true); setSlugDraft(currentToken ?? ""); setSlugError(null); }}
                    style={{ fontSize: "0.75rem", color: "#44A8D8", background: "none", border: "none", cursor: "pointer", padding: "0.125rem 0.5rem", fontWeight: 600 }}
                  >
                    Customize →
                  </button>
                </div>
              )}
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
              }}
            >
              <span style={{ fontSize: "1.1rem", lineHeight: 1 }}>💰</span>
              <p style={{ fontSize: "0.85rem", color: "#92400E", lineHeight: 1.5, margin: 0 }}>
                <strong style={{ fontWeight: 700 }}>You earn 20% recurring.</strong>{" "}
                Every month your referrals stay active, that commission is yours.
              </p>
            </div>

            {/* Affiliate since */}
            {affiliateCreatedAt && (
              <p style={{ fontSize: "0.72rem", color: "#A1A1AA", margin: "0.875rem 0 0", textAlign: "right" }}>
                Affiliate since {new Date(affiliateCreatedAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </p>
            )}
          </div>

          {/* Link Builder */}
          {currentToken && <LinkBuilder token={currentToken} initialLinks={initialLinks ?? []} />}

            {/* Quick-stats peek (if any data) */}
          {stats && (stats.visitors > 0 || stats.conversions > 0) && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
              <StatChip label="Visitors" value={stats.visitors} />
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
                <StatChip label="Visitors" value={stats.visitors}   />
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
                  These totals come from FirstPromoter and reflect all-time visitors, leads, and member conversions attributed to your referral code. Updates may take up to 24 hours to appear.
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
          {paypalEmail.trim() ? (
            <div style={{ background: "#FFFFFF", border: "1.5px solid #E4E4E7", borderRadius: "1.25rem", padding: "1.5rem", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
              <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "0.9rem", fontWeight: 700, color: "#09090B", marginBottom: "0.25rem", letterSpacing: "-0.02em" }}>💳 Payout Settings</h2>
              <p style={{ fontSize: "0.8rem", color: "#71717A", marginBottom: "1rem", lineHeight: 1.5 }}>Save the PayPal email Positives should use when coordinating your affiliate payouts.</p>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <input id="paypal-email-input" type="email" placeholder="your-paypal@email.com" value={paypalEmail} onChange={e => setPaypalEmail(e.target.value)}
                  style={{ flex: 1, padding: "0.75rem 1rem", fontSize: "0.875rem", border: "1.5px solid #E4E4E7", borderRadius: "0.875rem", outline: "none", fontFamily: "var(--font-sans)", color: "#09090B", background: "#FAFAFA", transition: "border-color 0.2s" }}
                  onFocus={e => (e.currentTarget.style.borderColor = "#2EC4B6")}
                  onBlur={e => (e.currentTarget.style.borderColor = "#E4E4E7")}
                />
                <button id="save-paypal-btn" onClick={handleSavePayPal} disabled={paypalSaving || !paypalEmail.trim()}
                  style={{ padding: "0.75rem 1.25rem", fontSize: "0.83rem", fontWeight: 700, color: "#FFFFFF", background: paypalSaved ? "#16A34A" : paypalSaving ? "#A1A1AA" : "linear-gradient(135deg, #2EC4B6 0%, #44A8D8 100%)", border: "none", borderRadius: "0.875rem", cursor: paypalSaving ? "wait" : "pointer", whiteSpace: "nowrap", transition: "all 0.2s" }}
                >
                  {paypalSaved ? "✓ Saved!" : paypalSaving ? "Saving…" : "Save"}
                </button>
              </div>
              {paypalError && <p style={{ fontSize: "0.8rem", color: "#EF4444", marginTop: "0.5rem" }}>{paypalError}</p>}
              {paypalSaved && <p style={{ fontSize: "0.8rem", color: "#16A34A", marginTop: "0.5rem" }}>PayPal email saved. We&apos;ll use this address for affiliate payout coordination.</p>}
            </div>
          ) : (
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: "1rem", padding: "1rem 1.25rem" }}>
              <span style={{ fontSize: "1.1rem", lineHeight: 1, flexShrink: 0 }}>⚠️</span>
              <div style={{ flex: 1 }}>
                <p style={{ margin: "0 0 0.625rem", fontSize: "0.85rem", fontWeight: 700, color: "#92400E", lineHeight: 1.4 }}>Add a PayPal email so we can coordinate your affiliate payouts</p>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <input id="earnings-paypal-input" type="email" placeholder="your-paypal@email.com" value={paypalEmail} onChange={e => setPaypalEmail(e.target.value)}
                    style={{ flex: 1, padding: "0.625rem 0.875rem", fontSize: "0.83rem", border: "1.5px solid rgba(245,158,11,0.35)", borderRadius: "0.75rem", outline: "none", fontFamily: "var(--font-sans)", color: "#09090B", background: "rgba(255,255,255,0.8)", transition: "border-color 0.2s" }}
                    onFocus={e => (e.currentTarget.style.borderColor = "#F59E0B")}
                    onBlur={e => (e.currentTarget.style.borderColor = "rgba(245,158,11,0.35)")}
                  />
                  <button id="earnings-save-paypal-btn" onClick={handleSavePayPal} disabled={paypalSaving || !paypalEmail.trim()}
                    style={{ padding: "0.625rem 1rem", fontSize: "0.8rem", fontWeight: 700, color: "#FFFFFF", background: paypalSaved ? "#16A34A" : "#F59E0B", border: "none", borderRadius: "0.75rem", cursor: paypalSaving || !paypalEmail.trim() ? "not-allowed" : "pointer", whiteSpace: "nowrap", transition: "all 0.2s", flexShrink: 0 }}
                  >
                    {paypalSaved ? "✓ Saved!" : paypalSaving ? "Saving…" : "Save"}
                  </button>
                </div>
                {paypalError && <p style={{ fontSize: "0.8rem", color: "#EF4444", marginTop: "0.5rem" }}>{paypalError}</p>}
                <p style={{ margin: "0.5rem 0 0", fontSize: "0.72rem", color: "#92400E" }}>
                  Don&apos;t have PayPal?{" "}
                  <a href="https://www.paypal.com/us/webapps/mpp/account-selection" target="_blank" rel="noopener noreferrer" style={{ color: "#D97706", textDecoration: "underline" }}>Create a free account →</a>
                </p>
              </div>
            </div>
          )}

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

          {/* Payout history */}
          {payouts.length > 0 && (
            <div style={{ background: "#FFFFFF", border: "1.5px solid #E4E4E7", borderRadius: "1.25rem", padding: "1.5rem", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
              <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "0.9rem", fontWeight: 700, color: "#09090B", marginBottom: "0.125rem", letterSpacing: "-0.02em" }}>Payout History</h2>
              <p style={{ fontSize: "0.75rem", color: "#71717A", margin: "0 0 0.875rem", lineHeight: 1.5 }}>This history reflects payouts recorded in FirstPromoter. Keep your PayPal email current so payout coordination stays smooth.</p>
              <div>
                {payouts.map(p => <PayoutRow key={p.id} p={p} />)}
              </div>
            </div>
          )}

          {/* W9 section */}
          {w9Preview !== "off" && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem", background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)", borderRadius: "9999px", padding: "0.25rem 0.75rem", fontSize: "0.72rem", fontWeight: 700, color: "#6366F1", letterSpacing: "0.04em" }}>
              🧪 DEV PREVIEW — {w9Preview === "hard" ? "$650 earned (hard gate)" : "$550 earned (soft warning)"}
            </div>
          )}
          <div
            style={{
              background: "#FFFFFF",
              border: `1.5px solid ${
                !w9Filed && totalEarned >= 60000 ? "rgba(239,68,68,0.35)"
                : !w9Filed && totalEarned >= 50000 ? "rgba(245,158,11,0.35)"
                : "#E4E4E7"
              }`,
              borderRadius: "1.25rem",
              padding: "1.75rem",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}
          >
            {/* $600 hard requirement banner */}
            {!w9Filed && totalEarned >= 60000 && (
              <div style={{ display: "flex", gap: "0.625rem", alignItems: "flex-start", background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "0.875rem", padding: "0.875rem 1rem", marginBottom: "1.25rem" }}>
                <span style={{ fontSize: "1rem", flexShrink: 0 }}>🚨</span>
                <p style={{ margin: 0, fontSize: "0.83rem", color: "#B91C1C", fontWeight: 600, lineHeight: 1.5 }}>
                  Action required: You&apos;ve earned ${(totalEarned / 100).toFixed(0)} in commissions. We&apos;re required to collect a W-9 before issuing further payouts. Please complete the form below.
                </p>
              </div>
            )}
            {/* $500 soft warning */}
            {!w9Filed && totalEarned >= 50000 && totalEarned < 60000 && (
              <div style={{ display: "flex", gap: "0.625rem", alignItems: "flex-start", background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: "0.875rem", padding: "0.875rem 1rem", marginBottom: "1.25rem" }}>
                <span style={{ fontSize: "1rem", flexShrink: 0 }}>📋</span>
                <p style={{ margin: 0, fontSize: "0.83rem", color: "#92400E", lineHeight: 1.5 }}>
                  <strong>Heads up:</strong> You&apos;ve earned ${(totalEarned / 100).toFixed(0)} so far. Once you hit $600, we&apos;ll need a W-9 to comply with IRS 1099 rules. You can file it now to get ahead of it.
                </p>
              </div>
            )}

            <W9Form
              existingW9={w9Filed ? (existingW9 ?? null) : null}
              onSaved={() => setW9Filed(true)}
            />

            {/* Info note when no threshold reached */}
            {!w9Filed && totalEarned < 50000 && (
              <div style={{ marginTop: "1.25rem", background: "#F4F4F5", border: "1px solid #E4E4E7", borderRadius: "0.875rem", padding: "0.875rem 1rem" }}>
                <p style={{ fontSize: "0.78rem", color: "#71717A", margin: 0, lineHeight: 1.55 }}>
                  <strong style={{ color: "#52525B" }}>Tax info:</strong> If your total commissions reach $600 in a calendar year, we&apos;ll need a W-9 for 1099 reporting. You can file it now or wait — no action required until then.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
