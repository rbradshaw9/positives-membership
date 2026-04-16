/**
 * app/admin/page.tsx
 * Admin overview — brand-styled stat cards, feature tiles, and
 * a live readiness banner that surfaces upcoming content gaps.
 */

import Link from "next/link";
import { requireAdminPermission } from "@/lib/auth/require-admin";
import { getContentReadiness } from "@/lib/queries/get-content-readiness";
import { getAdminMemberOpsSnapshot } from "@/lib/queries/get-admin-members";
import type { ReadinessAlert } from "@/lib/queries/get-content-readiness";

export const metadata = {
  title: "Admin Overview — Positives",
};

const ALERT_STYLES: Record<
  ReadinessAlert["level"],
  { bg: string; border: string; color: string; icon: string }
> = {
  critical: {
    bg: "rgba(239,68,68,0.06)",
    border: "rgba(239,68,68,0.18)",
    color: "#ef4444",
    icon: "🔴",
  },
  warning: {
    bg: "rgba(245,158,11,0.06)",
    border: "rgba(245,158,11,0.18)",
    color: "#d97706",
    icon: "🟡",
  },
  info: {
    bg: "rgba(68,168,216,0.06)",
    border: "rgba(68,168,216,0.18)",
    color: "#44a8d8",
    icon: "🔵",
  },
};

const tiles = [
  {
    href: "/admin/months",
    icon: "📅",
    iconBg:
      "linear-gradient(135deg, rgba(139,92,246,0.12), rgba(68,168,216,0.12))",
    title: "Monthly Setup",
    description:
      "Create and manage monthly content — masterclass, weekly reflections, and daily audio — all in one workspace.",
    status: "Live",
  },
  {
    href: "/admin/courses",
    icon: "📚",
    iconBg:
      "linear-gradient(135deg, rgba(46,196,182,0.12), rgba(68,168,216,0.12))",
    title: "Courses",
    description:
      "Build structured learning courses with modules and sessions. Import from LearnDash.",
    status: "Live",
  },
  {
    href: "/admin/content/calendar",
    icon: "🗓",
    iconBg:
      "linear-gradient(135deg, rgba(245,158,11,0.12), rgba(239,68,68,0.08))",
    title: "Calendar",
    description:
      "Visual calendar view of scheduled content — see what's live on any given day.",
    status: "Live",
  },
  {
    href: "/admin/members",
    icon: "👥",
    iconBg:
      "linear-gradient(135deg, rgba(68,168,216,0.12), rgba(46,196,182,0.12))",
    title: "Members",
    description:
      "View member profiles, subscription tier, practice streak, and recent activity.",
    status: "Live",
  },
  {
    href: "/admin/ingestion",
    icon: "📥",
    iconBg:
      "linear-gradient(135deg, rgba(100,116,139,0.10), rgba(148,163,184,0.08))",
    title: "Ingestion Review",
    description:
      "Review AI-generated titles and descriptions for incoming audio from Google Drive.",
    status: "Planned",
  },
];

