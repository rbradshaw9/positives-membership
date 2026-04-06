/**
 * app/admin/page.tsx
 * Admin overview — brand-styled stat cards, feature tiles, and
 * a live readiness banner that surfaces upcoming content gaps.
 */

import Link from "next/link";
import { getContentReadiness } from "@/lib/queries/get-content-readiness";
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
  const alerts = await getContentReadiness();

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

      {/* ── Readiness Alerts ─────────────────────────────────────────────── */}
      {alerts.length > 0 && (
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
      )}

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
