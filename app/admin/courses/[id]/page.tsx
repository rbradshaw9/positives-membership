import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import {
  updateCourse,
  deleteCourse,
  createModule,
  updateModule,
  deleteModule,
  createLesson,
  updateLesson,
  deleteLesson,
  createSession,
  updateSession,
  deleteSession,
} from "../actions";
import { ConfirmDeleteButton } from "../ConfirmDeleteButton";

export const metadata = { title: "Edit Course — Positives Admin" };

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ success?: string; error?: string; el?: string }>;

type SessionRow = {
  id: string; title: string; description: string | null;
  body: string | null; video_url: string | null;
  duration_seconds: number | null; resources: string | null; sort_order: number;
};
type LessonRow = {
  id: string; title: string; description: string | null;
  body: string | null; video_url: string | null;
  duration_seconds: number | null; resources: string | null; sort_order: number;
  course_session: SessionRow[];
};
type ModuleRow = {
  id: string; title: string; description: string | null; sort_order: number;
  course_lesson: LessonRow[];
};
type CourseRow = {
  id: string; title: string; slug: string | null; description: string | null;
  status: string; admin_notes: string | null;
  stripe_price_id: string | null; is_standalone_purchasable: boolean;
  price_cents: number | null; points_price: number | null;
  points_unlock_enabled: boolean;
  course_module: ModuleRow[];
};

const BANNER: Record<string, string> = {
  updated: "Course saved.", module_created: "Module created.", module_updated: "Module renamed.",
  module_deleted: "Module deleted.", lesson_created: "Lesson created.", lesson_updated: "Lesson saved.",
  lesson_deleted: "Lesson deleted.", session_created: "Session created.", session_updated: "Session saved.",
  session_deleted: "Session deleted.",
};

