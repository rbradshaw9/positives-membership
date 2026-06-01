import { getZoomConnections } from "@/lib/queries/get-events";
import { zoomConfigured } from "@/lib/zoom/client";
import { getAdminPermissionSet, isBootstrapAdminEmail, requireAdmin } from "@/lib/auth/require-admin";
import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";
import { runZoomConnectionSmokeTest, setCoachZoomDefault, verifyZoomConnection } from "./actions";

export const metadata = {
  title: "Zoom Integrations — Positives Admin",
};

type SearchParams = Promise<{ error?: string; success?: string; zoomConnectionId?: string }>;
type ZoomTestRunRow = {
  id: string;
  zoom_connection_id: string;
  status: "running" | "passed" | "failed";
  checks: Record<string, { ok?: boolean; detail?: string; id?: string }>;
  error: string | null;
  started_at: string;
  finished_at: string | null;
};

function errorMessage(error?: string) {
  if (error === "coach_profile_required") return "Create or link your coach profile before connecting a coach Zoom account.";
  if (error === "invalid_coach_zoom_connection") return "Choose one of your active coach Zoom accounts.";
  if (error === "platform_zoom_permission_denied") return "Only full admins can connect platform Zoom accounts.";
  if (error === "coach_zoom_permission_denied") return "Only coaches can connect coach-owned Zoom accounts.";
  if (error === "zoom_connection_forbidden") return "You do not have access to that Zoom account.";
  if (error === "zoom_verification_failed") return "Zoom verification failed. Check the connection notes below.";
  if (error === "zoom_smoke_failed") return "Zoom smoke test failed. Check the latest test evidence below.";
  if (error === "zoom_not_configured") return "Zoom OAuth is not configured yet.";
  if (error) return "Zoom connection failed or is incomplete.";
  return null;
}

function successMessage(success?: string) {
  if (success === "coach_default_saved") return "Coach Zoom default updated.";
  if (success === "zoom_verified") return "Zoom account verified for user, meeting, and webinar access.";
  if (success === "zoom_smoke_passed") return "Zoom smoke test passed: user lookup, meeting create/delete, and webinar create/delete worked.";
  if (success) return "Zoom account connected.";
  return null;
}

function hasScope(scopes: string[] | null | undefined, required: string) {
  return (scopes ?? []).includes(required);
}

function CapabilityBadge({ label, ok }: { label: string; ok: boolean }) {
  return (
    <span className={ok ? "admin-badge admin-badge--published" : "admin-badge admin-badge--review"}>
      {label}
    </span>
  );
}

function latestRunSummary(run?: ZoomTestRunRow) {
  if (!run) return "No smoke test yet";
  const checkedAt = run.finished_at ?? run.started_at;
  return `${run.status} · ${new Date(checkedAt).toLocaleString()}`;
}

function smokeCheckLabels(run?: ZoomTestRunRow) {
  if (!run?.checks) return [];
  return [
    ["User", run.checks.user],
    ["Meeting+", run.checks.meetingCreate],
    ["Meeting-", run.checks.meetingDelete],
    ["Webinar+", run.checks.webinarCreate],
    ["Webinar-", run.checks.webinarDelete],
  ] as const;
}

