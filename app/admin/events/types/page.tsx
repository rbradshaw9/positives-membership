import Link from "next/link";
import { TypeForm } from "../resource-forms";
import { getEventSettingsOptions } from "@/lib/queries/get-events";

export const metadata = {
  title: "Event Types - Positives Admin",
};

type SearchParams = Promise<{ error?: string; success?: string; q?: string; status?: string }>;

const SUCCESS_COPY: Record<string, string> = {
  type_created: "Event type created.",
  type_updated: "Event type updated.",
};

const ERROR_COPY: Record<string, string> = {
  type_name_required: "Add a type name before saving.",
  type_save_failed: "The event type could not be saved.",
};

export default async function EventTypesPage({ searchParams }: { searchParams: SearchParams }) {
  const [params, settings] = await Promise.all([searchParams, getEventSettingsOptions()]);
  const q = params.q?.toLowerCase().trim() ?? "";
  const status = params.status ?? "all";
  const types = settings.types.filter((type) => {
    const matchesSearch = !q || type.name.toLowerCase().includes(q) || type.slug.toLowerCase().includes(q);
    const matchesStatus = status === "all" || (status === "active" ? type.is_active : !type.is_active);
    return matchesSearch && matchesStatus;
  });

  return (
    <div style={{ maxWidth: "92rem" }}>
      <div className="admin-page-header">
        <div>
          <p className="admin-page-header__eyebrow">Events</p>
          <h1 className="admin-page-header__title" style={{ textWrap: "balance" }}>Event Types</h1>
          <p className="admin-page-header__subtitle">Reusable labels for workshops, webinars, Q&As, and member events.</p>
        </div>
        <div className="admin-page-header__actions">
          <Link href="/admin/events/settings" className="admin-btn admin-btn--outline">Settings</Link>
          <Link href="/admin/events/new" className="admin-btn admin-btn--primary">New event</Link>
        </div>
      </div>

      {params.success ? <div className="admin-banner admin-banner--success">{SUCCESS_COPY[params.success] ?? "Type saved."}</div> : null}
      {params.error ? <div className="admin-banner admin-banner--error">{ERROR_COPY[params.error] ?? "Type could not be saved."}</div> : null}

      <form className="admin-form-card mb-5" style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <label>
          <span className="admin-label">Search</span>
          <input name="q" defaultValue={params.q ?? ""} className="admin-input" placeholder="Workshop" />
        </label>
        <label>
          <span className="admin-label">Status</span>
          <select name="status" defaultValue={status} className="admin-select">
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
        <div style={{ display: "flex", alignItems: "end" }}>
          <button type="submit" className="admin-btn admin-btn--primary">Apply</button>
        </div>
      </form>

      <div className="grid gap-5 xl:grid-cols-[24rem_minmax(0,1fr)]">
        <div>
          <h2 className="admin-form-section__label mb-3" style={{ textWrap: "balance" }}>Create type</h2>
          <TypeForm />
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Slug</th>
                <th>Status</th>
                <th>Sort</th>
              </tr>
            </thead>
            <tbody>
              {types.map((type) => (
                <tr key={type.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ background: type.color }} />
                      <span className="font-semibold text-foreground">{type.name}</span>
                    </div>
                    {type.description ? <p className="mt-1 text-xs text-muted-foreground">{type.description}</p> : null}
                    <details className="mt-3">
                      <summary className="cursor-pointer text-xs font-semibold text-primary">Edit</summary>
                      <div className="mt-3"><TypeForm type={type} /></div>
                    </details>
                  </td>
                  <td>{type.slug}</td>
                  <td><span className={type.is_active ? "admin-badge admin-badge--published" : "admin-badge admin-badge--draft"}>{type.is_active ? "Active" : "Inactive"}</span></td>
                  <td>{type.sort_order}</td>
                </tr>
              ))}
              {types.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center text-sm text-muted-foreground">No event types match these filters.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
