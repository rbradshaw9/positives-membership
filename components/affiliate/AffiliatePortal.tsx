"use client";

/**
 * components/affiliate/AffiliatePortal.tsx
 *
 * Full affiliate portal — replaces the ReferralCard on the account page.
 * Tabs: My Link | Stats | Share | Earnings
 *
 * If not yet an affiliate, shows the enrollment flow.
 * If already an affiliate, shows the full tabbed experience.
 */

import { useState } from "react";
import { getReferralLinkAction } from "@/app/account/affiliate/actions";
import type { RewardfulCommission } from "@/lib/rewardful/client";

interface Stats {
  visitors: number;
  leads: number;
  conversions: number;
}

interface Props {
  isAffiliate: boolean;
  affiliateId: string | null;
  token: string | null;
  stats: Stats | null;
  commissions: RewardfulCommission[];
  memberName: string;
}

type Tab = "link" | "stats" | "share" | "earnings";

const TABS: { id: Tab; label: string }[] = [
  { id: "link",     label: "My Link"   },
  { id: "stats",    label: "Stats"     },
  { id: "share",    label: "Resources" },
  { id: "earnings", label: "Earnings"  },
];

// ── Email swipes & social copy ────────────────────────────────────────────────

const EMAIL_SWIPES = [
  {
    label: "Swipe 1 — Personal recommendation",
    subject: "This is the daily practice I swear by",
    body: `Hey [Name],

I've been doing this daily audio practice called Positives for the past few weeks and it's genuinely changed how I start my day.

It's 10 minutes of curated audio — interviews, stories, and perspectives that actually stick with you. Not self-help fluff. Real stuff.

I think you'd love it. You can try it here:
[YOUR_LINK]

Let me know what you think.`,
  },
  {
    label: "Swipe 2 — Short & punchy",
    subject: "10 minutes that changed my mornings",
    body: `Quick share —

I've been using Positives to start my mornings and it's been really good.

Daily audio, curated reminders, and a practice that actually helps me stay grounded.

Check it out: [YOUR_LINK]`,
  },
];

const SOCIAL_CAPTIONS = [
  {
    label: "Instagram / Facebook",
    copy: `I've been doing a 10-minute daily audio practice and it's been a game changer for my mornings.

If you're looking for something that keeps you grounded and inspired — without the hustle noise — check out @positives.life

My link: [YOUR_LINK]

#Positives #MorningRoutine #DailyPractice`,
  },
  {
    label: "Twitter / X",
    copy: `Started using @positives for my morning practice.

10 minutes of curated audio that actually sticks with you.

Worth trying: [YOUR_LINK]`,
  },
  {
    label: "LinkedIn",
    copy: `I've been consistent with one new habit this year: a 10-minute morning audio practice from Positives.

It's not a podcast. It's a curated daily practice — stories, interviews, and perspectives that shift how you see the day.

If you're building a more intentional morning, I'd recommend giving it a try: [YOUR_LINK]`,
  },
];

const TALKING_POINTS = [
  "20% recurring commission for every member you refer — for as long as they stay",
  "Positives members listen daily — this is a high-retention product",
  "Authentic recommendation only — share with people you genuinely think would love it",
  "Your referral link is: positives.life/join?via=YOUR_TOKEN",
  "Commissions are paid monthly via Rewardful",
];

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div style={{
      background: "#F9F7F4",
      border: "1px solid rgba(221,215,207,0.7)",
      borderRadius: "1rem",
      padding: "1.5rem",
      textAlign: "center",
    }}>
      <div style={{
        fontSize: "2.25rem",
        fontWeight: 700,
        color: "#121417",
        fontFamily: "var(--font-montserrat)",
        letterSpacing: "-0.03em",
        lineHeight: 1,
        marginBottom: "0.5rem",
      }}>
        {value.toLocaleString()}
      </div>
      <div style={{ fontSize: "0.8rem", color: "#9AA0A8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}
      </div>
    </div>
  );
}

