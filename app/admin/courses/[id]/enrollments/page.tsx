import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPermission } from "@/lib/auth/require-admin";
import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";
import {
  grantCourseEnrollment,
  restoreCourseEnrollment,
  revokeCourseEnrollment,
} from "./actions";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string; status?: string; success?: string; error?: string }>;
};

type CourseRow = {
  id: string;
  title: string;
  slug: string | null;
  status: string;
  access_type: string | null;
  price_cents: number | null;
};

type EntitlementRow = {
  id: string;
  member_id: string;
  course_id: string;
  source: string;
  status: string;
  grant_note: string | null;
  revoke_note: string | null;
  purchased_at: string | null;
  granted_at: string;
  revoked_at: string | null;
  expires_at: string | null;
  last_accessed_at: string | null;
  progress_percent: number | null;
  member: {
    id: string;
    email: string;
    name: string | null;
    subscription_status: string | null;
    subscription_tier: string | null;
    last_seen_at: string | null;
  } | null;
};

const SOURCE_LABEL: Record<string, string> = {
  purchase: "Purchase",
  migration: "Migration",
  admin_grant: "Admin grant",
  points_unlock: "Points unlock",
  gift: "Gift",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  revoked: "Revoked",
  refunded: "Refunded",
  chargeback: "Chargeback",
};

const STATUS_BADGE: Record<string, string> = {
  active: "admin-badge admin-badge--active",
  revoked: "admin-badge admin-badge--inactive",
  refunded: "admin-badge admin-badge--canceled",
  chargeback: "admin-badge admin-badge--past-due",
};

const SUCCESS_COPY: Record<string, string> = {
  granted: "Course access granted.",
  revoked: "Course access revoked.",
  restored: "Course access restored.",
};

const ERROR_COPY: Record<string, string> = {
  already_enrolled: "That member already has active access to this course.",
  already_inactive: "That entitlement is already inactive.",
  authorization_required: "Confirm authorization and add a short reason before saving.",
  entitlement_not_found: "The course entitlement could not be found.",
  grant_failed: "Course access could not be granted.",
  member_not_found: "No member account was found with that email.",
  missing_grant: "Add a member email and reason before granting access.",
  missing_restore: "Missing restore details.",
  missing_revoke: "Missing revoke details.",
  managed_by_payment: "That entitlement is managed by Stripe payment history and cannot be restored manually.",
  restore_failed: "Course access could not be restored.",
  revoke_failed: "Course access could not be revoked.",
};

