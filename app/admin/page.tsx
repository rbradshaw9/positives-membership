/**
 * app/admin/page.tsx
 * Admin overview — redesigned with brand identity, stat cards, feature tiles.
 */
export const metadata = {
  title: "Admin Overview — Positives",
};

const tiles = [
  {
    href: "/admin/content",
    icon: "🎧",
    iconBg: "linear-gradient(135deg, rgba(46,196,182,0.12), rgba(68,168,216,0.12))",
    title: "Content Library",
    description:
      "Create and publish daily audio, weekly principles, and monthly themes. Control publish status and tier gating.",
    status: "Live",
  },
  {
    href: "/admin/months",
    icon: "📅",
    iconBg: "linear-gradient(135deg, rgba(139,92,246,0.12), rgba(68,168,216,0.12))",
    title: "Months",
    description:
      "Monthly workspace — assign daily audio, manage fill rate, publish month packages.",
    status: "Live",
  },
  {
    href: "/admin/members",
    icon: "👥",
    iconBg: "linear-gradient(135deg, rgba(68,168,216,0.12), rgba(46,196,182,0.12))",
    title: "Members",
    description:
      "View member profiles, subscription tier, practice streak, and recent activity.",
    status: "Live",
  },
  {
    href: "/admin/content/calendar",
    icon: "🗓",
    iconBg: "linear-gradient(135deg, rgba(245,158,11,0.12), rgba(239,68,68,0.08))",
    title: "Calendar",
    description:
      "Visual calendar view of scheduled content — see what's live on any given day.",
    status: "Live",
  },
  {
    href: "/admin/ingestion",
    icon: "📥",
    iconBg: "linear-gradient(135deg, rgba(100,116,139,0.10), rgba(148,163,184,0.08))",
    title: "Ingestion Review",
    description:
      "Review AI-generated titles and descriptions for incoming audio from Google Drive.",
    status: "Planned",
  },
];

export default function AdminPage() {
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

      {/* Quick links */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: "1rem",
        }}
      >
        {tiles.map(({ href, icon, iconBg, title, description, status }) => (
          <a
            key={href}
            href={href}
            className="admin-feature-tile"
          >
            <div
              className="admin-feature-tile__icon"
              style={{ background: iconBg }}
            >
              {icon}
            </div>
            <div>
              <p className="admin-feature-tile__title">{title}</p>
              <p className="admin-feature-tile__desc" style={{ marginTop: "0.375rem" }}>
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
