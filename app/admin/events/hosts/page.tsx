import Link from "next/link";
import { HostForm } from "../resource-forms";
import { getEventSettingsOptions } from "@/lib/queries/get-events";

export const metadata = {
  title: "Event Hosts - Positives Admin",
};

type SearchParams = Promise<{ error?: string; success?: string; q?: string; status?: string }>;

const SUCCESS_COPY: Record<string, string> = {
  host_created: "Host created.",
  host_updated: "Host updated.",
};

const ERROR_COPY: Record<string, string> = {
  host_name_required: "Add a host name before saving.",
  host_save_failed: "The host could not be saved.",
};

export default async function EventHostsPage({ searchParams }: { searchParams: SearchParams }) {
  const [params, settings] = await Promise.all([searchParams, getEventSettingsOptions()]);
  const q = params.q?.toLowerCase().trim() ?? "";
  const status = params.status ?? "all";
  const hosts = settings.hosts.filter((host) => {
    const matchesSearch = !q || host.name.toLowerCase().includes(q) || (host.email ?? "").toLowerCase().includes(q);
    const matchesStatus = status === "all" || (status === "active" ? host.is_active : !host.is_active);
    return matchesSearch && matchesStatus;
  });

  return (
    <div style={{ maxWidth: "92rem" }}>
      <div className="admin-page-header">
        <div>
          <p className="admin-page-header__eyebrow">Events</p>
          <h1 className="admin-page-header__title" style={{ textWrap: "balance" }}>Hosts</h1>
          <p className="admin-page-header__subtitle">Reusable organizer and coach profiles for event detail pages.</p>
        </div>
        <div className="admin-page-header__actions">
          <Link href="/admin/events/settings" className="admin-btn admin-btn--outline">Settings</Link>
          <Link href="/admin/events/new" className="admin-btn admin-btn--primary">New event</Link>
        </div>
      </div>

      {params.success ? <div className="admin-banner admin-banner--success">{SUCCESS_COPY[params.success] ?? "Host saved."}</div> : null}
      {params.error ? <div className="admin-banner admin-banner--error">{ERROR_COPY[params.error] ?? "Host could not be saved."}</div> : null}

      <form className="admin-form-card mb-5" style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <label>
          <span className="admin-label">Search</span>
          <input name="q" defaultValue={params.q ?? ""} className="admin-input" placeholder="Name or email" />
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
          <h2 className="admin-form-section__label mb-3" style={{ textWrap: "balance" }}>Create host</h2>
          <HostForm />
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Host</th>
                <th>Email</th>
                <th>Status</th>
                <th>Website</th>
              </tr>
            </thead>
            <tbody>
              {hosts.map((host) => (
                <tr key={host.id}>
                  <td>
                    <div className="font-semibold text-foreground">{host.name}</div>
                    {host.bio ? <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{host.bio}</p> : null}
                    <details className="mt-3">
                      <summary className="cursor-pointer text-xs font-semibold text-primary">Edit</summary>
                      <div className="mt-3"><HostForm host={host} /></div>
                    </details>
                  </td>
                  <td>{host.email ?? "None"}</td>
                  <td><span className={host.is_active ? "admin-badge admin-badge--published" : "admin-badge admin-badge--draft"}>{host.is_active ? "Active" : "Inactive"}</span></td>
                  <td>{host.website_url ? <a href={host.website_url} className="text-primary" target="_blank" rel="noopener noreferrer">Open</a> : "None"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
