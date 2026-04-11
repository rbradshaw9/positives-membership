import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Content — Positives Admin",
};

type AdminContentSearchParams = Promise<{
  type?: string;
  publish_date?: string;
  week_start?: string;
  month_year?: string;
}>;

const contentSurfaces = [
  {
    href: "/admin/months",
    title: "Monthly Setup",
    description:
      "The main workspace for planning a month: theme, weekly reflections, and daily audio coverage.",
    badge: "Primary workspace",
  },
  {
    href: "/admin/content/calendar",
    title: "Content Calendar",
    description:
      "See daily, weekly, and monthly coverage on the calendar so publishing gaps are easy to spot.",
    badge: "Scheduling view",
  },
  {
    href: "/admin/content/new",
    title: "Create Standalone Content",
    description:
      "Create a Daily, Weekly, Monthly, or Coaching record directly when you are working outside a month workspace.",
    badge: "Direct create",
  },
] as const;

const quickCreateLinks = [
  {
    href: "/admin/content/new?type=daily_audio",
    label: "New daily audio",
  },
  {
    href: "/admin/content/new?type=weekly_principle",
    label: "New weekly reflection",
  },
  {
    href: "/admin/content/new?type=monthly_theme",
    label: "New monthly theme",
  },
  {
    href: "/admin/content/new?type=coaching_call",
    label: "New coaching call",
  },
] as const;

export default async function AdminContentPage({
  searchParams,
}: {
  searchParams: AdminContentSearchParams;
}) {
  const resolvedSearchParams = await searchParams;

  const createParams = new URLSearchParams();
  const forwardedKeys = ["type", "publish_date", "week_start", "month_year"] as const;

  for (const key of forwardedKeys) {
    const value = resolvedSearchParams[key];
    if (value) {
      createParams.set(key, value);
    }
  }

  if (createParams.toString()) {
    redirect(`/admin/content/new?${createParams.toString()}`);
  }

  return (
    <div style={{ maxWidth: "64rem" }}>
      <div className="admin-page-header">
        <p className="admin-page-header__eyebrow">Content</p>
        <h1 className="admin-page-header__title">Content Workspace</h1>
        <p className="admin-page-header__subtitle">
          Use Monthly Setup for the normal publishing rhythm, or jump straight into a specific
          content record when you need a faster path.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        {contentSurfaces.map((surface) => (
          <Link key={surface.href} href={surface.href} className="admin-feature-tile">
            <div>
              <p className="admin-feature-tile__title">{surface.title}</p>
              <p className="admin-feature-tile__desc" style={{ marginTop: "0.375rem" }}>
                {surface.description}
              </p>
            </div>
            <span className="admin-feature-tile__status admin-feature-tile__status--live">
              {surface.badge}
            </span>
          </Link>
        ))}
      </div>

      <div className="admin-form-card">
        <div style={{ marginBottom: "1rem" }}>
          <p className="admin-form-section__label">Quick create</p>
          <p className="admin-page-header__subtitle" style={{ marginTop: "0.375rem" }}>
            Useful when the calendar or another admin surface sends you here with a specific
            creation intent.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          {quickCreateLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="admin-btn"
              style={{ textDecoration: "none" }}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