export default async function AdminPage() {
  await requireAdminPermission("members.read");

  const [alerts, memberOps] = await Promise.all([
    getContentReadiness(),
    getAdminMemberOpsSnapshot(),
  ]);

  const quickActions = [
    {
      href: "/admin/content/calendar",
      title: "Review content gaps",
      detail:
        alerts.length > 0
          ? `${alerts.length} readiness alert${alerts.length === 1 ? "" : "s"} surfaced today`
          : "No immediate content blockers surfaced today",
    },
    {
      href: "/admin/members?status=past_due",
      title: "Support past-due members",
      detail:
        memberOps.pastDue > 0
          ? `${memberOps.pastDue} member${memberOps.pastDue === 1 ? "" : "s"} need billing attention`
          : "No members are currently marked past due",
    },
    {
      href: "/admin/members?billing=missing",
      title: "Check missing Stripe links",
      detail:
        memberOps.missingStripe > 0
          ? `${memberOps.missingStripe} member${memberOps.missingStripe === 1 ? "" : "s"} lack a Stripe customer link`
          : "All current members appear to have Stripe linkage",
    },
    {
      href: "/admin/members?password=missing",
      title: "Review password setup",
      detail:
        memberOps.missingPassword > 0
          ? `${memberOps.missingPassword} member${memberOps.missingPassword === 1 ? "" : "s"} still rely on magic links only`
          : "No current members are missing password setup",
    },
  ];

  return (
    <div>
      {/* Page header */}
      <div className="admin-page-header">
        <p className="admin-page-header__eyebrow">Positives Platform</p>
        <h1 className="admin-page-header__title">Admin Overview</h1>
        <p className="admin-page-header__subtitle">
          Manage content, members, and platform settings.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(11rem, 1fr))",
          gap: "0.875rem",
          marginBottom: "1.5rem",
        }}
      >
        {[
          {
            icon: "👥",
            value: memberOps.total,
            label: "Total members",
            sub: `${memberOps.active} active · ${memberOps.trialing} trialing`,
          },
          {
            icon: "🧾",
            value: memberOps.pastDue,
            label: "Past due",
            sub:
              memberOps.pastDue > 0
                ? "Needs billing follow-up"
                : "No billing issues surfaced",
          },
          {
            icon: "🔗",
            value: memberOps.missingStripe,
            label: "Missing Stripe link",
            sub:
              memberOps.missingStripe > 0
                ? "Check signup/webhook trail"
                : "Billing linkage looks healthy",
          },
          {
            icon: "🔐",
            value: memberOps.missingPassword,
            label: "No password set",
            sub:
              memberOps.missingPassword > 0
                ? "Still magic-link only"
                : "Members have password access",
          },
        ].map((stat) => (
          <div key={stat.label} className="admin-stat-card">
            <div className="admin-stat-card__icon">{stat.icon}</div>
            <div className="admin-stat-card__value">{stat.value}</div>
            <div className="admin-stat-card__label">{stat.label}</div>
            <div className="admin-stat-card__delta">{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Readiness Alerts ─────────────────────────────────────────────── */}
      {alerts.length > 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
            marginBottom: "1.5rem",
          }}
        >
          <p
            style={{
              fontSize: "0.6875rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--color-muted-fg)",
              marginBottom: "0.25rem",
            }}
          >
            Content readiness
          </p>
          {alerts.map((alert, i) => {
            const style = ALERT_STYLES[alert.level];
            return (
              <Link
                key={i}
                href={alert.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.625rem",
                  padding: "0.75rem 1rem",
                  background: style.bg,
                  border: `1px solid ${style.border}`,
                  borderRadius: "0.625rem",
                  fontSize: "0.8125rem",
                  color: style.color,
                  textDecoration: "none",
                  transition: "opacity 120ms ease",
                }}
              >
                <span>{style.icon}</span>
                <span style={{ flex: 1 }}>{alert.message}</span>
                <span
                  style={{
                    fontSize: "0.75rem",
                    opacity: 0.6,
                  }}
                >
                  →
                </span>
              </Link>
            );
          })}
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "0.625rem",
            marginBottom: "1.5rem",
            padding: "0.875rem 1rem",
            borderRadius: "0.875rem",
            border: "1px solid rgba(34,197,94,0.16)",
            background: "rgba(34,197,94,0.06)",
            color: "#15803d",
          }}
        >
          <span style={{ fontSize: "1rem", lineHeight: 1 }}>✓</span>
          <div>
            <p
              style={{
                fontSize: "0.8125rem",
                fontWeight: 700,
                marginBottom: "0.2rem",
              }}
            >
              No immediate content readiness blockers surfaced today
            </p>
            <p style={{ fontSize: "0.75rem", opacity: 0.9 }}>
              The calendar and month workspaces still matter, but there are no
              urgent missing-content alerts in the current audit window.
            </p>
          </div>
        </div>
      )}

      <div className="admin-section" style={{ marginBottom: "1.5rem" }}>
        <div className="admin-section__header">
          <p className="admin-section__title">Operational focus</p>
        </div>
        <div className="admin-section__body">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(15rem, 1fr))",
              gap: "0.875rem",
            }}
          >
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="admin-feature-tile"
                style={{ padding: "1rem 1.125rem", gap: "0.5rem" }}
              >
                <p className="admin-feature-tile__title">{action.title}</p>
                <p className="admin-feature-tile__desc">{action.detail}</p>
                <span className="admin-feature-tile__status admin-feature-tile__status--live">
                  Open
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: "1rem",
        }}
      >
        {tiles.map(({ href, icon, iconBg, title, description, status }) => (
          <a key={href} href={href} className="admin-feature-tile">
            <div
              className="admin-feature-tile__icon"
              style={{ background: iconBg }}
            >
              {icon}
            </div>
            <div>
              <p className="admin-feature-tile__title">{title}</p>
              <p
                className="admin-feature-tile__desc"
                style={{ marginTop: "0.375rem" }}
              >
                {description}
              </p>
            </div>
            <span
              className={`admin-feature-tile__status admin-feature-tile__status--${
                status === "Live" ? "live" : "planned"
              }`}
            >
              {status}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