export default async function ZoomIntegrationsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireAdmin();
  const supabase = asLooseSupabaseClient(getAdminClient());
  const [params, connections, permissionSet, coachProfileResult, testRunsResult] = await Promise.all([
    searchParams,
    getZoomConnections(),
    getAdminPermissionSet(user.id, user.email),
    supabase
      .from("coach_profile")
      .select<{ id: string; display_name: string; zoom_connection_id: string | null }>(
        "id, display_name, zoom_connection_id"
      )
      .eq("member_id", user.id)
      .maybeSingle(),
    supabase
      .from("zoom_connection_test_run")
      .select<ZoomTestRunRow>("id, zoom_connection_id, status, checks, error, started_at, finished_at")
      .order("started_at", { ascending: false })
      .limit(50),
  ]);
  const configured = zoomConfigured();
  const webhookConfigured = Boolean(process.env.ZOOM_WEBHOOK_SECRET_TOKEN ?? process.env.ZOOM_SECRET_TOKEN);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://positives.life";
  const deauthorizationUrl = `${appUrl}/api/admin/integrations/zoom/deauthorization`;
  const canReadMembers = permissionSet.has("members.read") || isBootstrapAdminEmail(user.email);
  const coachProfile = coachProfileResult.data ?? null;
  const coachConnections = connections.filter(
    (connection) =>
      connection.owner_kind === "coach" &&
      connection.owner_member_id === user.id &&
      connection.status === "active"
  );
  const visibleConnections = canReadMembers ? connections : coachConnections;
  const error = errorMessage(params.error);
  const success = successMessage(params.success);
  const latestRunByConnection = new Map<string, ZoomTestRunRow>();
  for (const run of (testRunsResult.data ?? []) as unknown as ZoomTestRunRow[]) {
    if (!latestRunByConnection.has(run.zoom_connection_id)) {
      latestRunByConnection.set(run.zoom_connection_id, run);
    }
  }

  return (
    <div style={{ maxWidth: "72rem" }}>
      <div className="admin-page-header">
        <div>
          <p className="admin-page-header__eyebrow">Integrations</p>
          <h1 className="admin-page-header__title">Zoom accounts</h1>
          <p className="admin-page-header__subtitle">
            Connect platform Zoom accounts for events and coach-owned accounts for native coaching sessions.
          </p>
        </div>
        <div className="admin-page-header__actions flex-wrap">
          {configured ? (
            <>
              {canReadMembers ? (
                <a
                  href="/api/admin/integrations/zoom/connect?ownerKind=platform&returnTo=/admin/integrations/zoom"
                  className="admin-btn admin-btn--primary"
                >
                  Connect Platform Zoom
                </a>
              ) : null}
              {coachProfile ? (
                <a
                  href="/api/admin/integrations/zoom/connect?ownerKind=coach&returnTo=/admin/integrations/zoom"
                  className="admin-btn admin-btn--outline"
                >
                  Connect My Coaching Zoom
                </a>
              ) : null}
            </>
          ) : (
            <span className="admin-btn admin-btn--primary opacity-40 cursor-not-allowed" aria-disabled="true" title="Configure Zoom env vars first">
              Connect Zoom
            </span>
          )}
        </div>
      </div>

      {!configured ? (
        <div className="admin-banner admin-banner--error">
          Zoom OAuth is not configured yet. Add ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET, and
          ZOOM_REDIRECT_URI before connecting accounts.
        </div>
      ) : null}
      {error ? <div className="admin-banner admin-banner--error">{error}</div> : null}
      {success ? <div className="admin-banner admin-banner--success">{success}</div> : null}

      {coachProfile ? (
        <section className="mb-6 rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground" style={{ textWrap: "balance" }}>
                Coaching Zoom default
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {coachProfile.display_name} will host new coaching sessions from this Zoom account when possible.
              </p>
            </div>
            <span className={coachProfile.zoom_connection_id ? "admin-badge admin-badge--published" : "admin-badge admin-badge--review"}>
              {coachProfile.zoom_connection_id ? "Default set" : "Using platform fallback"}
            </span>
          </div>
          <div className="mt-4 flex flex-col gap-3">
            {coachConnections.length > 0 ? (
              coachConnections.map((connection) => {
                const selected = connection.id === coachProfile.zoom_connection_id;
                return (
                  <form key={connection.id} action={setCoachZoomDefault} className="flex flex-col gap-3 rounded-xl border border-border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <input type="hidden" name="connection_id" value={connection.id} />
                    <div>
                      <p className="font-semibold text-foreground">{connection.label}</p>
                      <p className="text-xs text-muted-foreground">{connection.zoom_user_email ?? "No email from Zoom"}</p>
                    </div>
                    <button type="submit" className={selected ? "admin-btn admin-btn--outline opacity-60" : "admin-btn admin-btn--outline"} disabled={selected}>
                      {selected ? "Current default" : "Use for coaching"}
                    </button>
                  </form>
                );
              })
            ) : (
              <p className="rounded-xl border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                No coach-owned Zoom accounts connected yet. Connect your coaching Zoom account to avoid using the platform fallback.
              </p>
            )}
            {coachProfile.zoom_connection_id ? (
              <form action={setCoachZoomDefault}>
                <input type="hidden" name="connection_id" value="" />
                <button type="submit" className="admin-btn admin-btn--outline">
                  Clear coach default
                </button>
              </form>
            ) : null}
          </div>
        </section>
      ) : null}

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
              <th>Capabilities</th>
              <th>Last checked</th>
              <th>Smoke test</th>
              <th>Notes</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleConnections.map((connection) => (
              <tr key={connection.id}>
                {(() => {
                  const latestRun = latestRunByConnection.get(connection.id);
                  return (
                    <>
                <td>
                  <div className="font-semibold text-foreground">{connection.label}</div>
                  <div className="text-xs text-muted-foreground">{connection.zoom_user_email ?? "No email from Zoom"}</div>
                </td>
                <td>{connection.owner_kind === "coach" ? "coach" : "platform"}</td>
                <td>
                  <span className={connection.status === "active" ? "admin-badge admin-badge--published" : "admin-badge admin-badge--review"}>
                    {connection.status}
                  </span>
                </td>
                <td>
                  <div className="flex flex-wrap gap-1">
                    <CapabilityBadge label="User" ok={hasScope(connection.scopes, "user:read:user")} />
                    <CapabilityBadge label="Meetings" ok={hasScope(connection.scopes, "meeting:write:meeting")} />
                    <CapabilityBadge label="Webinars" ok={hasScope(connection.scopes, "webinar:write:webinar")} />
                  </div>
                </td>
                <td>
                  <div className="text-sm text-muted-foreground">
                    <p>{connection.last_checked_at ? new Date(connection.last_checked_at).toLocaleString() : "Not verified"}</p>
                    <p className="text-xs">Connected {connection.last_connected_at ? new Date(connection.last_connected_at).toLocaleString() : "—"}</p>
                  </div>
                </td>
                <td>
                  <div className="flex flex-col gap-2">
                    <span className={
                      latestRun?.status === "passed"
                        ? "admin-badge admin-badge--published"
                        : latestRun?.status === "failed"
                          ? "admin-badge admin-badge--review"
                          : "admin-badge admin-badge--draft"
                    }>
                      {latestRunSummary(latestRun)}
                    </span>
                    {smokeCheckLabels(latestRun).length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {smokeCheckLabels(latestRun).map(([label, check]) => (
                          <CapabilityBadge key={label} label={label} ok={Boolean(check?.ok)} />
                        ))}
                      </div>
                    ) : null}
                  </div>
                </td>
                <td>{connection.last_error ?? "Ready for event setup"}</td>
                <td>
                  <div className="flex flex-col gap-2">
                    <form action={verifyZoomConnection}>
                      <input type="hidden" name="connection_id" value={connection.id} />
                      <button type="submit" className="admin-btn admin-btn--outline">
                        Verify read
                      </button>
                    </form>
                    <form action={runZoomConnectionSmokeTest}>
                      <input type="hidden" name="connection_id" value={connection.id} />
                      <button type="submit" className="admin-btn admin-btn--outline">
                        Smoke test
                      </button>
                    </form>
                  </div>
                </td>
                    </>
                  );
                })()}
              </tr>
            ))}
            {visibleConnections.length === 0 ? (
              <tr>
                <td colSpan={8}>No Zoom accounts connected yet.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
