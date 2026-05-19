import { requireAdminPermission } from "@/lib/auth/require-admin";
import { getAdminRoleManagementRows } from "@/lib/admin/roles";
import { getAdminTeamMembers } from "@/lib/admin/team";
import { ADMIN_PERMISSION_OPTIONS } from "@/lib/admin/permissions";
import {
  assignAdminRole,
  removeAdminRole,
  setPermissionOverride,
  removePermissionOverride,
} from "./actions";

export const metadata = {
  title: "Team — Positives Admin",
};

type SearchParams = Promise<{ success?: string; error?: string }>;

const SUCCESS_COPY: Record<string, string> = {
  role_assigned: "Role assigned successfully.",
  role_removed: "Role removed.",
  override_set: "Permission override saved.",
  override_removed: "Override removed — member is back to role defaults.",
};

const ERROR_COPY: Record<string, string> = {
  missing_fields: "Please fill in all required fields.",
  member_not_found: "No member found with that email. Have them sign up first.",
  already_assigned: "That role is already assigned to this member.",
  assign_failed: "Role assignment failed.",
  remove_failed: "Role removal failed.",
  invalid_override: "Invalid permission key.",
  override_failed: "Override could not be saved.",
};

const ROLE_BADGE_CLASS: Record<string, string> = {
  super_admin: "admin-team-badge admin-team-badge--owner",
  admin:       "admin-team-badge admin-team-badge--admin",
  coach:       "admin-team-badge admin-team-badge--coach",
  support:     "admin-team-badge admin-team-badge--support",
  readonly:    "admin-team-badge admin-team-badge--readonly",
};

function formatDate(value: string | null) {
  if (!value) return "Never";
  return new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", timeZone: "America/New_York",
  }).format(new Date(value));
}