function formatDate(value: string | null | undefined) {
  if (!value) return "Never";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatMoney(cents: number | null) {
  if (!cents || cents <= 0) return "No price";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function ProgressBar({ value }: { value: number }) {
  const bounded = Math.max(0, Math.min(100, value));
  return (
    <div style={{ display: "grid", gap: "0.35rem", minWidth: "8rem" }}>
      <div
        aria-hidden="true"
        style={{
          height: "0.45rem",
          overflow: "hidden",
          borderRadius: 999,
          background: "rgba(17, 24, 39, 0.08)",
        }}
      >
        <div
          style={{
            width: `${bounded}%`,
            height: "100%",
            borderRadius: 999,
            background: "var(--color-primary)",
          }}
        />
      </div>
      <span style={{ color: "var(--color-muted-fg)", fontSize: "0.72rem" }}>{bounded}% complete</span>
    </div>
  );
}

function ClientAuthorizationCheckbox() {
  return (
    <label
      style={{
        alignItems: "flex-start",
        color: "var(--color-muted-fg)",
        display: "flex",
        fontSize: "0.78rem",
        gap: "0.5rem",
        lineHeight: 1.35,
      }}
    >
      <input name="clientAuthorizationConfirmed" required type="checkbox" style={{ marginTop: "0.15rem" }} />
      <span>This change is authorized by the member/client or approved by the team.</span>
    </label>
  );
}

export default async function AdminCourseEnrollmentsPage({ params, searchParams }: PageProps) {
  await requireAdminPermission("members.read");
  const { id: courseId } = await params;
  const sp = await searchParams;
  const query = sp.q?.trim().toLowerCase() ?? "";
  const statusFilter = sp.status?.trim() ?? "";

  const supabase = asLooseSupabaseClient(getAdminClient());
  const { data: course, error: courseError } = await supabase
    .from("course")
    .select<CourseRow>("id, title, slug, status, access_type, price_cents")
    .eq("id", courseId)
    .maybeSingle();

  if (courseError || !course) {
    notFound();
  }

  const [{ data: entitlementData }, { data: moduleData }, { count: activeCount }] = await Promise.all([
    supabase
      .from("course_entitlement")
      .select(
        `id, member_id, course_id, source, status, grant_note, revoke_note, purchased_at,
         granted_at, revoked_at, expires_at, last_accessed_at, progress_percent,
         member:member_id(id, email, name, subscription_status, subscription_tier, last_seen_at)`
      )
      .eq("course_id", courseId)
      .order("granted_at", { ascending: false }),
    supabase
      .from("course_module")
      .select("id, lessons:course_lesson(id)")
      .eq("course_id", courseId),
    supabase
      .from("course_entitlement")
      .select("id", { count: "exact", head: true })
      .eq("course_id", courseId)
      .eq("status", "active"),
  ]);

  const rawEntitlements = (entitlementData ?? []) as unknown as EntitlementRow[];
  const entitlements = rawEntitlements.filter((row) => {
    const matchesStatus = !statusFilter || row.status === statusFilter;
    const memberText = `${row.member?.email ?? ""} ${row.member?.name ?? ""}`.toLowerCase();
    const matchesSearch = !query || memberText.includes(query);
    return matchesStatus && matchesSearch;
  });

  const modules = (moduleData ?? []) as Array<{ id: string; lessons?: Array<{ id: string }> | null }>;
  const lessonCount = modules.reduce((sum, module) => sum + (module.lessons?.length ?? 0), 0);
  const inactiveCount = rawEntitlements.filter((row) => row.status !== "active").length;

  return (
    <div style={{ display: "grid", gap: "1.25rem", maxWidth: "74rem" }}>
      <div className="admin-page-header">
        <div>
          <p className="admin-page-header__eyebrow">Courses</p>
          <h1 className="admin-page-header__title">Course Enrollments</h1>
          <p className="admin-page-header__subtitle">
            Manage permanent course access for {course.title}. Purchases stay tied to Stripe; manual changes are
            recorded as admin grants or revokes.
          </p>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          <Link className="admin-btn admin-btn--outline" href="/admin/courses">
            All courses
          </Link>
          <Link className="admin-btn admin-btn--outline" href={`/admin/courses/${course.id}`}>
            Edit course
          </Link>
          {course.slug ? (
            <Link className="admin-btn admin-btn--primary" href={`/courses/${course.slug}`}>
              View sales page
            </Link>
          ) : null}
        </div>
      </div>

      {sp.success ? (
        <div className="admin-banner admin-banner--success">{SUCCESS_COPY[sp.success] ?? "Done."}</div>
      ) : null}
      {sp.error ? (
        <div className="admin-banner admin-banner--error">{ERROR_COPY[sp.error] ?? "Something went wrong."}</div>
      ) : null}

      <div
        style={{
          display: "grid",
          gap: "0.75rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(12rem, 1fr))",
        }}
      >
        <div className="surface-card" style={{ padding: "1rem" }}>
          <p className="admin-search-bar__label">Active enrollments</p>
          <p style={{ fontSize: "1.65rem", fontWeight: 800, marginTop: "0.25rem" }}>{activeCount ?? 0}</p>
        </div>
        <div className="surface-card" style={{ padding: "1rem" }}>
          <p className="admin-search-bar__label">Inactive history</p>
          <p style={{ fontSize: "1.65rem", fontWeight: 800, marginTop: "0.25rem" }}>{inactiveCount}</p>
        </div>
        <div className="surface-card" style={{ padding: "1rem" }}>
          <p className="admin-search-bar__label">Lessons</p>
          <p style={{ fontSize: "1.65rem", fontWeight: 800, marginTop: "0.25rem" }}>{lessonCount}</p>
        </div>
        <div className="surface-card" style={{ padding: "1rem" }}>
          <p className="admin-search-bar__label">Commerce</p>
          <p style={{ fontSize: "1rem", fontWeight: 800, marginTop: "0.4rem" }}>{formatMoney(course.price_cents)}</p>
          <p style={{ color: "var(--color-muted-fg)", fontSize: "0.75rem", marginTop: "0.2rem" }}>
            {course.access_type ?? "membership"} · {course.status}
          </p>
        </div>
      </div>

      <section className="admin-section">
        <div className="admin-section__header">
          <span className="admin-section__title">Grant access</span>
        </div>
        <div className="admin-section__body">
          <form action={grantCourseEnrollment} style={{ display: "grid", gap: "0.85rem" }}>
            <input type="hidden" name="courseId" value={course.id} />
            <div
              style={{
                display: "grid",
                gap: "0.75rem",
                gridTemplateColumns: "repeat(auto-fit, minmax(14rem, 1fr))",
              }}
            >
              <label className="admin-form-field">
                <span className="admin-label">Member email</span>
                <input
                  className="admin-input"
                  name="memberEmail"
                  placeholder="member@example.com"
                  required
                  type="email"
                />
              </label>
              <label className="admin-form-field">
                <span className="admin-label">Grant reason</span>
                <input
                  className="admin-input"
                  name="grantNote"
                  placeholder="Migration correction, support fix, team-approved comp..."
                  required
                />
              </label>
            </div>
            <ClientAuthorizationCheckbox />
            <div>
              <button className="admin-btn admin-btn--primary" type="submit">
                Grant course access
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="admin-section">
        <div className="admin-section__header">
          <span className="admin-section__title">Enrollment roster</span>
        </div>
        <div className="admin-section__body">
          <form
            action={`/admin/courses/${course.id}/enrollments`}
            style={{
              display: "grid",
              gap: "0.75rem",
              gridTemplateColumns: "repeat(auto-fit, minmax(12rem, 1fr))",
              marginBottom: "1rem",
            }}
          >
            <label className="admin-form-field">
              <span className="admin-search-bar__label">Search</span>
              <input
                className="admin-input"
                defaultValue={sp.q ?? ""}
                name="q"
                placeholder="Name or email"
                type="search"
              />
            </label>
            <label className="admin-form-field">
              <span className="admin-search-bar__label">Status</span>
              <select className="admin-select" defaultValue={statusFilter} name="status">
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="revoked">Revoked</option>
                <option value="refunded">Refunded</option>
                <option value="chargeback">Chargeback</option>
              </select>
            </label>
            <div style={{ alignSelf: "end", display: "flex", gap: "0.5rem" }}>
              <button className="admin-btn admin-btn--outline" type="submit">
                Filter
              </button>
              <Link className="admin-btn admin-btn--ghost" href={`/admin/courses/${course.id}/enrollments`}>
                Reset
              </Link>
            </div>
          </form>

          {entitlements.length > 0 ? (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Source</th>
                    <th>Status</th>
                    <th>Progress</th>
                    <th>Activity</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {entitlements.map((entitlement) => (
                    <tr key={entitlement.id}>
                      <td>
                        <div style={{ display: "grid", gap: "0.15rem" }}>
                          <Link
                            href={`/admin/members/${entitlement.member_id}?tab=courses`}
                            style={{ color: "var(--color-foreground)", fontWeight: 800, textDecoration: "none" }}
                          >
                            {entitlement.member?.name || entitlement.member?.email || "Unknown member"}
                          </Link>
                          <span style={{ color: "var(--color-muted-fg)", fontSize: "0.76rem" }}>
                            {entitlement.member?.email ?? "No email on record"}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "grid", gap: "0.15rem" }}>
                          <span>{SOURCE_LABEL[entitlement.source] ?? entitlement.source}</span>
                          <span style={{ color: "var(--color-muted-fg)", fontSize: "0.74rem" }}>
                            Granted {formatDate(entitlement.granted_at)}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className={STATUS_BADGE[entitlement.status] ?? "admin-badge"}>
                          {STATUS_LABEL[entitlement.status] ?? entitlement.status}
                        </span>
                      </td>
                      <td>
                        <ProgressBar value={entitlement.progress_percent ?? 0} />
                      </td>
                      <td>
                        <div style={{ color: "var(--color-muted-fg)", display: "grid", fontSize: "0.74rem", gap: "0.1rem" }}>
                          <span>Last access: {formatDate(entitlement.last_accessed_at)}</span>
                          {entitlement.revoked_at ? <span>Revoked: {formatDate(entitlement.revoked_at)}</span> : null}
                        </div>
                      </td>
                      <td>
                        {entitlement.status === "active" ? (
                          <form action={revokeCourseEnrollment} style={{ display: "grid", gap: "0.45rem", minWidth: "13rem" }}>
                            <input type="hidden" name="courseId" value={course.id} />
                            <input type="hidden" name="entitlementId" value={entitlement.id} />
                            <input
                              className="admin-input"
                              name="revokeNote"
                              placeholder="Reason to revoke..."
                              required
                            />
                            <ClientAuthorizationCheckbox />
                            <button className="admin-btn admin-btn--outline" type="submit">
                              Revoke
                            </button>
                          </form>
                        ) : entitlement.status === "revoked" ? (
                          <form action={restoreCourseEnrollment} style={{ display: "grid", gap: "0.45rem", minWidth: "13rem" }}>
                            <input type="hidden" name="courseId" value={course.id} />
                            <input type="hidden" name="entitlementId" value={entitlement.id} />
                            <input
                              className="admin-input"
                              name="restoreNote"
                              placeholder="Reason to restore..."
                              required
                            />
                            <ClientAuthorizationCheckbox />
                            <button className="admin-btn admin-btn--primary" type="submit">
                              Restore
                            </button>
                          </form>
                        ) : (
                          <span style={{ color: "var(--color-muted-fg)", fontSize: "0.75rem" }}>
                            Managed by payment history.
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="surface-card" style={{ padding: "2rem", textAlign: "center" }}>
              <p style={{ fontWeight: 800 }}>No enrollments match this view.</p>
              <p style={{ color: "var(--color-muted-fg)", fontSize: "0.84rem", marginTop: "0.35rem" }}>
                Try a different search or grant access above.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
