import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { createCourse } from "./actions";
import { LearnDashImportPanel } from "./LearnDashImportPanel";

/**
 * app/admin/courses/page.tsx
 * Course catalog — list all courses with module/session counts.
 * Includes inline Create Course form and LearnDash import panel.
 */

export const metadata = {
  title: "Courses — Positives Admin",
};

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

type CourseRow = {
  id: string;
  title: string;
  slug: string | null;
  description: string | null;
  status: string;
  sort_order: number;
  created_at: string;
  modules: { id: string; sessions: { id: string }[] }[];
};

const STATUS_BADGE: Record<string, string> = {
  published: "admin-badge admin-badge--published",
  draft: "admin-badge admin-badge--draft",
  archived: "admin-badge admin-badge--archived",
};

export default async function AdminCoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const supabase = adminClient();

  const { data: courses } = await supabase
    .from("course")
    .select(
      `id, title, slug, description, status, sort_order, created_at,
       modules:course_module(id, sessions:course_session(id))`
    )
    .order("sort_order", { ascending: true });

  const rows = (courses ?? []) as unknown as CourseRow[];

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
              <Link
                key={course.id}
                href={`/admin/courses/${course.id}`}
                className="surface-card"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  padding: "1rem 1.25rem",
                  textDecoration: "none",
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
                  <p
                    style={{
                      fontSize: "0.875rem",
                      fontWeight: 700,
                      color: "var(--color-foreground)",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {course.title}
                  </p>
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
                    className={
                      STATUS_BADGE[course.status] ?? STATUS_BADGE.draft
                    }
                  >
                    {course.status === "published" ? "Published" : "Draft"}
                  </span>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--color-muted-fg)",
                    }}
                  >
                    →
                  </span>
                </div>
              </Link>
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
            No courses yet
          </p>
          <p
            style={{
              fontSize: "0.8125rem",
              color: "var(--color-muted-fg)",
              marginTop: "0.375rem",
            }}
          >
            Create one below or import from LearnDash.
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
