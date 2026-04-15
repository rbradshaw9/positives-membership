"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
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
  trackedLinks: AffiliateTrackedLink[];
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

function formatTrackedLinkKind(kind: AffiliateTrackedLink["kind"]) {
  if (kind === "primary") return "Main";
  if (kind === "campaign") return "Campaign";
  return "Tracked";
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

function buildEmailSwipes(link: string) {
  return [
    {
      id: "email-personal",
      label: "Personal email",
      content: `Subject: I think you'd really like this\n\nI've been using Positives as part of my daily routine and it has been one of the most grounding things in my week.\n\nIt's a short daily audio practice with Dr. Paul Jenkins, plus a weekly principle and monthly masterclass. Thought of you because I think you'd actually use it.\n\nHere's my link if you want to take a look:\n${link}`,
    },
    {
      id: "email-followup",
      label: "Follow-up email",
      content: `Subject: Quick follow-up\n\nWanted to send this over in case it helps.\n\nPositives is a daily practice membership I keep coming back to because it is simple, calming, and actually usable in real life.\n\nHere's my link:\n${link}`,
    },
    {
      id: "email-newsletter-feature",
      label: "Newsletter feature",
      content: `Subject: A simple resource for steadier days\n\nI wanted to share something I've been genuinely recommending lately.\n\nPositives is a membership built around a short daily practice with Dr. Paul Jenkins. It includes a daily audio, a weekly principle, and a monthly theme, so it feels more like a steady rhythm than another course to finish.\n\nIf that sounds useful, you can take a look here:\n${link}`,
    },
  ];
}

function buildQuickSharePacks(link: string) {
  return [
    {
      id: "warm-text-pack",
      title: "Warm personal text",
      channel: "Text / DM",
      audience: "Best for one person you already know",
      whyItWorks: "Short, personal, and easy to reply to.",
      content: `I've been using Positives as a short daily practice and immediately thought of you. It's simple, grounding, and actually easy to stick with.\n\nIf you want to take a look, here's my link: ${link}`,
    },
    {
      id: "warm-email-pack",
      title: "Warm email intro",
      channel: "Email",
      audience: "Best for a thoughtful one-to-one recommendation",
      whyItWorks: "Gives enough context without sounding like a pitch.",
      content: `Subject: Thought of you\n\nI've been using Positives as part of my routine and wanted to send it your way.\n\nIt's built around a short daily audio with Dr. Paul Jenkins, plus a weekly principle and monthly theme. What I like is that it feels simple and steady instead of overwhelming.\n\nIf you want to check it out, here's my link:\n${link}`,
    },
    {
      id: "newsletter-pack",
      title: "Newsletter / blog mention",
      channel: "Newsletter / creator",
      audience: "Best for your audience, list, or community",
      whyItWorks: "Easy to drop into existing content without a full promo sequence.",
      content: `A resource I've been genuinely recommending lately is Positives — a short daily practice membership with Dr. Paul Jenkins. It includes a daily audio, a weekly principle, and a monthly theme, so it feels more like a steady rhythm than another course to finish.\n\nTake a look here: ${link}`,
    },
    {
      id: "spoken-pack",
      title: "Live / spoken mention",
      channel: "Podcast / webinar / live",
      audience: "Best for interviews, events, and spoken recommendations",
      whyItWorks: "Natural to say out loud without sounding scripted.",
      content: `If you want a simple daily practice that helps you feel more grounded and intentional, check out Positives with Dr. Paul Jenkins. I've got a link here if you want to explore it: ${link}`,
    },
  ];
}

function buildShareTemplates(link: string) {
  return [
    {
      id: "text-message",
      label: "Text / DM",
      content: `I've been using Positives as a short daily audio practice and I think you'd really like it. It's simple, grounding, and easy to stay consistent with.\n\nHere's my link: ${link}`,
    },
    {
      id: "personal-followup",
      label: "Personal follow-up",
      content: `Circling back in case this is helpful. If you've been wanting something simple and steady for daily personal growth, this is the one I've been sharing lately.\n\nHere's my link: ${link}`,
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
    {
      id: "story-frame",
      label: "Story / short post",
      content: `A simple thing that's helped me lately: a short daily practice with Positives.\n\nIf you want something calming, practical, and easy to stick with, here's my link: ${link}`,
    },
    {
      id: "webinar-invite",
      label: "Webinar / live invite",
      content: `If you're joining me for this event and want a simple daily practice to keep the momentum going afterward, take a look at Positives here: ${link}`,
    },
    {
      id: "podcast-mention",
      label: "Podcast / spoken mention",
      content: `If you want a simple daily practice that helps you stay more grounded and intentional, check out Positives. I've linked it here: ${link}`,
    },
  ];
}

const DOWNLOADABLE_SHARE_ASSETS = [
  {
    id: "square-social",
    title: "Square social graphic",
    description: "A clean 1:1 post for feed placements, evergreen link pages, and creator shout-outs.",
    dimensions: "1080 x 1080",
    bestFor: "Instagram feed, Facebook posts, LinkedIn, and evergreen promo blocks",
    href: "/affiliate/share-kit/positives-affiliate-square.svg",
    previewWidth: 280,
    previewHeight: 280,
  },
  {
    id: "story-vertical",
    title: "Story-sized graphic",
    description: "A tall 9:16 asset with a stronger CTA for story shares and mobile-first promotion.",
    dimensions: "1080 x 1920",
    bestFor: "Instagram stories, Facebook stories, mobile-first shares, and text-message screenshots",
    href: "/affiliate/share-kit/positives-affiliate-story.svg",
    previewWidth: 210,
    previewHeight: 374,
  },
  {
    id: "email-banner",
    title: "Email / newsletter banner",
    description: "A wide banner affiliates can drop into an email intro, newsletter block, or partner page.",
    dimensions: "1200 x 675",
    bestFor: "Email headers, newsletters, partner pages, and webinar follow-up emails",
    href: "/affiliate/share-kit/positives-affiliate-email-banner.svg",
    previewWidth: 320,
    previewHeight: 180,
  },
] as const;

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

function ShareTemplateCard({
  title,
  description,
  blocks,
  selectedLinkLabel,
}: {
  title: string;
  description: string;
  blocks: { id: string; label: string; content: string }[];
  selectedLinkLabel: string;
}) {
  return (
    <SurfaceCard elevated className="surface-card--editorial">
      <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#09090B", letterSpacing: "-0.02em" }}>
        {title}
      </h2>
      <p style={{ margin: "0.35rem 0 0", fontSize: "0.84rem", color: "#71717A", lineHeight: 1.6 }}>
        {description}
      </p>
      <div className="mt-4 flex flex-col gap-3">
        {blocks.map((block) => (
          <CopyBlock
            key={block.id}
            label={block.label}
            content={block.content}
            onCopied={() =>
              track("affiliate_share_asset_copied", {
                source_path: "/account/affiliate",
                asset_type: block.id,
                selected_link: selectedLinkLabel,
              })
            }
          />
        ))}
      </div>
    </SurfaceCard>
  );
}

function QuickSharePackCard({
  pack,
  selectedLinkLabel,
}: {
  pack: {
    id: string;
    title: string;
    channel: string;
    audience: string;
    whyItWorks: string;
    content: string;
  };
  selectedLinkLabel: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(pack.content);
    track("affiliate_share_asset_copied", {
      source_path: "/account/affiliate",
      asset_type: `quick-pack:${pack.id}`,
      selected_link: selectedLinkLabel,
    });
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2200);
  }, [pack.content, pack.id, selectedLinkLabel]);

  return (
    <SurfaceCard elevated className="surface-card--editorial h-full">
      <div className="flex items-start justify-between gap-3">
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
            {pack.channel}
          </p>
          <h2
            style={{
              margin: "0.55rem 0 0.2rem",
              fontSize: "1rem",
              fontWeight: 700,
              color: "#09090B",
              letterSpacing: "-0.02em",
              textWrap: "balance",
            }}
          >
            {pack.title}
          </h2>
        </div>
        <button
          onClick={handleCopy}
          style={{
            border: "none",
            borderRadius: "9999px",
            padding: "0.6rem 0.9rem",
            background: copied
              ? "rgba(22,163,74,0.12)"
              : "linear-gradient(135deg, #2EC4B6 0%, #44A8D8 100%)",
            color: copied ? "#15803D" : "#FFFFFF",
            fontWeight: 700,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          {copied ? "Copied!" : "Copy pack"}
        </button>
      </div>

      <p style={{ margin: "0.35rem 0 0", fontSize: "0.82rem", color: "#71717A", lineHeight: 1.55 }}>
        {pack.audience}
      </p>
      <p style={{ margin: "0.4rem 0 0", fontSize: "0.82rem", color: "#52525B", lineHeight: 1.55 }}>
        {pack.whyItWorks}
      </p>

      <div
        style={{
          marginTop: "0.95rem",
          border: "1px solid #E4E4E7",
          borderRadius: "0.95rem",
          background: "#FAFAFA",
          padding: "0.95rem 1rem",
        }}
      >
        <pre
          style={{
            margin: 0,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            fontFamily: "var(--font-sans)",
            fontSize: "0.84rem",
            lineHeight: 1.65,
            color: "#3F3F46",
          }}
        >
          {pack.content}
        </pre>
      </div>
    </SurfaceCard>
  );
}

function ResourceListCard({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: string[];
}) {
  return (
    <SurfaceCard elevated className="surface-card--editorial">
      <h2
        style={{
          margin: 0,
          fontSize: "1rem",
          fontWeight: 700,
          color: "#09090B",
          letterSpacing: "-0.02em",
          textWrap: "balance",
        }}
      >
        {title}
      </h2>
      <p style={{ margin: "0.35rem 0 0", fontSize: "0.84rem", color: "#71717A", lineHeight: 1.6 }}>
        {description}
      </p>
      <div className="mt-4 flex flex-col gap-3">
        {items.map((item) => (
          <div key={item} className="flex items-start gap-3 text-sm text-muted-foreground">
            <span aria-hidden="true">•</span>
            <span>{item}</span>
          </div>
        ))}
      </div>
    </SurfaceCard>
  );
}

function DownloadableAssetCard({
  asset,
  selectedLinkLabel,
}: {
  asset: (typeof DOWNLOADABLE_SHARE_ASSETS)[number];
  selectedLinkLabel: string;
}) {
  const handleDownload = useCallback(() => {
    track("affiliate_share_asset_downloaded", {
      source_path: "/account/affiliate",
      asset_type: asset.id,
      selected_link: selectedLinkLabel,
    });
  }, [asset.id, selectedLinkLabel]);

  return (
    <SurfaceCard elevated className="surface-card--editorial h-full">
      <div className="flex h-full flex-col gap-4">
        <div
          style={{
            alignSelf: "flex-start",
            overflow: "hidden",
            borderRadius: "1rem",
            border: "1px solid rgba(228,228,231,1)",
            background: "#F8FAFC",
            width: "100%",
            maxWidth: `${asset.previewWidth}px`,
          }}
        >
          <div
            style={{
              position: "relative",
              width: "100%",
              aspectRatio: `${asset.previewWidth} / ${asset.previewHeight}`,
            }}
          >
            <Image
              src={asset.href}
              alt={`${asset.title} preview`}
              fill
              unoptimized
              sizes={`${asset.previewWidth}px`}
              style={{
                objectFit: "cover",
              }}
            />
          </div>
        </div>

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
            Graphic asset
          </p>
          <h2
            style={{
              margin: "0.55rem 0 0.2rem",
              fontSize: "1rem",
              fontWeight: 700,
              color: "#09090B",
              letterSpacing: "-0.02em",
              textWrap: "balance",
            }}
          >
            {asset.title}
          </h2>
          <p style={{ margin: 0, fontSize: "0.84rem", color: "#71717A", lineHeight: 1.6 }}>
            {asset.description}
          </p>
        </div>

        <div
          style={{
            border: "1px solid #E4E4E7",
            borderRadius: "0.95rem",
            background: "#FAFAFA",
            padding: "0.95rem 1rem",
          }}
        >
          <p style={{ margin: 0, fontSize: "0.78rem", color: "#52525B", lineHeight: 1.55 }}>
            <strong style={{ color: "#09090B" }}>Size:</strong> {asset.dimensions}
          </p>
          <p style={{ margin: "0.35rem 0 0", fontSize: "0.78rem", color: "#52525B", lineHeight: 1.55 }}>
            <strong style={{ color: "#09090B" }}>Best for:</strong> {asset.bestFor}
          </p>
        </div>

        <div className="mt-auto flex flex-wrap gap-2">
          <a
            href={asset.href}
            download
            onClick={handleDownload}
            style={{
              borderRadius: "9999px",
              padding: "0.75rem 1rem",
              background: "linear-gradient(135deg, #2EC4B6 0%, #44A8D8 100%)",
              color: "#FFFFFF",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Download graphic
          </a>
          <a
            href={asset.href}
            target="_blank"
            rel="noreferrer"
            style={{
              borderRadius: "9999px",
              padding: "0.75rem 1rem",
              background: "#F4F4F5",
              color: "#52525B",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Open preview
          </a>
        </div>
      </div>
    </SurfaceCard>
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
  agreedToTerms,
  onAgreementChange,
}: {
  onEnroll: () => void;
  loading: boolean;
  error: string | null;
  agreedToTerms: boolean;
  onAgreementChange: (value: boolean) => void;
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
            "You can use the ready-to-share links and messaging inside your portal",
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

        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "0.65rem",
            margin: "1.25rem auto 0",
            maxWidth: 420,
            textAlign: "left",
            fontSize: "0.84rem",
            lineHeight: 1.6,
            color: "#52525B",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={agreedToTerms}
            onChange={(event) => onAgreementChange(event.target.checked)}
            style={{ marginTop: "0.2rem" }}
          />
          <span>
            I agree to the{" "}
            <Link
              href="/affiliate-program"
              target="_blank"
              rel="noreferrer"
              style={{ color: "#0F766E", fontWeight: 700, textDecoration: "underline" }}
            >
              Affiliate Program Terms
              <span className="sr-only"> opens in a new tab</span>
            </Link>
            .
          </span>
        </label>

        <button
          id="affiliate-enroll-btn"
          onClick={onEnroll}
          disabled={loading || !agreedToTerms}
          style={{
            marginTop: "1.5rem",
            width: "100%",
            maxWidth: 360,
            border: "none",
            borderRadius: "9999px",
            padding: "0.95rem 1.75rem",
            background:
              loading || !agreedToTerms
                ? "#A1A1AA"
                : "linear-gradient(135deg, #2EC4B6 0%, #44A8D8 100%)",
            color: "#FFFFFF",
            fontWeight: 700,
            fontSize: "0.95rem",
            cursor: loading ? "wait" : !agreedToTerms ? "not-allowed" : "pointer",
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
  onSave: () => Promise<void> | void;
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
          Add the email connected to your PayPal account so your commissions are payout-ready
          from day one. We require this before opening the affiliate dashboard, and you can
          update it later anytime.
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

        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (saving || !paypalEmail.trim()) return;
            await onSave();
          }}
          style={{ marginTop: "1.5rem", textAlign: "left" }}
        >
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

          <button
            id="payout-save-btn"
            type="submit"
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
        </form>
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
}) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedTrackedLinkId, setExpandedTrackedLinkId] = useState<string | null>(null);
  const [tagDrafts, setTagDrafts] = useState<Record<string, string>>({});

  const availableTrackedLinks = useMemo(
    () => trackedLinks.filter((link) => link.url !== referralLink),
    [referralLink, trackedLinks]
  );

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
          Your links
        </p>
        <h2 style={{ margin: "0.65rem 0 0.25rem", fontSize: "1.25rem", fontWeight: 700, color: "#09090B", letterSpacing: "-0.03em", textWrap: "balance" }}>
          Grab the link you want to promote
        </h2>
        <p style={{ margin: 0, fontSize: "0.86rem", lineHeight: 1.6, color: "#71717A" }}>
          Your main referral link is ready to use now. Any extra campaign links set up for your portal will show up here too. This tab is for choosing links to share; the Performance tab is where FirstPromoter-attributed results live.
        </p>
        <div className="mt-4 flex flex-col gap-3">
          <div style={{ border: "1px solid rgba(46,196,182,0.22)", borderRadius: "1rem", background: "linear-gradient(180deg, rgba(248,251,252,1) 0%, rgba(255,255,255,1) 100%)", padding: "1rem" }}>
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div style={{ minWidth: 0 }}>
                <div className="flex flex-wrap items-center gap-2">
                  <p style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "#09090B" }}>Main referral link</p>
                  <span style={{ borderRadius: "9999px", background: "rgba(46,196,182,0.12)", color: "#0F766E", fontSize: "0.72rem", fontWeight: 700, padding: "0.2rem 0.55rem" }}>
                    Main
                  </span>
                </div>
                <p style={{ margin: "0.2rem 0 0", fontSize: "0.8rem", color: "#71717A" }}>Sales page</p>
                <p style={{ margin: "0.45rem 0 0", fontSize: "0.78rem", color: "#0F766E", fontFamily: "monospace", wordBreak: "break-word" }}>
                  {referralLink}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
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
                <a
                  href={referralLink ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                  style={{ borderRadius: "9999px", padding: "0.45rem 0.85rem", background: "#F4F4F5", color: "#52525B", fontWeight: 700, textDecoration: "none" }}
                >
                  Open
                </a>
              </div>
            </div>
          </div>

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
                          {formatTrackedLinkKind(link.kind)}
                        </span>
                      </div>
                      <p style={{ margin: "0.2rem 0 0", fontSize: "0.8rem", color: "#71717A" }}>
                        {formatTrackedDestination(link.destinationPath)}
                      </p>
                      <p style={{ margin: "0.45rem 0 0", fontSize: "0.78rem", color: "#0F766E", fontFamily: "monospace", wordBreak: "break-word" }}>
                        {tagEditorOpen ? taggedLink : link.url}
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
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
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
  trackedLinks,
}: {
  referralLink: string;
  trackedLinks: AffiliateTrackedLink[];
}) {
  const shareOptions = useMemo(
    () => [
      {
        id: "primary",
        label: "Main referral link",
        detail: "Best for everyday sharing",
        url: referralLink,
        destination: "Sales page",
      },
      ...trackedLinks
        .filter((link) => link.url !== referralLink)
        .map((link) => ({
          id: `tracked:${link.id}`,
          label: link.name,
          detail: formatTrackedLinkKind(link.kind),
          url: link.url,
          destination: formatTrackedDestination(link.destinationPath),
        })),
    ],
    [referralLink, trackedLinks]
  );

  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(shareOptions[0]?.id ?? null);
  const [sourceTag, setSourceTag] = useState("");
  const activeLink =
    shareOptions.find((option) => option.id === selectedLinkId) ?? shareOptions[0];
  const finalShareLink = buildTaggedTrackedLink(activeLink?.url ?? referralLink, sourceTag);
  const emailSwipes = buildEmailSwipes(finalShareLink);
  const quickSharePacks = buildQuickSharePacks(finalShareLink);
  const shareBlocks = buildShareTemplates(finalShareLink);
  const [copiedFinalLink, setCopiedFinalLink] = useState(false);

  async function handleCopyFinalLink() {
    await navigator.clipboard.writeText(finalShareLink);
    track("affiliate_custom_link_copied", {
      source_path: "/account/affiliate",
      link_name: activeLink?.label,
      sub_id: sourceTag.trim() || undefined,
      link_kind: activeLink?.detail,
    });
    setCopiedFinalLink(true);
    window.setTimeout(() => setCopiedFinalLink(false), 2200);
  }

  return (
    <div className="flex flex-col gap-4">
      <SurfaceCard elevated className="surface-card--editorial">
        <p style={{ margin: 0, fontSize: "0.68rem", fontWeight: 700, color: "#71717A", letterSpacing: "0.07em", textTransform: "uppercase" }}>
          Share flow
        </p>
        <h2 style={{ margin: "0.6rem 0 0.25rem", fontSize: "1.15rem", fontWeight: 700, color: "#09090B", letterSpacing: "-0.03em", textWrap: "balance" }}>
          Pick a link, add a source tag if you want, then copy a message
        </h2>
        <div className="mt-4 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="grid gap-3">
            {shareOptions.map((option) => {
              const selected = option.id === selectedLinkId;
              return (
                <button
                  key={option.id}
                  onClick={() => setSelectedLinkId(option.id)}
                  style={{
                    border: selected ? "1.5px solid rgba(46,196,182,0.32)" : "1px solid #E4E4E7",
                    borderRadius: "1rem",
                    padding: "1rem",
                    background: selected
                      ? "linear-gradient(180deg, rgba(46,196,182,0.12) 0%, rgba(255,255,255,1) 100%)"
                      : "#FFFFFF",
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div style={{ minWidth: 0 }}>
                      <div className="flex flex-wrap items-center gap-2">
                        <p style={{ margin: 0, fontSize: "0.94rem", fontWeight: 700, color: "#09090B" }}>{option.label}</p>
                        <span style={{ borderRadius: "9999px", background: selected ? "rgba(46,196,182,0.14)" : "rgba(244,244,245,1)", color: selected ? "#0F766E" : "#71717A", fontSize: "0.72rem", fontWeight: 700, padding: "0.2rem 0.55rem" }}>
                          {option.detail}
                        </span>
                      </div>
                      <p style={{ margin: "0.2rem 0 0", fontSize: "0.8rem", color: "#71717A" }}>{option.destination}</p>
                      <p style={{ margin: "0.45rem 0 0", fontSize: "0.78rem", color: "#0F766E", fontFamily: "monospace", wordBreak: "break-word" }}>
                        {option.url}
                      </p>
                    </div>
                    <span style={{ fontSize: "0.78rem", fontWeight: 700, color: selected ? "#0F766E" : "#A1A1AA" }}>
                      {selected ? "Using" : "Use"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-3">
            <div style={{ border: "1px solid rgba(68,168,216,0.16)", background: "rgba(68,168,216,0.06)", borderRadius: "1rem", padding: "1rem" }}>
              <p style={{ margin: 0, fontSize: "0.72rem", fontWeight: 700, color: "#2563EB", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                Optional source tag
              </p>
              <input
                value={sourceTag}
                onChange={(event) =>
                  setSourceTag(event.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))
                }
                placeholder="email, april-webinar, ig-bio"
                style={{ width: "100%", marginTop: "0.75rem", padding: "0.85rem 0.95rem", borderRadius: "0.8rem", border: "1.5px solid #E4E4E7", fontSize: "0.88rem", background: "#FFFFFF" }}
              />
              <p style={{ margin: "0.75rem 0 0", fontSize: "0.8rem", color: "#71717A", lineHeight: 1.55 }}>
                Use a source tag only when you want to compare different campaigns or placements inside FirstPromoter.
              </p>
            </div>

            <div style={{ border: "1px solid #E4E4E7", borderRadius: "1rem", padding: "1rem", background: "#FAFAFA" }}>
              <p style={{ margin: 0, fontSize: "0.72rem", fontWeight: 700, color: "#71717A", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                Link ready to share
              </p>
              <p style={{ margin: "0.5rem 0 0", fontSize: "0.82rem", lineHeight: 1.6, color: "#0F766E", wordBreak: "break-word", fontFamily: "monospace" }}>
                {finalShareLink}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => void handleCopyFinalLink()}
                  style={{ border: "none", borderRadius: "9999px", padding: "0.75rem 1rem", background: copiedFinalLink ? "rgba(22,163,74,0.12)" : "linear-gradient(135deg, #2EC4B6 0%, #44A8D8 100%)", color: copiedFinalLink ? "#15803D" : "#FFFFFF", fontWeight: 700, cursor: "pointer" }}
                >
                  {copiedFinalLink ? "Copied!" : "Copy link"}
                </button>
                <a
                  href={finalShareLink}
                  target="_blank"
                  rel="noreferrer"
                  style={{ borderRadius: "9999px", padding: "0.75rem 1rem", background: "#F4F4F5", color: "#52525B", fontWeight: 700, textDecoration: "none" }}
                >
                  Open link
                </a>
              </div>
            </div>

            <div style={{ border: "1px solid rgba(46,196,182,0.18)", background: "rgba(46,196,182,0.05)", borderRadius: "1rem", padding: "1rem" }}>
              <p style={{ margin: 0, fontSize: "0.82rem", color: "#0F766E", lineHeight: 1.6 }}>
                Warm, personal sharing usually works best. Use the message blocks below as a starting point, then make them sound like you.
              </p>
            </div>
          </div>
        </div>
      </SurfaceCard>

      <div className="grid gap-4 xl:grid-cols-2">
        {DOWNLOADABLE_SHARE_ASSETS.map((asset) => (
          <DownloadableAssetCard
            key={asset.id}
            asset={asset}
            selectedLinkLabel={activeLink?.label ?? "Main referral link"}
          />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {quickSharePacks.map((pack) => (
          <QuickSharePackCard
            key={pack.id}
            pack={pack}
            selectedLinkLabel={activeLink?.label ?? "Main referral link"}
          />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ResourceListCard
          title="Best places to share first"
          description="Start where trust is already high. Positives usually converts better through warm recommendations than broad cold promotion."
          items={[
            "A personal text or email to someone who already trusts you",
            "A newsletter, blog post, or creator page where you already have attention",
            "A webinar, podcast, or live conversation where you can recommend it naturally",
            "A bio link or evergreen page if you want one steady place to send people",
          ]}
        />
        <ResourceListCard
          title="Good source-tag ideas"
          description="Use source tags only when you want to compare placements inside FirstPromoter. Keep them short and easy to recognize later."
          items={[
            "email for a personal email send",
            "newsletter-april for a specific newsletter issue",
            "ig-bio for your Instagram bio link",
            "podcast-may for a spoken mention on a show",
            "webinar-followup for a post-event follow-up sequence",
          ]}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ResourceListCard
          title="Three good angles to lead with"
          description="These usually sound more natural than generic affiliate language."
          items={[
            "A short daily practice that fits into normal life",
            "A steady rhythm: daily audio, weekly principle, monthly theme",
            "Something calming and practical you actually return to",
          ]}
        />
        <ResourceListCard
          title="What to avoid when you share"
          description="Keeping the recommendation grounded tends to convert better and fits the Positives brand better too."
          items={[
            "Avoid hypey promises or dramatic transformation language",
            "Avoid making it sound like a course people need to complete",
            "Avoid copying generic sales copy word-for-word if a warmer version would sound more like you",
            "Avoid using source tags unless you actually want to compare placements later",
          ]}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ShareTemplateCard
          title="Email"
          description="For personal outreach or a thoughtful follow-up."
          blocks={emailSwipes}
          selectedLinkLabel={activeLink?.label ?? "Main referral link"}
        />
        <ShareTemplateCard
          title="Text / DM"
          description="For a quick warm share to someone who already trusts you."
          blocks={shareBlocks.slice(0, 2)}
          selectedLinkLabel={activeLink?.label ?? "Main referral link"}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ShareTemplateCard
          title="Social and creator copy"
          description="For public posts, blog mentions, or creator-style recommendations."
          blocks={shareBlocks.slice(2, 5)}
          selectedLinkLabel={activeLink?.label ?? "Main referral link"}
        />
        <ShareTemplateCard
          title="Live event and spoken mention"
          description="For webinars, podcasts, live trainings, or spoken recommendations."
          blocks={shareBlocks.slice(5)}
          selectedLinkLabel={activeLink?.label ?? "Main referral link"}
        />
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
            Use the email connected to your PayPal account. If PayPal needs any tax,
            confirmation, or verification details later, they will handle that in their own flow.
          </p>
          <p style={{ margin: "0.55rem 0 0", fontSize: "0.8rem", color: "#71717A", lineHeight: 1.55 }}>
            Need a refresher on payouts, prohibited behavior, or program rules?{" "}
            <Link
              href="/affiliate-program"
              target="_blank"
              rel="noreferrer"
              style={{ color: "#0F766E", fontWeight: 700, textDecoration: "underline" }}
            >
              Review the Affiliate Program Terms
              <span className="sr-only"> opens in a new tab</span>
            </Link>
            .
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
  trackedLinks,
  performance,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("link");
  const [loading, setLoading] = useState(false);
  const [enrolled, setEnrolled] = useState(isAffiliate);
  const [currentToken, setCurrentToken] = useState(token);
  const [copiedLink, setCopiedLink] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedPaypalEmail, setSavedPaypalEmail] = useState(initialPaypalEmail);
  const [paypalEmailDraft, setPaypalEmailDraft] = useState(initialPaypalEmail);
  const [paypalSaving, setPaypalSaving] = useState(false);
  const [paypalSaved, setPaypalSaved] = useState(false);
  const [paypalError, setPaypalError] = useState<string | null>(null);
  const [slugEditing, setSlugEditing] = useState(false);
  const [slugDraft, setSlugDraft] = useState(currentToken ?? "");
  const [slugSaving, setSlugSaving] = useState(false);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [slugSaved, setSlugSaved] = useState(false);
  const [slugConfirmed, setSlugConfirmed] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

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
    const result = await getReferralLinkAction(agreedToTerms);
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
  }, [agreedToTerms]);

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
    const result = await savePayPalEmailAction(paypalEmailDraft);
    setPaypalSaving(false);
    if ("error" in result) {
      setPaypalError(result.error);
      return;
    }
    setSavedPaypalEmail(paypalEmailDraft.trim().toLowerCase());
    setPaypalSaved(true);
    track("affiliate_payout_details_saved", { source_path: "/account/affiliate" });
    window.setTimeout(() => setPaypalSaved(false), 4000);
  }, [paypalEmailDraft]);

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

  if (enrolled && !savedPaypalEmail.trim()) {
    return (
      <PayoutSetupStep
        paypalEmail={paypalEmailDraft}
        onPaypalChange={setPaypalEmailDraft}
        onSave={async () => {
          await handleSavePayPal();
        }}
        saving={paypalSaving}
        error={paypalError}
      />
    );
  }

  if (!enrolled) {
    return (
      <EnrollScreen
        onEnroll={handleEnroll}
        loading={loading}
        error={error}
        agreedToTerms={agreedToTerms}
        onAgreementChange={setAgreedToTerms}
      />
    );
  }

  if (!referralLink) {
    return (
      <EnrollScreen
        onEnroll={handleEnroll}
        loading={loading}
        error={error}
        agreedToTerms={agreedToTerms}
        onAgreementChange={setAgreedToTerms}
      />
    );
  }

  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", padding: "1.75rem 1rem 5rem" }}>
      <div className="mb-8 flex flex-col gap-5">
        <div style={{ maxWidth: 760 }}>
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
          className="flex gap-2 overflow-x-auto rounded-[1.25rem] border border-border bg-white/88 p-1.5 shadow-[0_14px_30px_rgba(15,23,42,0.05)]"
          style={{
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
                aria-pressed={active}
                className="min-w-fit lg:min-w-0 lg:flex-1"
                style={{
                  flexShrink: 0,
                  border: active ? "1px solid rgba(46,196,182,0.22)" : "1px solid transparent",
                  borderRadius: "1rem",
                  padding: "0.85rem 1rem",
                  background: active
                    ? "linear-gradient(180deg, rgba(46,196,182,0.14) 0%, rgba(68,168,216,0.08) 100%)"
                    : "transparent",
                  color: active ? "#0F766E" : "#52525B",
                  fontWeight: 700,
                  cursor: "pointer",
                  textAlign: "center",
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
        />
      ) : null}

      {activeTab === "performance" ? <PerformanceTab performance={performance} /> : null}
      {activeTab === "share" ? <ShareTab referralLink={referralLink} trackedLinks={trackedLinks} /> : null}
      {activeTab === "earnings" ? (
        <EarningsTab
          performance={performance}
          commissions={commissions}
          payouts={payouts}
          paypalEmail={paypalEmailDraft}
          onPaypalChange={setPaypalEmailDraft}
          onSavePayPal={() => void handleSavePayPal()}
          paypalSaving={paypalSaving}
          paypalSaved={paypalSaved}
          paypalError={paypalError}
        />
      ) : null}
    </div>
  );
}
