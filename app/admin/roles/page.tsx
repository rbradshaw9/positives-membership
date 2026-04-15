import Link from "next/link";
import { requireAdminPermission } from "@/lib/auth/require-admin";
import { ADMIN_PERMISSION_OPTIONS } from "@/lib/admin/permissions";
import { getAdminRoleManagementRows } from "@/lib/admin/roles";
import { updateAdminRolePermissions } from "./actions";

export const metadata = {
  title: "Admin Roles — Positives Admin",
};

type SearchParams = Promise<{ success?: string; error?: string }>;

const ERROR_COPY: Record<string, string> = {
  missing_role: "Choose a role before saving.",
  missing_reason: "Add a short reason before changing role permissions.",
  role_not_found: "That role could not be found.",
  update_failed: "Role permissions could not be updated.",
};

export default async function AdminRolesPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdminPermission("roles.manage");
  const [roles, sp] = await Promise.all([getAdminRoleManagementRows(), searchParams]);

  return (
    <div className="admin-roles-shell">
      <div className="admin-page-header">
        <p className="admin-page-header__eyebrow">Permissions</p>
        <h1 className="admin-page-header__title">Admin Roles</h1>
        <p className="admin-page-header__subtitle">
          Keep default roles adjustable while preserving a clear audit trail for every permission change.
        </p>
      </div>

      {sp.success === "role_updated" ? (
        <div role="status" className="admin-role-alert admin-role-alert--success">
          Role permissions updated.
        </div>
      ) : null}
      {sp.error ? (
        <div role="alert" className="admin-role-alert admin-role-alert--error">
          {ERROR_COPY[sp.error] ?? "Something went wrong."}
        </div>
      ) : null}

      <div className="admin-role-note">
        <strong>Guardrail:</strong> Super Admin is always kept as the full-permission role to avoid
        accidental lockouts. Use per-admin overrides from a member record for temporary exceptions.
      </div>

      <div className="admin-role-grid">
        {roles.map((role) => {
          const selected = new Set(role.permissions);
          const isSuperAdmin = role.key === "super_admin";
          return (
            <form key={role.id} action={updateAdminRolePermissions} className="admin-role-card">
              <input type="hidden" name="roleId" value={role.id} />
              <div className="admin-role-card__header">
                <div>
                  <p className="admin-role-card__eyebrow">{role.key}</p>
                  <h2 className="admin-role-card__title">{role.name}</h2>
                  <p className="admin-role-card__description">
                    {role.description ?? "No description yet."}
                  </p>
                </div>
                <span className="admin-role-card__count">
                  {role.assignedCount} assigned
                </span>
              </div>

              <div className="admin-role-permissions">
                {ADMIN_PERMISSION_OPTIONS.map((permission) => (
                  <label key={permission.key} className="admin-role-permission">
                    <input
                      type="checkbox"
                      name="permissions"
                      value={permission.key}
                      defaultChecked={isSuperAdmin || selected.has(permission.key)}
                      disabled={isSuperAdmin}
                    />
                    <span>
                      <strong>{permission.label}</strong>
                      <small>{permission.description}</small>
                    </span>
                  </label>
                ))}
              </div>

              <label className="admin-form-field">
                <span className="admin-search-bar__label">Change reason</span>
                <textarea
                  className="admin-textarea"
                  name="reason"
                  required
                  placeholder="Why are these permissions changing?"
                />
              </label>
              <button type="submit" className="admin-btn admin-btn--primary">
                Save role permissions
              </button>
            </form>
          );
        })}
      </div>

      <Link href="/admin/members" className="admin-role-back-link">
        Back to member directory
      </Link>

      <style>{`
        .admin-roles-shell {
          width: min(100%, 76rem);
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .admin-role-alert,
        .admin-role-note {
          border-radius: 1rem;
          font-size: 0.875rem;
          line-height: 1.55;
          padding: 0.9rem 1rem;
        }

        .admin-role-alert--success {
          border: 1px solid color-mix(in srgb, var(--color-primary) 35%, var(--color-border));
          background: color-mix(in srgb, var(--color-primary) 10%, white);
          color: color-mix(in srgb, var(--color-primary) 72%, #064e3b);
          font-weight: 750;
        }

        .admin-role-alert--error {
          border: 1px solid rgba(220, 38, 38, 0.24);
          background: rgba(254, 242, 242, 0.9);
          color: #b91c1c;
          font-weight: 750;
        }

        .admin-role-note {
          border: 1px solid color-mix(in srgb, #f59e0b 32%, var(--color-border));
          background: color-mix(in srgb, #fef3c7 58%, white);
          color: #6b4e16;
        }

        .admin-role-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(21rem, 1fr));
          gap: 1rem;
        }

        .admin-role-card {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          border: 1px solid rgba(226, 232, 240, 0.9);
          border-radius: 1.35rem;
          background:
            radial-gradient(circle at top right, rgba(46, 196, 182, 0.11), transparent 34%),
            linear-gradient(180deg, #fff, rgba(248,250,252,0.8));
          box-shadow: 0 16px 42px rgba(14, 16, 21, 0.06);
          padding: 1rem;
        }

        .admin-role-card__header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
        }

        .admin-role-card__eyebrow {
          margin: 0 0 0.3rem;
          color: var(--color-primary);
          font-size: 0.68rem;
          font-weight: 850;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .admin-role-card__title {
          margin: 0;
          color: var(--color-fg);
          font-family: var(--font-heading);
          font-size: 1.25rem;
          letter-spacing: -0.03em;
        }

        .admin-role-card__description {
          margin: 0.35rem 0 0;
          color: var(--color-muted-fg);
          font-size: 0.85rem;
          line-height: 1.5;
        }

        .admin-role-card__count {
          border: 1px solid var(--color-border);
          border-radius: 999px;
          background: white;
          color: var(--color-muted-fg);
          font-size: 0.75rem;
          font-weight: 800;
          padding: 0.35rem 0.65rem;
          white-space: nowrap;
        }

        .admin-role-permissions {
          display: grid;
          gap: 0.65rem;
        }

        .admin-role-permission {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          gap: 0.65rem;
          border: 1px solid rgba(226, 232, 240, 0.75);
          border-radius: 0.85rem;
          background: rgba(255,255,255,0.82);
          padding: 0.75rem;
        }

        .admin-role-permission input {
          margin-top: 0.2rem;
        }

        .admin-role-permission strong {
          display: block;
          color: var(--color-fg);
          font-size: 0.86rem;
        }

        .admin-role-permission small {
          display: block;
          margin-top: 0.2rem;
          color: var(--color-muted-fg);
          font-size: 0.76rem;
          line-height: 1.45;
        }

        .admin-role-back-link {
          color: var(--color-primary);
          font-size: 0.875rem;
          font-weight: 750;
          text-decoration: none;
        }
      `}</style>
    </div>
  );
}