export default async function AdminTeamPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdminPermission("roles.manage");
  const [members, roles, sp] = await Promise.all([
    getAdminTeamMembers(),
    getAdminRoleManagementRows(),
    searchParams,
  ]);

  return (
    <div className="admin-team-shell">
      <div className="admin-page-header">
        <p className="admin-page-header__eyebrow">Permissions</p>
        <h1 className="admin-page-header__title">Team</h1>
        <p className="admin-page-header__subtitle">
          Assign roles with default permissions, then add per-person overrides for exceptions.
        </p>
      </div>

      {sp.success ? (
        <div role="status" className="admin-team-alert admin-team-alert--success">
          {SUCCESS_COPY[sp.success] ?? "Done."}
        </div>
      ) : null}
      {sp.error ? (
        <div role="alert" className="admin-team-alert admin-team-alert--error">
          {ERROR_COPY[sp.error] ?? "Something went wrong."}
        </div>
      ) : null}

      {/* ── Assign a new role ─────────────────────────────────────────────── */}
      <section className="admin-team-card">
        <h2 className="admin-team-card__title">Assign a role</h2>
        <p className="admin-team-card__description">
          The member must already have a Positives account. Enter their email and choose a role.
          Roles can be combined — a member can be both Coach and Admin.
        </p>
        <form action={assignAdminRole} className="admin-team-assign-form">
          <label className="admin-form-field">
            <span className="admin-search-bar__label">Member email</span>
            <input
              type="email"
              name="email"
              required
              placeholder="coach@example.com"
              className="admin-input"
            />
          </label>
          <label className="admin-form-field">
            <span className="admin-search-bar__label">Role</span>
            <select name="roleId" required className="admin-input">
              <option value="">Choose a role…</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name} — {role.description ?? role.key}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="admin-btn admin-btn--primary">
            Assign role
          </button>
        </form>
      </section>

      {/* ── Team member list ──────────────────────────────────────────────── */}
      <section className="admin-team-card">
        <h2 className="admin-team-card__title">
          Current team
          <span className="admin-team-card__count">{members.length}</span>
        </h2>

        {members.length === 0 ? (
          <p className="admin-team-empty">No admin team members yet. Assign a role above.</p>
        ) : (
          <div className="admin-team-list">
            {members.map((member) => (
              <details key={member.memberId} className="admin-team-member">
                <summary className="admin-team-member__summary">
                  <div className="admin-team-member__avatar">
                    {member.name?.charAt(0).toUpperCase() ?? member.email.charAt(0).toUpperCase()}
                  </div>
                  <div className="admin-team-member__info">
                    <p className="admin-team-member__name">{member.name ?? member.email}</p>
                    {member.name ? <p className="admin-team-member__email">{member.email}</p> : null}
                  </div>
                  <div className="admin-team-member__badges">
                    {member.roles.map((role) => (
                      <span key={role.id} className={ROLE_BADGE_CLASS[role.key] ?? "admin-team-badge"}>
                        {role.name}
                      </span>
                    ))}
                    {member.overrides.length > 0 ? (
                      <span className="admin-team-badge admin-team-badge--override">
                        {member.overrides.length} override{member.overrides.length !== 1 ? "s" : ""}
                      </span>
                    ) : null}
                  </div>
                  <p className="admin-team-member__last-seen">
                    Last active: {formatDate(member.lastSeenAt)}
                  </p>
                </summary>

                <div className="admin-team-member__detail">
                  {/* Remove roles */}
                  <div className="admin-team-section">
                    <p className="admin-team-section__label">Assigned roles</p>
                    <div className="admin-team-role-list">
                      {member.roles.map((role) => (
                        <div key={role.id} className="admin-team-role-row">
                          <span className={ROLE_BADGE_CLASS[role.key] ?? "admin-team-badge"}>
                            {role.name}
                          </span>
                          <span className="admin-team-role-row__perms">
                            {roles.find((r) => r.id === role.id)?.permissions.length ?? 0} default permissions
                          </span>
                          <form action={removeAdminRole} className="admin-team-inline-form">
                            <input type="hidden" name="memberId" value={member.memberId} />
                            <input type="hidden" name="roleId" value={role.id} />
                            <button
                              type="submit"
                              className="admin-btn admin-btn--ghost admin-btn--sm"
                              onClick={(e) => {
                                if (!confirm(`Remove ${role.name} role from ${member.email}?`)) {
                                  e.preventDefault();
                                }
                              }}
                            >
                              Remove
                            </button>
                          </form>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Permission overrides */}
                  <div className="admin-team-section">
                    <p className="admin-team-section__label">Permission overrides</p>
                    {member.overrides.length > 0 ? (
                      <div className="admin-team-override-list">
                        {member.overrides.map((override) => (
                          <div key={override.permission} className="admin-team-override-row">
                            <span
                              className={`admin-team-override-kind ${override.allowed ? "admin-team-override-kind--grant" : "admin-team-override-kind--deny"}`}
                            >
                              {override.allowed ? "Grant" : "Deny"}
                            </span>
                            <code className="admin-team-override-key">{override.permission}</code>
                            <span className="admin-team-override-label">
                              {ADMIN_PERMISSION_OPTIONS.find((p) => p.key === override.permission)?.label ?? override.permission}
                            </span>
                            <form action={removePermissionOverride} className="admin-team-inline-form">
                              <input type="hidden" name="memberId" value={member.memberId} />
                              <input type="hidden" name="permission" value={override.permission} />
                              <button type="submit" className="admin-btn admin-btn--ghost admin-btn--sm">
                                Revert to default
                              </button>
                            </form>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="admin-team-no-overrides">No overrides — using role defaults.</p>
                    )}

                    {/* Add override */}
                    <details className="admin-team-add-override">
                      <summary className="admin-btn admin-btn--ghost admin-btn--sm" style={{ display: "inline-flex", cursor: "pointer" }}>
                        Add override
                      </summary>
                      <form action={setPermissionOverride} className="admin-team-override-form">
                        <input type="hidden" name="memberId" value={member.memberId} />
                        <label className="admin-form-field">
                          <span className="admin-search-bar__label">Permission</span>
                          <select name="permission" required className="admin-input">
                            <option value="">Choose permission…</option>
                            {ADMIN_PERMISSION_OPTIONS.map((p) => (
                              <option key={p.key} value={p.key}>
                                {p.label} — {p.description}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="admin-form-field">
                          <span className="admin-search-bar__label">Override type</span>
                          <select name="allowed" required className="admin-input">
                            <option value="true">Grant (add this permission)</option>
                            <option value="false">Deny (remove this permission)</option>
                          </select>
                        </label>
                        <button type="submit" className="admin-btn admin-btn--primary admin-btn--sm">
                          Save override
                        </button>
                      </form>
                    </details>
                  </div>
                </div>
              </details>
            ))}
          </div>
        )}
      </section>

      <style>{`
        .admin-team-shell {
          width: min(100%, 72rem);
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .admin-team-alert {
          border-radius: 1rem;
          font-size: 0.875rem;
          font-weight: 750;
          line-height: 1.55;
          padding: 0.9rem 1rem;
        }

        .admin-team-alert--success {
          border: 1px solid color-mix(in srgb, var(--color-primary) 35%, var(--color-border));
          background: color-mix(in srgb, var(--color-primary) 10%, white);
          color: color-mix(in srgb, var(--color-primary) 72%, #064e3b);
        }

        .admin-team-alert--error {
          border: 1px solid rgba(220, 38, 38, 0.24);
          background: rgba(254, 242, 242, 0.9);
          color: #b91c1c;
        }

        .admin-team-card {
          border: 1px solid rgba(226, 232, 240, 0.9);
          border-radius: 1.35rem;
          background: linear-gradient(180deg, #fff, rgba(248,250,252,0.8));
          box-shadow: 0 16px 42px rgba(14, 16, 21, 0.06);
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .admin-team-card__title {
          margin: 0;
          color: var(--color-fg);
          font-family: var(--font-heading);
          font-size: 1.1rem;
          letter-spacing: -0.03em;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .admin-team-card__count {
          border: 1px solid var(--color-border);
          border-radius: 999px;
          background: white;
          color: var(--color-muted-fg);
          font-size: 0.75rem;
          font-weight: 800;
          padding: 0.2rem 0.6rem;
        }

        .admin-team-card__description {
          margin: -0.25rem 0 0;
          color: var(--color-muted-fg);
          font-size: 0.85rem;
          line-height: 1.55;
        }

        .admin-team-assign-form {
          display: grid;
          gap: 0.75rem;
          max-width: 32rem;
        }

        .admin-input {
          width: 100%;
          border: 1px solid var(--color-border);
          border-radius: 0.75rem;
          background: white;
          color: var(--color-fg);
          font-size: 0.875rem;
          padding: 0.6rem 0.85rem;
        }

        .admin-team-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .admin-team-empty {
          color: var(--color-muted-fg);
          font-size: 0.875rem;
        }

        .admin-team-member {
          border: 1px solid rgba(226, 232, 240, 0.9);
          border-radius: 1rem;
          background: white;
          overflow: hidden;
        }

        .admin-team-member__summary {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.85rem 1rem;
          cursor: pointer;
          list-style: none;
          flex-wrap: wrap;
        }

        .admin-team-member__summary::-webkit-details-marker { display: none; }

        .admin-team-member__avatar {
          width: 2.25rem;
          height: 2.25rem;
          border-radius: 999px;
          background: linear-gradient(135deg, #2ec4b6, #3db6e7);
          color: white;
          font-size: 0.875rem;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .admin-team-member__info {
          flex: 1;
          min-width: 0;
        }

        .admin-team-member__name {
          margin: 0;
          color: var(--color-fg);
          font-size: 0.9rem;
          font-weight: 750;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .admin-team-member__email {
          margin: 0.1rem 0 0;
          color: var(--color-muted-fg);
          font-size: 0.78rem;
        }

        .admin-team-member__badges {
          display: flex;
          flex-wrap: wrap;
          gap: 0.35rem;
        }

        .admin-team-member__last-seen {
          margin: 0;
          color: var(--color-muted-fg);
          font-size: 0.76rem;
          margin-left: auto;
          white-space: nowrap;
        }

        .admin-team-badge {
          border-radius: 999px;
          font-size: 0.68rem;
          font-weight: 850;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          padding: 0.22rem 0.65rem;
          border: 1px solid transparent;
        }

        .admin-team-badge--owner  { background: #1e293b; color: white; }
        .admin-team-badge--admin  { background: #dbeafe; color: #1d4ed8; border-color: #bfdbfe; }
        .admin-team-badge--coach  { background: #ccfbf1; color: #0f766e; border-color: #99f6e4; }
        .admin-team-badge--support { background: #fef3c7; color: #92400e; border-color: #fde68a; }
        .admin-team-badge--readonly { background: #f1f5f9; color: #64748b; border-color: #e2e8f0; }
        .admin-team-badge--override { background: #f3e8ff; color: #7c3aed; border-color: #e9d5ff; }

        .admin-team-member__detail {
          border-top: 1px solid rgba(226, 232, 240, 0.7);
          padding: 1rem;
          display: grid;
          gap: 1.25rem;
        }

        .admin-team-section__label {
          margin: 0 0 0.6rem;
          color: var(--color-muted-fg);
          font-size: 0.72rem;
          font-weight: 850;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .admin-team-role-list,
        .admin-team-override-list {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          margin-bottom: 0.75rem;
        }

        .admin-team-role-row,
        .admin-team-override-row {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          flex-wrap: wrap;
          padding: 0.5rem 0.75rem;
          border: 1px solid rgba(226, 232, 240, 0.7);
          border-radius: 0.65rem;
          background: rgba(248, 250, 252, 0.6);
        }

        .admin-team-role-row__perms {
          color: var(--color-muted-fg);
          font-size: 0.78rem;
          flex: 1;
        }

        .admin-team-override-kind {
          border-radius: 999px;
          font-size: 0.68rem;
          font-weight: 850;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          padding: 0.18rem 0.55rem;
        }

        .admin-team-override-kind--grant { background: #dcfce7; color: #15803d; }
        .admin-team-override-kind--deny  { background: #fee2e2; color: #b91c1c; }

        .admin-team-override-key {
          color: var(--color-muted-fg);
          font-size: 0.76rem;
          background: rgba(226, 232, 240, 0.5);
          border-radius: 0.35rem;
          padding: 0.1rem 0.4rem;
        }

        .admin-team-override-label {
          color: var(--color-fg);
          font-size: 0.82rem;
          flex: 1;
        }

        .admin-team-no-overrides {
          color: var(--color-muted-fg);
          font-size: 0.82rem;
          margin: 0 0 0.75rem;
        }

        .admin-team-add-override {
          margin-top: 0.25rem;
        }

        .admin-team-override-form {
          display: grid;
          gap: 0.65rem;
          max-width: 28rem;
          margin-top: 0.75rem;
          padding: 0.85rem;
          border: 1px solid rgba(226, 232, 240, 0.8);
          border-radius: 0.85rem;
          background: rgba(248, 250, 252, 0.7);
        }

        .admin-team-inline-form {
          margin-left: auto;
        }

        .admin-btn--sm {
          font-size: 0.78rem;
          padding: 0.35rem 0.75rem;
        }
      `}</style>
    </div>
  );
}
