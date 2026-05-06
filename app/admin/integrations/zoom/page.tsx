import Link from "next/link";
import { getZoomConnections } from "@/lib/queries/get-events";
import { zoomConfigured } from "@/lib/zoom/client";

export const metadata = {
  title: "Zoom Integrations — Positives Admin",
};

type SearchParams = Promise<{ error?: string; success?: string }>;

export default async function ZoomIntegrationsPage({ searchParams }: { searchParams: SearchParams }) {
  const [params, connections] = await Promise.all([searchParams, getZoomConnections()]);
  const configured = zoomConfigured();

  return (
    <div style={{ maxWidth: "72rem" }}>
      <div className="admin-page-header">
        <div>
          <p className="admin-page-header__eyebrow">Integrations</p>
          <h1 className="admin-page-header__title">Zoom accounts</h1>
          <p className="admin-page-header__subtitle">
            Connect Zoom accounts that admins can use when creating member events.
          </p>
        </div>
        <div className="admin-page-header__actions">
          <Link
            href="/api/admin/integrations/zoom/connect?returnTo=/admin/integrations/zoom"
            className="admin-btn admin-btn--primary"
            aria-disabled={!configured}
          >
            Connect Zoom
          </Link>
        </div>
      </div>

      {!configured ? (
        <div className="admin-banner admin-banner--error">
          Zoom OAuth is not configured yet. Add ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET, and
          ZOOM_REDIRECT_URI before connecting accounts.
        </div>
      ) : null}
      {params.error ? <div className="admin-banner admin-banner--error">Zoom connection failed or is incomplete.</div> : null}
      {params.success ? <div className="admin-banner admin-banner--success">Zoom account connected.</div> : null}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Account</th>
              <th>Owner</th>
              <th>Status</th>
              <th>Last connected</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {connections.map((connection) => (
              <tr key={connection.id}>
                <td>
                  <div className="font-semibold text-foreground">{connection.label}</div>
                  <div className="text-xs text-muted-foreground">{connection.zoom_user_email ?? "No email from Zoom"}</div>
                </td>
                <td>{connection.owner_kind}</td>
                <td>
                  <span className={connection.status === "active" ? "admin-badge admin-badge--published" : "admin-badge admin-badge--review"}>
                    {connection.status}
                  </span>
                </td>
                <td>{connection.last_connected_at ? new Date(connection.last_connected_at).toLocaleString() : "—"}</td>
                <td>{connection.last_error ?? "Ready for event setup"}</td>
              </tr>
            ))}
            {connections.length === 0 ? (
              <tr>
                <td colSpan={5}>No Zoom accounts connected yet.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
