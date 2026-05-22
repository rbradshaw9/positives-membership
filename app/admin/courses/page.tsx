import Link from "next/link";
import { getAdminClient } from "@/lib/supabase/admin";
import { createCourse } from "./actions";
import { LearnDashImportPanel } from "./LearnDashImportPanel";

export const metadata = {
  title: "Courses — Positives Admin",
};

type CourseRow = {
  id: string;
  title: string;
  slug: string | null;
  description: string | null;
  status: string;
  sort_order: number;
  created_at: string;
  modules: { id: string; sessions: { id: string }[] }[];
  entitlements: { id: string; status: string }[];
};

const STATUS_BADGE: Record<string, string> = {
  published: "admin-badge admin-badge--published",
  draft: "admin-badge admin-badge--draft",
  archived: "admin-badge admin-badge--archived",
};

export default async function AdminCoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string; q?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const supabase = getAdminClient();

  const { data: courses } = await supabase
    .from("course")
    .select(
      `id, title, slug, description, status, sort_order, created_at,
       modules:course_module(id, sessions:course_session(id)),
       entitlements:course_entitlement(id, status)`
    )
    .order("sort_order", { ascending: true });

  const allRows = (courses ?? []) as unknown as CourseRow[];
  const query = (sp.q ?? "").trim().toLowerCase();
  const statusFilter = sp.status ?? "all";
  const rows = allRows.filter((course) => {
    if (statusFilter !== "all" && course.status !== statusFilter) return false;
    if (
      query &&
      !course.title.toLowerCase().includes(query) &&
      !(course.description ?? "").toLowerCase().includes(query)
    ) {
      return false;
    }
    return true;
  });
  const statusCounts = {
    all: allRows.length,
    published: allRows.filter((c) => c.status === "published").length,
    draft: allRows.filter((c) => c.status === "draft").length,
    archived: allRows.filter((c) => c.status === "archived").length,
  };

  return (
    <div style={{ maxWidth: "60rem" }}>
      {/* Page header */}
      <div className="admin-page-header">
        <div>
          <p className="admin-page-header__eyebrow">Content</p>
          <h1 className="admin-page-header__title">Courses</h1>
          <p className="admin-page-header__subtitle">
            Build structured learning courses with modules and individual
            sessions. Import from LearnDash.
          </p>
        </div>
      </div>

      {/* Success / error banners */}
      {sp.success && (
        <div className="admin-banner admin-banner--success">
          {sp.success === "deleted" ? "Course deleted." : "Done."}
        </div>
      )}
      {sp.error && (
        <div className="admin-banner admin-banner--error">
          {sp.error === "title_required"
            ? "Title is required."
            : "Something went wrong."}
        </div>
      )}

      {/* ── Filters ── */}
      {allRows.length > 0 && (
        <form
          method="get"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.5rem",
            marginBottom: "1rem",
            alignItems: "center",
          }}
        >
          <input
            type="search"
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder="Search courses…"
            className="admin-input"
            style={{ flex: "1 1 14rem", minWidth: "10rem" }}
          />
          <select name="status" defaultValue={statusFilter} className="admin-select" style={{ width: "auto" }}>
            <option value="all">All statuses ({statusCounts.all})</option>
            <option value="published">Published ({statusCounts.published})</option>
            <option value="draft">Draft ({statusCounts.draft})</option>
            <option value="archived">Archived ({statusCounts.archived})</option>
          </select>
          <button type="submit" className="admin-btn admin-btn--outline">
            Filter
          </button>
          {(query || statusFilter !== "all") && (
            <Link href="/admin/courses" className="admin-btn admin-btn--ghost">
              Clear
            </Link>
          )}
          <span style={{ fontSize: "0.75rem", color: "var(--color-muted-fg)", marginLeft: "auto" }}>
            {rows.length} of {allRows.length} course{allRows.length !== 1 ? "s" : ""}
          </span>
        </form>
      )}

      {/* ── Course List ── */}
      {rows.length > 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
            marginBottom: "2rem",
          }}
        >
          {rows.map((course) => {
            const moduleCount = course.modules?.length ?? 0;
            const sessionCount =
              course.modules?.reduce(
                (sum, m) => sum + (m.sessions?.length ?? 0),
                0
              ) ?? 0;

            return (
              <article
                key={course.id}
                className="surface-card"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  padding: "1rem 1.25rem",
                  borderRadius: "0.625rem",
                  transition: "transform 100ms ease, box-shadow 100ms ease",
                }}
              >
                {/* Icon */}
                <div
                  style={{
                    width: "2.25rem",
                    height: "2.25rem",
                    borderRadius: "0.5rem",
                    background:
                      "linear-gradient(135deg, rgba(46,196,182,0.12), rgba(68,168,216,0.12))",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1rem",
                    flexShrink: 0,
                  }}
                >
                  📚
                </div>

                {/* Title and description */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Link
                    href={`/admin/courses/${course.id}`}
                    style={{
                      fontSize: "0.875rem",
                      fontWeight: 700,
                      color: "var(--color-foreground)",
                      letterSpacing: "-0.01em",
                      textDecoration: "none",
                    }}
                  >
                    {course.title}
                  </Link>
                  {course.description && (
                    <p
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--color-muted-fg)",
                        marginTop: "0.125rem",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {course.description}
                    </p>
                  )}
                </div>

                {/* Stats */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "1rem",
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.6875rem",
                      color: "var(--color-muted-fg)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {moduleCount} module{moduleCount !== 1 ? "s" : ""} ·{" "}
                    {sessionCount} session{sessionCount !== 1 ? "s" : ""}
                  </span>
                  <span
                    style={{
                      fontSize: "0.6875rem",
                      color: "var(--color-muted-fg)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {(course.entitlements ?? []).filter((row) => row.status === "active").length} enrolled
                  </span>
                  <span
                    className={
                      STATUS_BADGE[course.status] ?? STATUS_BADGE.draft
                    }
                  >
                    {course.status === "published"
                      ? "Published"
                      : course.status === "archived"
                        ? "Archived"
                        : "Draft"}
                  </span>
                  <Link className="admin-btn admin-btn--ghost" href={`/admin/courses/${course.id}`}>
                    Edit
                  </Link>
                  <Link className="admin-btn admin-btn--outline" href={`/admin/courses/${course.id}/enrollments`}>
                    Enrollments
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div
          className="surface-card"
          style={{
            padding: "2.5rem 2rem",
            textAlign: "center",
            marginBottom: "2rem",
          }}
        >
          <p
            style={{
              fontSize: "2rem",
              marginBottom: "0.5rem",
            }}
          >
            📚
          </p>
          <p
            style={{
              fontSize: "0.875rem",
              fontWeight: 600,
              color: "var(--color-foreground)",
            }}
          >
            {allRows.length > 0 ? "No courses match these filters" : "No courses yet"}
          </p>
          <p
            style={{
              fontSize: "0.8125rem",
              color: "var(--color-muted-fg)",
              marginTop: "0.375rem",
            }}
          >
            {allRows.length > 0
              ? "Try a different search or status filter."
              : "Create one below or import from LearnDash."}
          </p>
        </div>
      )}

      {/* ── Create Course ── */}
      <div className="admin-section" style={{ marginBottom: "1.5rem" }}>
        <div className="admin-section__header">
          <span className="admin-section__title">➕ Create New Course</span>
        </div>
        <div className="admin-section__body">
          <form action={createCourse}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0.75rem",
              }}
            >
              <div
                className="admin-form-field"
                style={{ gridColumn: "1 / -1" }}
              >
                <label className="admin-label">
                  Course Title{" "}
                  <span className="admin-label__required">*</span>
                </label>
                <input
                  name="title"
                  type="text"
                  required
                  placeholder="e.g. Emotional Resilience Masterclass"
                  className="admin-input"
                />
              </div>
              <div className="admin-form-field" style={{ gridColumn: "1 / -1" }}>
                <label className="admin-label">Description</label>
                <textarea
                  name="description"
                  rows={2}
                  placeholder="What does this course teach?"
                  className="admin-textarea admin-textarea--no-resize"
                />
              </div>
              <div className="admin-form-field">
                <label className="admin-label">Status</label>
                <select
                  name="status"
                  defaultValue="draft"
                  className="admin-select"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              className="admin-btn admin-btn--primary"
              style={{ marginTop: "0.75rem" }}
            >
              Create Course
            </button>
          </form>
        </div>
      </div>

      {/* ── LearnDash Import ── */}
      <LearnDashImportPanel />
    </div>
  );
}
