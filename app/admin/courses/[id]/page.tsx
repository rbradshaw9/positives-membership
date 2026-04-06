import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import {
  updateCourse,
  deleteCourse,
  createModule,
  deleteModule,
  createSession,
  deleteSession,
} from "../actions";

/**
 * app/admin/courses/[id]/page.tsx
 * Course editor — manage modules and sessions for a single course.
 */

export const metadata = {
  title: "Edit Course — Positives Admin",
};

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ success?: string; error?: string }>;

type SessionRow = {
  id: string;
  title: string;
  description: string | null;
  body: string | null;
  video_url: string | null;
  duration_seconds: number | null;
  sort_order: number;
};

type ModuleRow = {
  id: string;
  title: string;
  description: string | null;
  sort_order: number;
  course_session: SessionRow[];
};

type CourseRow = {
  id: string;
  title: string;
  slug: string | null;
  description: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  course_module: ModuleRow[];
};

const STATUS_BADGE: Record<string, string> = {
  published: "admin-badge admin-badge--published",
  draft: "admin-badge admin-badge--draft",
};

export default async function CourseEditorPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const supabase = adminClient();

  const { data: course, error } = await supabase
    .from("course")
    .select(
      `id, title, slug, description, status, admin_notes, created_at, updated_at,
       course_module(id, title, description, sort_order,
         course_session(id, title, description, body, video_url, duration_seconds, sort_order)
       )`
    )
    .eq("id", id)
    .single();

  if (error || !course) return notFound();

  const c = course as unknown as CourseRow;
  const modules = (c.course_module ?? []).sort(
    (a, b) => a.sort_order - b.sort_order
  );

  const totalSessions = modules.reduce(
    (sum, m) => sum + (m.course_session?.length ?? 0),
    0
  );

  return (
    <div style={{ maxWidth: "60rem" }}>
      {/* Breadcrumb */}
      <Link href="/admin/courses" className="admin-back-link">
        ← Courses
      </Link>

      {/* Banners */}
      {sp.success && (
        <div className="admin-banner admin-banner--success">
          {sp.success === "updated"
            ? "Course saved."
            : sp.success === "module_created"
              ? "Module created."
              : sp.success === "module_deleted"
                ? "Module deleted."
                : sp.success === "session_created"
                  ? "Session created."
                  : sp.success === "session_deleted"
                    ? "Session deleted."
                    : "Done."}
        </div>
      )}
      {sp.error && (
        <div className="admin-banner admin-banner--error">
          {sp.error === "title_required"
            ? "Title is required."
            : "Something went wrong."}
        </div>
      )}

      {/* ─── Header ─── */}
      <div className="admin-page-header admin-page-header--split">
        <div>
          <p className="admin-page-header__eyebrow">Course Editor</p>
          <h1 className="admin-page-header__title">{c.title}</h1>
          <div className="admin-month-status-row">
            <span className={STATUS_BADGE[c.status] ?? STATUS_BADGE.draft}>
              {c.status === "published" ? "Published" : "Draft"}
            </span>
            <span className="admin-month-year-label">
              {modules.length} module{modules.length !== 1 ? "s" : ""} ·{" "}
              {totalSessions} session{totalSessions !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <div className="admin-page-header__actions">
          <form action={deleteCourse}>
            <input type="hidden" name="id" value={c.id} />
            <button
              type="submit"
              className="admin-btn"
              style={{
                background: "rgba(239,68,68,0.08)",
                color: "#ef4444",
                border: "1px solid rgba(239,68,68,0.2)",
              }}
            >
              Delete Course
            </button>
          </form>
        </div>
      </div>

      {/* ─── Course Details ─── */}
      <div className="admin-section" style={{ marginBottom: "1.5rem" }}>
        <div className="admin-section__header">
          <span className="admin-section__title">⚙️ Course Details</span>
        </div>
        <div className="admin-section__body">
          <form action={updateCourse}>
            <input type="hidden" name="id" value={c.id} />

            <div className="admin-form-field">
              <label className="admin-label">
                Title <span className="admin-label__required">*</span>
              </label>
              <input
                name="title"
                type="text"
                required
                defaultValue={c.title}
                className="admin-input"
              />
            </div>

            <div className="admin-form-grid-2" style={{ marginTop: "0.75rem" }}>
              <div className="admin-form-field">
                <label className="admin-label">Description</label>
                <textarea
                  name="description"
                  rows={3}
                  defaultValue={c.description ?? ""}
                  className="admin-textarea admin-textarea--no-resize"
                />
              </div>
              <div className="admin-form-field">
                <label className="admin-label">Status</label>
                <select
                  name="status"
                  defaultValue={c.status}
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
              Save Course
            </button>
          </form>
        </div>
      </div>

      {/* ─── Modules & Sessions ─── */}
      {modules.map((mod) => {
        const sessions = (mod.course_session ?? []).sort(
          (a, b) => a.sort_order - b.sort_order
        );

        return (
          <div
            key={mod.id}
            className="admin-section"
            style={{ marginBottom: "1rem" }}
          >
            <div className="admin-section__header">
              <span className="admin-section__title">
                📦 {mod.title}
              </span>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <span
                  style={{
                    fontSize: "0.6875rem",
                    color: "var(--color-muted-fg)",
                  }}
                >
                  {sessions.length} session{sessions.length !== 1 ? "s" : ""}
                </span>
                <form action={deleteModule}>
                  <input type="hidden" name="module_id" value={mod.id} />
                  <input type="hidden" name="course_id" value={c.id} />
                  <button
                    type="submit"
                    style={{
                      fontSize: "0.6875rem",
                      color: "rgba(239,68,68,0.6)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                    }}
                    title="Delete module"
                  >
                    ✕
                  </button>
                </form>
              </div>
            </div>

            <div className="admin-section__body" style={{ padding: 0 }}>
              {/* Session list */}
              {sessions.map((sess, si) => (
                <div
                  key={sess.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.625rem 1.25rem",
                    borderBottom: "1px solid var(--color-border)",
                    gap: "0.75rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.625rem",
                      minWidth: 0,
                      flex: 1,
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.6875rem",
                        color: "var(--color-muted-fg)",
                        fontVariantNumeric: "tabular-nums",
                        minWidth: "1.5rem",
                      }}
                    >
                      {si + 1}.
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: "0.8125rem",
                          fontWeight: 600,
                          color: "var(--color-foreground)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {sess.title}
                      </p>
                      {sess.description && (
                        <p
                          style={{
                            fontSize: "0.6875rem",
                            color: "var(--color-muted-fg)",
                            marginTop: "0.125rem",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {sess.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      flexShrink: 0,
                    }}
                  >
                    {sess.duration_seconds && (
                      <span
                        style={{
                          fontSize: "0.6875rem",
                          color: "var(--color-muted-fg)",
                        }}
                      >
                        {Math.round(sess.duration_seconds / 60)}m
                      </span>
                    )}
                    <form action={deleteSession}>
                      <input
                        type="hidden"
                        name="session_id"
                        value={sess.id}
                      />
                      <input
                        type="hidden"
                        name="course_id"
                        value={c.id}
                      />
                      <button
                        type="submit"
                        style={{
                          fontSize: "0.6875rem",
                          color: "rgba(239,68,68,0.5)",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: 0,
                        }}
                        title="Delete session"
                      >
                        ✕
                      </button>
                    </form>
                  </div>
                </div>
              ))}

              {/* Inline add session */}
              <div
                style={{
                  padding: "0.75rem 1.25rem",
                }}
              >
                <form
                  action={createSession}
                  style={{
                    display: "flex",
                    alignItems: "flex-end",
                    gap: "0.5rem",
                  }}
                >
                  <input type="hidden" name="module_id" value={mod.id} />
                  <input type="hidden" name="course_id" value={c.id} />
                  <div style={{ flex: 1 }}>
                    <input
                      name="title"
                      type="text"
                      required
                      placeholder="New session title…"
                      className="admin-input"
                      style={{ fontSize: "0.8125rem" }}
                    />
                  </div>
                  <button
                    type="submit"
                    className="admin-btn admin-btn--primary"
                    style={{
                      fontSize: "0.75rem",
                      padding: "0.5rem 0.75rem",
                      whiteSpace: "nowrap",
                    }}
                  >
                    + Session
                  </button>
                </form>
              </div>
            </div>
          </div>
        );
      })}

      {/* ── Add Module ── */}
      <div className="admin-section" style={{ marginBottom: "1.5rem" }}>
        <div className="admin-section__header">
          <span className="admin-section__title">➕ Add Module</span>
        </div>
        <div className="admin-section__body">
          <form
            action={createModule}
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: "0.5rem",
            }}
          >
            <input type="hidden" name="course_id" value={c.id} />
            <div style={{ flex: 1 }}>
              <label className="admin-label">Module Title</label>
              <input
                name="title"
                type="text"
                required
                placeholder="e.g. Week 1: Foundations"
                className="admin-input"
              />
            </div>
            <button
              type="submit"
              className="admin-btn admin-btn--primary"
              style={{ whiteSpace: "nowrap" }}
            >
              + Module
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
