import Link from "next/link";
import { VenueForm } from "../resource-forms";
import { getEventSettingsOptions } from "@/lib/queries/get-events";

export const metadata = {
  title: "Event Venues - Positives Admin",
};

type SearchParams = Promise<{ error?: string; success?: string; q?: string; status?: string; mode?: string }>;

const SUCCESS_COPY: Record<string, string> = {
  venue_created: "Venue created.",
  venue_updated: "Venue updated.",
};

const ERROR_COPY: Record<string, string> = {
  venue_name_required: "Add a venue name before saving.",
  venue_save_failed: "The venue could not be saved.",
};

export default async function EventVenuesPage({ searchParams }: { searchParams: SearchParams }) {
  const [params, settings] = await Promise.all([searchParams, getEventSettingsOptions()]);
  const q = params.q?.toLowerCase().trim() ?? "";
  const status = params.status ?? "all";
  const mode = params.mode ?? "all";
  const venues = settings.venues.filter((venue) => {
    const location = [venue.name, venue.city, venue.region, venue.country].filter(Boolean).join(" ").toLowerCase();
    const matchesSearch = !q || location.includes(q);
    const matchesStatus = status === "all" || (status === "active" ? venue.is_active : !venue.is_active);
    const matchesMode = mode === "all" || (mode === "virtual" ? venue.is_virtual : !venue.is_virtual);
    return matchesSearch && matchesStatus && matchesMode;
  });

  return (
    <div style={{ maxWidth: "92rem" }}>
      <div className="admin-page-header">
        <div>
          <p className="admin-page-header__eyebrow">Events</p>
          <h1 className="admin-page-header__title" style={{ textWrap: "balance" }}>Venues</h1>
          <p className="admin-page-header__subtitle">Reusable physical, virtual, and hybrid locations for the event editor.</p>
        </div>
        <div className="admin-page-header__actions">
          <Link href="/admin/events/settings" className="admin-btn admin-btn--outline">Settings</Link>
          <Link href="/admin/events/new" className="admin-btn admin-btn--primary">New event</Link>
        </div>
      </div>

      {params.success ? <div className="admin-banner admin-banner--success">{SUCCESS_COPY[params.success] ?? "Venue saved."}</div> : null}
      {params.error ? <div className="admin-banner admin-banner--error">{ERROR_COPY[params.error] ?? "Venue could not be saved."}</div> : null}

      <form className="admin-form-card mb-5" style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
        <label>
          <span className="admin-label">Search</span>
          <input name="q" defaultValue={params.q ?? ""} className="admin-input" placeholder="Venue or city" />
        </label>
        <label>
          <span className="admin-label">Status</span>
          <select name="status" defaultValue={status} className="admin-select">
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
        <label>
          <span className="admin-label">Mode</span>
          <select name="mode" defaultValue={mode} className="admin-select">
            <option value="all">All</option>
            <option value="physical">Physical</option>
            <option value="virtual">Virtual</option>
          </select>
        </label>
        <div style={{ display: "flex", alignItems: "end" }}>
          <button type="submit" className="admin-btn admin-btn--primary">Apply</button>
        </div>
      </form>

      <div className="grid gap-5 xl:grid-cols-[24rem_minmax(0,1fr)]">
        <div>
          <h2 className="admin-form-section__label mb-3" style={{ textWrap: "balance" }}>Create venue</h2>
          <VenueForm />
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Venue</th>
                <th>Location</th>
                <th>Mode</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {venues.map((venue) => (
                <tr key={venue.id}>
                  <td>
                    <div className="font-semibold text-foreground">{venue.name}</div>
                    {venue.description ? <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{venue.description}</p> : null}
                    <details className="mt-3">
                      <summary className="cursor-pointer text-xs font-semibold text-primary">Edit</summary>
                      <div className="mt-3"><VenueForm venue={venue} /></div>
                    </details>
                  </td>
                  <td>{[venue.address_line1, venue.city, venue.region].filter(Boolean).join(", ") || "None"}</td>
                  <td><span className="admin-badge admin-badge--draft">{venue.is_virtual ? "Virtual" : "Physical"}</span></td>
                  <td><span className={venue.is_active ? "admin-badge admin-badge--published" : "admin-badge admin-badge--draft"}>{venue.is_active ? "Active" : "Inactive"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