/** Inline editor for a lesson or topic/session */
function ContentFields({
  defaults,
}: {
  defaults: { description?: string | null; body?: string | null; video_url?: string | null; duration_seconds?: number | null; resources?: string | null };
}) {
  return (
    <div className="admin-form-grid-2">
      <div className="admin-form-field">
        <label className="admin-label">Description</label>
        <textarea name="description" rows={2} defaultValue={defaults.description ?? ""}
          className="admin-textarea admin-textarea--no-resize" placeholder="Short summary shown in listings" />
      </div>
      <div className="admin-form-field">
        <label className="admin-label">Video URL</label>
        <input name="video_url" type="url" defaultValue={defaults.video_url ?? ""}
          className="admin-input" placeholder="https://vimeo.com/123456" />
      </div>
      <div className="admin-form-field">
        <label className="admin-label">Duration (seconds)</label>
        <input name="duration_seconds" type="number" min="0"
          defaultValue={defaults.duration_seconds ?? ""} className="admin-input" placeholder="e.g. 1800" />
      </div>
      <div className="admin-form-field">
        <label className="admin-label">Resources (JSON)</label>
        <textarea name="resources" rows={2} defaultValue={defaults.resources ?? ""}
          className="admin-textarea admin-textarea--no-resize"
          placeholder='[{"label":"PDF","url":"https://...","type":"pdf"}]' />
      </div>
      <div className="admin-form-field" style={{ gridColumn: "1 / -1" }}>
        <label className="admin-label">Body / Content</label>
        <textarea name="body" rows={5} defaultValue={defaults.body ?? ""}
          className="admin-textarea" placeholder="Full lesson content or notes" />
      </div>
    </div>
  );
}

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
    .select(`
      id, title, slug, description, status, admin_notes,
      stripe_price_id, is_standalone_purchasable, price_cents, points_price, points_unlock_enabled,
      course_module(
        id, title, description, sort_order,
        course_lesson(
          id, title, description, body, video_url, duration_seconds, resources, sort_order,
          course_session(id, title, description, body, video_url, duration_seconds, resources, sort_order)
        )
      )
    `)
    .eq("id", id)
    .single();

  if (error || !course) return notFound();
  const c = course as unknown as CourseRow;

  const modules = [...(c.course_module ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const totalLessons = modules.reduce((s, m) => s + (m.course_lesson?.length ?? 0), 0);
  const totalSessions = modules.reduce(
    (s, m) => s + (m.course_lesson ?? []).reduce((ss, l) => ss + (l.course_session?.length ?? 0), 0), 0
  );

  // ?el=type:id — which item is being edited inline
  const elParam = sp.el ?? "";

  return (
    <div style={{ maxWidth: "60rem" }}>
      <Link href="/admin/courses" className="admin-back-link">← Courses</Link>

      {sp.success && <div className="admin-banner admin-banner--success">{BANNER[sp.success] ?? "Done."}</div>}
      {sp.error && (
        <div className="admin-banner admin-banner--error">
          {sp.error === "missing_fields" ? "Required fields missing." : "Something went wrong."}
        </div>
      )}

      {/* ── Header ── */}
      <div className="admin-page-header admin-page-header--split">
        <div>
          <p className="admin-page-header__eyebrow">Course Editor</p>
          <h1 className="admin-page-header__title">{c.title}</h1>
          <div className="admin-month-status-row">
            <span className={`admin-badge ${c.status === "published" ? "admin-badge--published" : "admin-badge--draft"}`}>
              {c.status === "published" ? "Published" : "Draft"}
            </span>
            <span className="admin-month-year-label">
              {modules.length} module{modules.length !== 1 ? "s" : ""} ·{" "}
              {totalLessons} lesson{totalLessons !== 1 ? "s" : ""} ·{" "}
              {totalSessions} topic{totalSessions !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <ConfirmDeleteButton
            action={deleteCourse}
            fields={{ id: c.id }}
            confirmName={c.title}
            label="Delete Course"
            style={{
              fontSize: "0.75rem", padding: "0.5rem 0.75rem",
              background: "rgba(239,68,68,0.08)", color: "#ef4444",
              border: "1px solid rgba(239,68,68,0.2)",
              borderRadius: "0.5rem", cursor: "pointer",
            }}
          />
        </div>
      </div>

      {/* ── Course Details ── */}
      <div className="admin-section" style={{ marginBottom: "1.5rem" }}>
        <div className="admin-section__header">
          <span className="admin-section__title">⚙️ Course Details</span>
        </div>
        <div className="admin-section__body">
          <form action={updateCourse}>
            <input type="hidden" name="id" value={c.id} />
            <div className="admin-form-grid-2">
              <div className="admin-form-field" style={{ gridColumn: "1 / -1" }}>
                <label className="admin-label">Title <span className="admin-label__required">*</span></label>
                <input name="title" type="text" required defaultValue={c.title} className="admin-input" />
              </div>
              <div className="admin-form-field">
                <label className="admin-label">Description</label>
                <textarea name="description" rows={3} defaultValue={c.description ?? ""}
                  className="admin-textarea admin-textarea--no-resize" />
              </div>
              <div className="admin-form-field">
                <label className="admin-label">Status</label>
                <select name="status" defaultValue={c.status} className="admin-select">
                  <option value="draft">Draft — hidden from members</option>
                  <option value="published">Published — visible to members</option>
                </select>
              </div>
              <div className="admin-form-field">
                <label className="admin-label">Standalone purchase</label>
                <select
                  name="is_standalone_purchasable"
                  defaultValue={c.is_standalone_purchasable ? "true" : "false"}
                  className="admin-select"
                >
                  <option value="false">No — library/subscription only</option>
                  <option value="true">Yes — show in course store</option>
                </select>
              </div>
              <div className="admin-form-field">
                <label className="admin-label">Stripe one-time Price ID</label>
                <input
                  name="stripe_price_id"
                  type="text"
                  defaultValue={c.stripe_price_id ?? ""}
                  className="admin-input"
                  placeholder="price_..."
                />
              </div>
              <div className="admin-form-field">
                <label className="admin-label">Price (USD cents)</label>
                <input
                  name="price_cents"
                  type="number"
                  min="0"
                  step="1"
                  defaultValue={c.price_cents ?? ""}
                  className="admin-input"
                  placeholder="9700"
                />
              </div>
              <div className="admin-form-field">
                <label className="admin-label">Points unlock</label>
                <select
                  name="points_unlock_enabled"
                  defaultValue={c.points_unlock_enabled ? "true" : "false"}
                  className="admin-select"
                >
                  <option value="false">Disabled</option>
                  <option value="true">Enabled for active subscribers</option>
                </select>
              </div>
              <div className="admin-form-field">
                <label className="admin-label">Point cost</label>
                <input
                  name="points_price"
                  type="number"
                  min="0"
                  step="1"
                  defaultValue={c.points_price ?? ""}
                  className="admin-input"
                  placeholder="Defaults to dollar price"
                />
              </div>
            </div>
            <button type="submit" className="admin-btn admin-btn--primary" style={{ marginTop: "0.75rem" }}>
              Save Course
            </button>
          </form>
        </div>
      </div>

      {/* ── Empty state ── */}
      {modules.length === 0 && (
        <div style={{
          textAlign: "center", padding: "3rem 1.5rem",
          background: "var(--color-surface)", borderRadius: "0.75rem",
          border: "1px solid var(--color-border)", marginBottom: "1.5rem",
        }}>
          <p style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>📦</p>
          <p style={{ fontWeight: 600, marginBottom: "0.25rem" }}>No modules yet</p>
          <p style={{ fontSize: "0.8125rem", color: "var(--color-muted-fg)" }}>
            Add a module below to start organizing lessons.
          </p>
        </div>
      )}

      {/* ── Modules ── */}
      {modules.map((mod) => {
        const lessons = [...(mod.course_lesson ?? [])].sort((a, b) => a.sort_order - b.sort_order);
        const isEditingModule = elParam === `module:${mod.id}`;

        return (
          <div key={mod.id} className="admin-section" style={{ marginBottom: "1rem" }}>

            {/* Module header */}
            <div className="admin-section__header" style={{ flexDirection: "column", gap: "0.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="admin-section__title">
                  📦 {mod.title}
                  <span style={{ fontSize: "0.6875rem", fontWeight: 400, color: "var(--color-muted-fg)", marginLeft: "0.5rem" }}>
                    · {lessons.length} lesson{lessons.length !== 1 ? "s" : ""}
                  </span>
                </span>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <Link
                    href={`/admin/courses/${c.id}?el=${isEditingModule ? "" : `module:${mod.id}`}`}
                    scroll={false}
                    style={{
                      fontSize: "0.6875rem", color: isEditingModule ? "var(--color-primary)" : "var(--color-muted-fg)",
                      fontWeight: isEditingModule ? 600 : 400, textDecoration: "none",
                    }}
                  >
                    {isEditingModule ? "Close" : "Rename"}
                  </Link>
                  <ConfirmDeleteButton
                    action={deleteModule}
                    fields={{ module_id: mod.id, course_id: c.id }}
                    confirmName={mod.title}
                    label="Remove"
                    style={{
                      fontSize: "0.6875rem", color: "rgba(239,68,68,0.55)",
                      background: "none", border: "none", cursor: "pointer", padding: 0,
                    }}
                  />
                </div>
              </div>

              {isEditingModule && (
                <form action={updateModule} style={{ display: "flex", gap: "0.5rem" }}>
                  <input type="hidden" name="module_id" value={mod.id} />
                  <input type="hidden" name="course_id" value={c.id} />
                  <input name="title" type="text" required defaultValue={mod.title}
                    className="admin-input" style={{ flex: 1, fontSize: "0.8125rem" }} />
                  <button type="submit" className="admin-btn admin-btn--primary" style={{ fontSize: "0.75rem" }}>
                    Save
                  </button>
                </form>
              )}
            </div>

            <div className="admin-section__body" style={{ padding: 0 }}>

              {lessons.length === 0 && (
                <div style={{ padding: "1rem 1.25rem", textAlign: "center" }}>
                  <p style={{ fontSize: "0.8125rem", color: "var(--color-muted-fg)" }}>No lessons yet.</p>
                </div>
              )}

              {/* ── Lessons ── */}
              {lessons.map((lesson, li) => {
                const sessions = [...(lesson.course_session ?? [])].sort((a, b) => a.sort_order - b.sort_order);
                const isEditingLesson = elParam === `lesson:${lesson.id}`;

                return (
                  <div key={lesson.id} style={{ borderBottom: "1px solid var(--color-border)" }}>

                    {/* Lesson row */}
                    <div style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "0.625rem 1.25rem", gap: "0.75rem",
                      background: isEditingLesson ? "rgba(46,196,182,0.03)" : "transparent",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", minWidth: 0, flex: 1 }}>
                        <span style={{ fontSize: "0.6875rem", color: "var(--color-muted-fg)", minWidth: "1.25rem" }}>
                          L{li + 1}
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <p style={{
                            fontSize: "0.875rem", fontWeight: 600, color: "var(--color-foreground)",
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }}>
                            {lesson.title}
                          </p>
                          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.125rem", flexWrap: "wrap" }}>
                            {lesson.video_url && (
                              <span style={{ fontSize: "0.625rem", color: "var(--color-primary)", fontWeight: 500 }}>🎬 Video</span>
                            )}
                            {lesson.resources && (
                              <span style={{ fontSize: "0.625rem", color: "#f59e0b", fontWeight: 500 }}>📎 Resources</span>
                            )}
                            {sessions.length > 0 && (
                              <span style={{ fontSize: "0.625rem", color: "var(--color-muted-fg)" }}>
                                {sessions.length} topic{sessions.length !== 1 ? "s" : ""}
                              </span>
                            )}
                            {lesson.duration_seconds && (
                              <span style={{ fontSize: "0.625rem", color: "var(--color-muted-fg)" }}>
                                {Math.round(lesson.duration_seconds / 60)}m
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexShrink: 0 }}>
                        <Link
                          href={`/admin/courses/${c.id}?el=${isEditingLesson ? "" : `lesson:${lesson.id}`}`}
                          scroll={false}
                          style={{
                            fontSize: "0.6875rem",
                            color: isEditingLesson ? "var(--color-primary)" : "var(--color-muted-fg)",
                            fontWeight: isEditingLesson ? 600 : 400, textDecoration: "none",
                          }}
                        >
                          {isEditingLesson ? "Close" : "Edit"}
                        </Link>
                        <ConfirmDeleteButton
                          action={deleteLesson}
                          fields={{ lesson_id: lesson.id, course_id: c.id }}
                          confirmName={lesson.title}
                          label="✕"
                          style={{
                            fontSize: "0.6875rem", color: "rgba(239,68,68,0.45)",
                            background: "none", border: "none", cursor: "pointer", padding: 0,
                          }}
                        />
                      </div>
                    </div>

                    {/* Lesson inline editor */}
                    {isEditingLesson && (
                      <div style={{
                        padding: "1rem 1.25rem",
                        borderTop: "1px solid var(--color-border)",
                        background: "rgba(46,196,182,0.02)",
                      }}>
                        <form action={updateLesson}>
                          <input type="hidden" name="lesson_id" value={lesson.id} />
                          <input type="hidden" name="course_id" value={c.id} />
                          <div style={{ marginBottom: "0.75rem" }}>
                            <label className="admin-label">Title <span className="admin-label__required">*</span></label>
                            <input name="title" type="text" required defaultValue={lesson.title} className="admin-input" />
                          </div>
                          <ContentFields defaults={lesson} />
                          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
                            <button type="submit" className="admin-btn admin-btn--primary" style={{ fontSize: "0.8125rem" }}>
                              Save Lesson
                            </button>
                            <Link href={`/admin/courses/${c.id}`} scroll={false} className="admin-btn"
                              style={{ fontSize: "0.8125rem", background: "var(--color-muted)", color: "var(--color-foreground)", textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
                              Cancel
                            </Link>
                          </div>
                        </form>
                      </div>
                    )}

                    {/* ── Topics / Sessions ── */}
                    {sessions.map((sess, si) => {
                      const isEditingSession = elParam === `session:${sess.id}`;

                      return (
                        <div key={sess.id}>
                          <div style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            padding: "0.5rem 1.25rem 0.5rem 2.5rem", gap: "0.75rem",
                            borderTop: "1px solid rgba(255,255,255,0.04)",
                            background: isEditingSession ? "rgba(46,196,182,0.02)" : "rgba(0,0,0,0.05)",
                          }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0, flex: 1 }}>
                              <span style={{ fontSize: "0.625rem", color: "var(--color-muted-fg)", minWidth: "1.5rem" }}>
                                T{si + 1}
                              </span>
                              <div style={{ minWidth: 0 }}>
                                <p style={{
                                  fontSize: "0.8125rem", color: "var(--color-foreground)",
                                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                }}>
                                  {sess.title}
                                </p>
                                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                                  {sess.video_url && (
                                    <span style={{ fontSize: "0.5625rem", color: "var(--color-primary)" }}>🎬 Video</span>
                                  )}
                                  {sess.resources && (
                                    <span style={{ fontSize: "0.5625rem", color: "#f59e0b" }}>📎 Resources</span>
                                  )}
                                  {sess.duration_seconds && (
                                    <span style={{ fontSize: "0.5625rem", color: "var(--color-muted-fg)" }}>
                                      {Math.round(sess.duration_seconds / 60)}m
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexShrink: 0 }}>
                              <Link
                                href={`/admin/courses/${c.id}?el=${isEditingSession ? "" : `session:${sess.id}`}`}
                                scroll={false}
                                style={{
                                  fontSize: "0.625rem",
                                  color: isEditingSession ? "var(--color-primary)" : "var(--color-muted-fg)",
                                  fontWeight: isEditingSession ? 600 : 400, textDecoration: "none",
                                }}
                              >
                                {isEditingSession ? "Close" : "Edit"}
                              </Link>
                              <ConfirmDeleteButton
                                action={deleteSession}
                                fields={{ session_id: sess.id, course_id: c.id }}
                                confirmName={sess.title}
                                label="✕"
                                style={{
                                  fontSize: "0.625rem", color: "rgba(239,68,68,0.4)",
                                  background: "none", border: "none", cursor: "pointer", padding: 0,
                                }}
                              />
                            </div>
                          </div>

                          {isEditingSession && (
                            <div style={{
                              padding: "1rem 1.25rem 1rem 2.5rem",
                              borderTop: "1px solid var(--color-border)",
                              background: "rgba(46,196,182,0.02)",
                            }}>
                              <form action={updateSession}>
                                <input type="hidden" name="session_id" value={sess.id} />
                                <input type="hidden" name="course_id" value={c.id} />
                                <div style={{ marginBottom: "0.75rem" }}>
                                  <label className="admin-label">Title <span className="admin-label__required">*</span></label>
                                  <input name="title" type="text" required defaultValue={sess.title} className="admin-input" />
                                </div>
                                <ContentFields defaults={sess} />
                                <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
                                  <button type="submit" className="admin-btn admin-btn--primary" style={{ fontSize: "0.8125rem" }}>
                                    Save Topic
                                  </button>
                                  <Link href={`/admin/courses/${c.id}`} scroll={false} className="admin-btn"
                                    style={{ fontSize: "0.8125rem", background: "var(--color-muted)", color: "var(--color-foreground)", textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
                                    Cancel
                                  </Link>
                                </div>
                              </form>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Add topic inline */}
                    <div style={{ padding: "0.5rem 1.25rem 0.5rem 2.5rem", borderTop: "1px solid rgba(255,255,255,0.04)", background: "rgba(0,0,0,0.05)" }}>
                      <form action={createSession} style={{ display: "flex", gap: "0.5rem" }}>
                        <input type="hidden" name="lesson_id" value={lesson.id} />
                        <input type="hidden" name="course_id" value={c.id} />
                        <input name="title" type="text" required placeholder="Add topic…"
                          className="admin-input" style={{ flex: 1, fontSize: "0.75rem" }} />
                        <button type="submit" className="admin-btn admin-btn--primary"
                          style={{ fontSize: "0.6875rem", padding: "0.375rem 0.625rem", whiteSpace: "nowrap" }}>
                          + Topic
                        </button>
                      </form>
                    </div>
                  </div>
                );
              })}

              {/* Add lesson inline */}
              <div style={{ padding: "0.75rem 1.25rem" }}>
                <form action={createLesson} style={{ display: "flex", gap: "0.5rem" }}>
                  <input type="hidden" name="module_id" value={mod.id} />
                  <input type="hidden" name="course_id" value={c.id} />
                  <input name="title" type="text" required placeholder="Add lesson…"
                    className="admin-input" style={{ flex: 1, fontSize: "0.8125rem" }} />
                  <button type="submit" className="admin-btn admin-btn--primary"
                    style={{ fontSize: "0.75rem", padding: "0.5rem 0.75rem", whiteSpace: "nowrap" }}>
                    + Lesson
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
          <span className="admin-section__title">➕ Add Module (Section)</span>
        </div>
        <div className="admin-section__body">
          <form action={createModule} style={{ display: "flex", gap: "0.5rem" }}>
            <input type="hidden" name="course_id" value={c.id} />
            <div style={{ flex: 1 }}>
              <input name="title" type="text" required placeholder="e.g. Week 1: Foundations"
                className="admin-input" />
            </div>
            <button type="submit" className="admin-btn admin-btn--primary" style={{ whiteSpace: "nowrap" }}>
              + Module
            </button>
          </form>
        </div>
      </div>

      {c.admin_notes && (
        <div className="admin-section" style={{ marginBottom: "1.5rem" }}>
          <div className="admin-section__header">
            <span className="admin-section__title">📝 Admin Notes</span>
          </div>
          <div className="admin-section__body">
            <p style={{ fontSize: "0.8125rem", color: "var(--color-muted-fg)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
              {c.admin_notes}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
