import Link from "next/link";
import { getEventSettingsOptions } from "@/lib/queries/get-events";

export const metadata = {
  title: "Event Hosts - Positives Admin",
};

type SearchParams = Promise<{ error?: string; success?: string; q?: string; status?: string; type?: string }>;

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
  const type = params.type ?? "all";
  const hosts = settings.hosts.filter((host) => {
    const searchable = [host.name, host.email, host.website_url, host.type].filter(Boolean).join(" ").toLowerCase();
    const matchesSearch = !q || searchable.includes(q);
    const matchesStatus = status === "all" || host.status === status;
    const matchesType = type === "all" || host.type === type;
    return matchesSearch && matchesStatus && matchesType;
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
          <Link href="/admin/events/hosts/new" className="admin-btn admin-btn--primary">New host</Link>
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
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <label>
          <span className="admin-label">Type</span>
          <select name="type" defaultValue={type} className="admin-select">
            <option value="all">All</option>
            <option value="person">Person</option>
            <option value="organization">Organization</option>
            <option value="brand">Brand</option>
            <option value="internal_team">Internal team</option>
          </select>
        </label>
        <div style={{ display: "flex", alignItems: "end" }}>
          <button type="submit" className="admin-btn admin-btn--primary">Apply</button>
        </div>
      </form>

      <div className="grid gap-5">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Host</th>
                <th>Type</th>
                <th>Email</th>
                <th>Upcoming</th>
                <th>Status</th>
                <th>Website</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {hosts.map((host) => (
                <tr key={host.id}>
                  <td>
                    <div className="font-semibold text-foreground">{host.name}</div>
                    {host.bio ? <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{host.bio}</p> : null}
                  </td>
                  <td>{host.type.replace("_", " ")}</td>
                  <td>{host.email ?? "None"}</td>
                  <td>{host.upcoming_count ?? 0}</td>
                  <td><span className={host.status === "published" ? "admin-badge admin-badge--published" : "admin-badge admin-badge--draft"}>{host.status}</span></td>
                  <td>{host.website_url ? <a href={host.website_url} className="text-primary" target="_blank" rel="noopener noreferrer">Open</a> : "None"}</td>
                  <td>
                    <div className="flex flex-wrap gap-3 text-sm font-semibold">
                      <Link href={`/admin/events/hosts/${host.id}/edit`} className="text-primary">Edit</Link>
                      {host.status === "published" ? (
                        <Link href={`/events/hosts/${host.slug}`} className="text-primary">View</Link>
                      ) : null}
                      <Link href={`/admin/events?q=${encodeURIComponent(host.name)}`} className="text-primary">Events</Link>
                    </div>
                  </td>
                </tr>
              ))}
              {hosts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-sm text-muted-foreground">No hosts match these filters.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