function CopyBlock({ label, content }: { label: string; content: string }) {
  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div style={{ marginBottom: "1.25rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
        <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#68707A", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {label}
        </span>
        <button
          onClick={handleCopy}
          style={{
            fontSize: "0.8rem",
            fontWeight: 600,
            color: copied ? "#4E8C78" : "#2F6FED",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
            transition: "color 0.2s",
          }}
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre style={{
        background: "#F9F7F4",
        border: "1px solid rgba(221,215,207,0.7)",
        borderRadius: "0.75rem",
        padding: "1rem",
        fontSize: "0.85rem",
        color: "#374151",
        lineHeight: 1.6,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        fontFamily: "inherit",
        margin: 0,
      }}>
        {content}
      </pre>
    </div>
  );
}

function CommissionRow({ c }: { c: RewardfulCommission }) {
  const amount = `$${(c.amount / 100).toFixed(2)}`;
  const date = new Date(c.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const statusColor = { paid: "#4E8C78", pending: "#F59E0B", unpaid: "#9AA0A8" }[c.status] ?? "#9AA0A8";

  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "0.875rem 0",
      borderBottom: "1px solid rgba(221,215,207,0.5)",
    }}>
      <div>
        <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#121417" }}>{amount}</div>
        <div style={{ fontSize: "0.75rem", color: "#9AA0A8", marginTop: "0.125rem" }}>{date}</div>
      </div>
      <span style={{
        fontSize: "0.75rem",
        fontWeight: 600,
        color: statusColor,
        background: `${statusColor}15`,
        borderRadius: "99px",
        padding: "0.25rem 0.75rem",
        textTransform: "capitalize",
      }}>
        {c.status}
      </span>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function AffiliatePortal({ isAffiliate, affiliateId, token, stats, commissions, memberName }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("link");
  const [loading, setLoading] = useState(false);
  const [currentToken, setCurrentToken] = useState(token);
  const [currentAffiliateId, setCurrentAffiliateId] = useState(affiliateId);
  const [enrolled, setEnrolled] = useState(isAffiliate);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const referralLink = currentToken ? `https://positives.life/join?via=${currentToken}` : null;

  async function handleEnroll() {
    setLoading(true);
    setError(null);
    const result = await getReferralLinkAction();
    setLoading(false);
    if ("error" in result) { setError(result.error); return; }
    setCurrentToken(result.token);
    setCurrentAffiliateId(result.affiliateId);
    setEnrolled(true);
  }

  async function handleCopyLink() {
    if (!referralLink) return;
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  const totalEarned = commissions.filter(c => c.status === "paid").reduce((s, c) => s + c.amount, 0);
  const totalPending = commissions.filter(c => c.status !== "paid").reduce((s, c) => s + c.amount, 0);

  // ── Not enrolled yet ──
  if (!enrolled) {
    return (
      <div style={{ maxWidth: 520, margin: "2.5rem auto", padding: "0 1rem" }}>
        <div style={{
          background: "#FFFFFF",
          border: "1.5px solid rgba(221,215,207,0.7)",
          borderRadius: "1.5rem",
          padding: "2.5rem",
          textAlign: "center",
          boxShadow: "0 2px 12px rgba(18,20,23,0.05)",
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: "1rem",
            background: "rgba(78,140,120,0.10)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 1.5rem",
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4E8C78" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <h1 style={{ fontFamily: "var(--font-montserrat)", fontSize: "1.375rem", fontWeight: 700, color: "#121417", marginBottom: "0.75rem", letterSpacing: "-0.025em" }}>
            Earn 20% for every member you refer
          </h1>
          <p style={{ fontSize: "0.9rem", color: "#68707A", lineHeight: 1.6, marginBottom: "2rem" }}>
            Share your unique link. When someone joins, you earn 20% of their membership every month — for as long as they stay.
          </p>
          {error && <p style={{ color: "#C0392B", fontSize: "0.85rem", marginBottom: "1rem" }}>{error}</p>}
          <button
            onClick={handleEnroll}
            disabled={loading}
            style={{
              display: "inline-flex", alignItems: "center", gap: "0.5rem",
              background: "linear-gradient(135deg, #4E8C78 0%, #3D7262 100%)",
              color: "#FFFFFF", border: "none", borderRadius: "99px",
              padding: "0.875rem 2rem", fontSize: "0.9rem", fontWeight: 600,
              cursor: loading ? "wait" : "pointer", opacity: loading ? 0.8 : 1,
              boxShadow: "0 4px 16px rgba(78,140,120,0.25)", transition: "opacity 0.2s",
            }}
          >
            {loading ? "Setting up…" : "Get my referral link →"}
          </button>
          <p style={{ fontSize: "0.75rem", color: "#9AA0A8", marginTop: "0.875rem" }}>
            Free to join · Instant link · No approval needed
          </p>
        </div>
      </div>
    );
  }

  // ── Full portal ──
  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "1.5rem 1rem 4rem" }}>

      {/* Header */}
      <div style={{ marginBottom: "1.75rem" }}>
        <h1 style={{ fontFamily: "var(--font-montserrat)", fontSize: "1.375rem", fontWeight: 700, color: "#121417", letterSpacing: "-0.025em", marginBottom: "0.25rem" }}>
          Affiliate Portal
        </h1>
        <p style={{ fontSize: "0.875rem", color: "#68707A" }}>
          Your referral link, stats, and resources — all in one place.
        </p>
      </div>

      {/* Tabs */}
      <div style={{
        display: "flex",
        gap: "0.25rem",
        background: "#F2EFE9",
        borderRadius: "0.875rem",
        padding: "0.3rem",
        marginBottom: "1.75rem",
      }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              padding: "0.5rem 0.25rem",
              fontSize: "0.825rem",
              fontWeight: 600,
              border: "none",
              borderRadius: "0.625rem",
              cursor: "pointer",
              transition: "all 0.2s",
              background: activeTab === tab.id ? "#FFFFFF" : "transparent",
              color: activeTab === tab.id ? "#121417" : "#9AA0A8",
              boxShadow: activeTab === tab.id ? "0 1px 4px rgba(18,20,23,0.08)" : "none",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: My Link */}
      {activeTab === "link" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div style={{
            background: "#FFFFFF",
            border: "1.5px solid rgba(221,215,207,0.7)",
            borderRadius: "1.25rem",
            padding: "1.75rem",
            boxShadow: "0 2px 8px rgba(18,20,23,0.04)",
          }}>
            <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "#9AA0A8", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.625rem" }}>
              Your referral link
            </p>
            <div style={{
              display: "flex", gap: "0.5rem", alignItems: "center",
              background: "#F9F7F4", border: "1px solid rgba(221,215,207,0.7)",
              borderRadius: "0.75rem", padding: "0.75rem 1rem",
              marginBottom: "1rem",
            }}>
              <span style={{
                flex: 1, fontSize: "0.875rem", color: "#121417",
                fontFamily: "monospace", overflow: "hidden",
                textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {referralLink}
              </span>
              <button
                onClick={handleCopyLink}
                style={{
                  flexShrink: 0, fontSize: "0.8rem", fontWeight: 600,
                  color: copied ? "#4E8C78" : "#2F6FED",
                  background: "none", border: "none", cursor: "pointer",
                  padding: "0 0.25rem", transition: "color 0.2s",
                }}
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>

            <a
              href="/account/affiliate/portal"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex", alignItems: "center", gap: "0.5rem",
                fontSize: "0.85rem", fontWeight: 600, color: "#4E8C78",
                textDecoration: "none",
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
              Open Rewardful Dashboard
            </a>
          </div>

          <div style={{
            background: "rgba(78,140,120,0.06)",
            border: "1px solid rgba(78,140,120,0.15)",
            borderRadius: "1rem",
            padding: "1.25rem 1.5rem",
          }}>
            <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#3D7262", marginBottom: "0.5rem" }}>
              💰 You earn 20% recurring
            </p>
            <p style={{ fontSize: "0.85rem", color: "#5A8C78", lineHeight: 1.6, margin: 0 }}>
              For every member you refer, you earn 20% of their monthly membership fee — every month they stay active. Commissions are paid via Rewardful.
            </p>
          </div>
        </div>
      )}

      {/* Tab: Stats */}
      {activeTab === "stats" && (
        <div>
          {stats ? (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.875rem", marginBottom: "1.5rem" }}>
                <StatCard label="Clicks" value={stats.visitors} />
                <StatCard label="Leads" value={stats.leads} />
                <StatCard label="Members" value={stats.conversions} />
              </div>
              <div style={{
                background: "#F9F7F4",
                border: "1px solid rgba(221,215,207,0.7)",
                borderRadius: "1rem",
                padding: "1.25rem 1.5rem",
              }}>
                <p style={{ fontSize: "0.8rem", color: "#9AA0A8", margin: 0 }}>
                  Stats reflect all-time activity on your referral link. Updates may take up to 24 hours to appear.
                </p>
              </div>
            </>
          ) : (
            <p style={{ fontSize: "0.9rem", color: "#9AA0A8", textAlign: "center", padding: "3rem 0" }}>
              No stats yet — share your link to get started.
            </p>
          )}
        </div>
      )}

      {/* Tab: Share Resources */}
      {activeTab === "share" && (
        <div>
          <div style={{
            background: "#FFFFFF",
            border: "1.5px solid rgba(221,215,207,0.7)",
            borderRadius: "1.25rem",
            padding: "1.75rem",
            marginBottom: "1.25rem",
            boxShadow: "0 2px 8px rgba(18,20,23,0.04)",
          }}>
            <h2 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#121417", marginBottom: "1.25rem" }}>
              Email Swipes
            </h2>
            {EMAIL_SWIPES.map(s => (
              <CopyBlock
                key={s.label}
                label={s.label}
                content={`Subject: ${s.subject}\n\n${s.body.replace("[YOUR_LINK]", referralLink ?? "[YOUR_LINK]")}`}
              />
            ))}
          </div>

          <div style={{
            background: "#FFFFFF",
            border: "1.5px solid rgba(221,215,207,0.7)",
            borderRadius: "1.25rem",
            padding: "1.75rem",
            marginBottom: "1.25rem",
            boxShadow: "0 2px 8px rgba(18,20,23,0.04)",
          }}>
            <h2 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#121417", marginBottom: "1.25rem" }}>
              Social Captions
            </h2>
            {SOCIAL_CAPTIONS.map(s => (
              <CopyBlock
                key={s.label}
                label={s.label}
                content={s.copy.replace("[YOUR_LINK]", referralLink ?? "[YOUR_LINK]")}
              />
            ))}
          </div>

          <div style={{
            background: "#FFFFFF",
            border: "1.5px solid rgba(221,215,207,0.7)",
            borderRadius: "1.25rem",
            padding: "1.75rem",
            boxShadow: "0 2px 8px rgba(18,20,23,0.04)",
          }}>
            <h2 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#121417", marginBottom: "1rem" }}>
              Key Talking Points
            </h2>
            <ul style={{ margin: 0, padding: "0 0 0 1.25rem", display: "flex", flexDirection: "column", gap: "0.625rem" }}>
              {TALKING_POINTS.map((p, i) => (
                <li key={i} style={{ fontSize: "0.875rem", color: "#374151", lineHeight: 1.55 }}>
                  {p.replace("YOUR_TOKEN", currentToken ?? "YOUR_TOKEN")}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Tab: Earnings */}
      {activeTab === "earnings" && (
        <div>
          {/* Summary cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.875rem", marginBottom: "1.5rem" }}>
            <div style={{
              background: "#FFFFFF", border: "1.5px solid rgba(221,215,207,0.7)",
              borderRadius: "1.25rem", padding: "1.5rem", boxShadow: "0 2px 8px rgba(18,20,23,0.04)",
            }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#9AA0A8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.5rem" }}>Total Paid</div>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#4E8C78", fontFamily: "var(--font-montserrat)", letterSpacing: "-0.03em" }}>
                ${(totalEarned / 100).toFixed(2)}
              </div>
            </div>
            <div style={{
              background: "#FFFFFF", border: "1.5px solid rgba(221,215,207,0.7)",
              borderRadius: "1.25rem", padding: "1.5rem", boxShadow: "0 2px 8px rgba(18,20,23,0.04)",
            }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#9AA0A8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.5rem" }}>Pending</div>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#F59E0B", fontFamily: "var(--font-montserrat)", letterSpacing: "-0.03em" }}>
                ${(totalPending / 100).toFixed(2)}
              </div>
            </div>
          </div>

          {/* Commission list */}
          <div style={{
            background: "#FFFFFF", border: "1.5px solid rgba(221,215,207,0.7)",
            borderRadius: "1.25rem", padding: "1.25rem 1.5rem",
            boxShadow: "0 2px 8px rgba(18,20,23,0.04)",
          }}>
            <h2 style={{ fontSize: "0.875rem", fontWeight: 700, color: "#121417", marginBottom: "0.5rem" }}>
              Commission History
            </h2>
            {commissions.length === 0 ? (
              <p style={{ fontSize: "0.875rem", color: "#9AA0A8", padding: "1.5rem 0", textAlign: "center" }}>
                No commissions yet. Share your link to start earning.
              </p>
            ) : (
              commissions.map(c => <CommissionRow key={c.id} c={c} />)
            )}
          </div>
        </div>
      )}
    </div>
  );
}
