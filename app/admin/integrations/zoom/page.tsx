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
  const webhookConfigured = Boolean(process.env.ZOOM_WEBHOOK_SECRET_TOKEN ?? process.env.ZOOM_SECRET_TOKEN);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://positives.life";
  const deauthorizationUrl = `${appUrl}/api/admin/integrations/zoom/deauthorization`;

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

      <section className="mb-6 rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground" style={{ textWrap: "balance" }}>Marketplace webhook</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Use this endpoint for Zoom deauthorization notifications and endpoint URL validation.
            </p>
          </div>
          <span className={webhookConfigured ? "admin-badge admin-badge--published" : "admin-badge admin-badge--review"}>
            {webhookConfigured ? "Secret configured" : "Needs secret"}
          </span>
        </div>
        <div className="mt-4 rounded-xl border border-border bg-muted/40 px-4 py-3 font-mono text-sm break-all">
          {deauthorizationUrl}
        </div>
        {!webhookConfigured ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Add the Zoom app Secret Token as ZOOM_WEBHOOK_SECRET_TOKEN in Vercel before enabling this endpoint in Zoom.
          </p>
        ) : null}
      </section>

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
