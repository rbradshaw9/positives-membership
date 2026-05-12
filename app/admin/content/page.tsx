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
    title: "Practice Content",
    description:
      "The single workspace for planning and editing monthly themes, weekly principles, and daily audio.",
    badge: "Primary workspace",
  },
  {
    href: "/admin/content/calendar",
    title: "Practice Calendar",
    description:
      "Scan daily, weekly, and monthly coverage, then open the matching month workspace to make changes.",
    badge: "Scheduling view",
  },
  {
    href: "/admin/content/new?type=coaching_call",
    title: "Coaching Content",
    description:
      "Create or edit coaching records that do not belong to the daily, weekly, and monthly practice calendar.",
    badge: "Separate flow",
  },
] as const;

const quickCreateLinks = [
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
    const contentType = resolvedSearchParams.type;
    if (
      contentType === "daily_audio" ||
      contentType === "weekly_principle" ||
      contentType === "monthly_theme"
    ) {
      const monthYear =
        resolvedSearchParams.month_year ??
        resolvedSearchParams.publish_date?.slice(0, 7) ??
        resolvedSearchParams.week_start?.slice(0, 7);
      const monthParams = new URLSearchParams();
      if (monthYear) monthParams.set("month_year", monthYear);
      monthParams.set("from", "content");
      redirect(`/admin/months?${monthParams.toString()}`);
    }

    redirect(`/admin/content/new?${createParams.toString()}`);
  }

  return (
    <div style={{ maxWidth: "64rem" }}>
      <div className="admin-page-header">
        <p className="admin-page-header__eyebrow">Content</p>
        <h1 className="admin-page-header__title" style={{ textWrap: "balance" }}>
          Content Workspace
        </h1>
        <p className="admin-page-header__subtitle">
          Daily, weekly, and monthly practice content now lives in one place: Practice Content.
          Coaching content stays separate because it follows a different workflow.
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
            Daily, weekly, and monthly creation happens from the month workspace so the practice
            calendar stays organized.
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
