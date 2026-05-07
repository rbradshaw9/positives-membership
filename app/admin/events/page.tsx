import Link from "next/link";
import { getAdminEvent, getAdminEvents, getEventAdminOptions } from "@/lib/queries/get-events";
import { accessLevelLabel, EVENT_ACCESS_LEVELS } from "@/lib/events/types";
import { formatEventDateRange, shiftMonth } from "@/lib/events/dates";

export const metadata = {
  title: "Events — Positives Admin",
};

type SearchParams = Promise<{
  month?: string;
  view?: string;
  status?: string;
  type?: string;
  access?: string;
  success?: string;
}>;

const STATUS_BADGE: Record<string, string> = {
  published: "admin-badge admin-badge--published",
  ready_for_review: "admin-badge admin-badge--review",
  draft: "admin-badge admin-badge--draft",
  canceled: "admin-badge admin-badge--past-due",
  postponed: "admin-badge admin-badge--review",
  archived: "admin-badge admin-badge--archived",
};

function buildHref(params: Record<string, string | undefined>) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) qs.set(key, value);
  });
  return `/admin/events?${qs.toString()}`;
}

function accessLabels(event: Awaited<ReturnType<typeof getAdminEvent>>) {
  return (event?.member_event_access_level ?? []).map((row) => accessLevelLabel(row.subscription_tier)).join(", ");
}

function virtualLabel(event: Awaited<ReturnType<typeof getAdminEvent>>) {
  if (event?.virtual_mode === "zoom") return "Zoom";
  if (event?.virtual_mode === "manual") return "Manual link";
  return "No virtual link";
}

function missingJoinLink(event: Awaited<ReturnType<typeof getAdminEvent>>) {
  if (event?.virtual_mode === "zoom") return !event.event_zoom_meeting?.join_url;
  if (event?.virtual_mode === "manual") return !event.manual_join_url;
  return false;
}

export default async function AdminEventsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const view = params.view === "list" ? "list" : "month";
  const [{ types }, data] = await Promise.all([
    getEventAdminOptions(),
    getAdminEvents({
      month: params.month,
      status: params.status ?? "all",
      typeId: params.type ?? "all",
      accessLevel: params.access ?? "all",
    }),
  ]);
  const month = data.month;

  return (
    <div style={{ maxWidth: "92rem" }}>
      <div className="admin-page-header">
        <div>
          <p className="admin-page-header__eyebrow">Events</p>
          <h1 className="admin-page-header__title">Events Calendar</h1>
          <p className="admin-page-header__subtitle">
            Create member-only events, schedule Zoom sessions, and manage calendar/list views.
          </p>
        </div>
        <div className="admin-page-header__actions">
          <Link href="/admin/events/settings" className="admin-btn admin-btn--outline">
            Event settings
          </Link>
          <Link href="/admin/integrations/zoom" className="admin-btn admin-btn--outline">
            Zoom integrations
          </Link>
          <Link href="/admin/events/new" className="admin-btn admin-btn--primary">
            New event
          </Link>
        </div>
      </div>

      {params.success ? <div className="admin-banner admin-banner--success">Event updated.</div> : null}

      <form className="admin-form-card mb-5" style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
        <input type="hidden" name="view" value={view} />
        <div>
          <label className="admin-label" htmlFor="month">Month</label>
          <input id="month" name="month" type="month" defaultValue={month} className="admin-input" />
        </div>
        <div>
          <label className="admin-label" htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue={params.status ?? "all"} className="admin-select">
            <option value="all">All statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="ready_for_review">Ready</option>
            <option value="canceled">Canceled</option>
            <option value="postponed">Postponed</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <div>
          <label className="admin-label" htmlFor="type">Type</label>
          <select id="type" name="type" defaultValue={params.type ?? "all"} className="admin-select">
            <option value="all">All types</option>
            {types.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
          </select>
        </div>
        <div>
          <label className="admin-label" htmlFor="access">Access</label>
          <select id="access" name="access" defaultValue={params.access ?? "all"} className="admin-select">
            <option value="all">All access levels</option>
            {EVENT_ACCESS_LEVELS.map((level) => <option key={level.value} value={level.value}>{level.label}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", alignItems: "end", gap: "0.5rem" }}>
          <button className="admin-btn admin-btn--primary" type="submit">Apply</button>
        </div>
      </form>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <Link href={buildHref({ ...params, month: shiftMonth(month, -1), view })} className="admin-btn admin-btn--outline">Previous</Link>
          <Link href={buildHref({ ...params, month: new Date().toISOString().slice(0, 7), view })} className="admin-btn admin-btn--outline">Today</Link>
          <Link href={buildHref({ ...params, month: shiftMonth(month, 1), view })} className="admin-btn admin-btn--outline">Next</Link>
        </div>
        <div className="flex gap-2">
          <Link href={buildHref({ ...params, month, view: "month" })} className={`admin-btn ${view === "month" ? "admin-btn--primary" : "admin-btn--outline"}`}>Month</Link>
          <Link href={buildHref({ ...params, month, view: "list" })} className={`admin-btn ${view === "list" ? "admin-btn--primary" : "admin-btn--outline"}`}>List</Link>
        </div>
      </div>

      {view === "month" ? (
        <>
          <div className="mb-3 grid grid-cols-7 gap-2">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
              <div key={day} className="px-2 py-1 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-7">
            {data.calendarDays.map((day) => (
              <div key={day.date} className="surface-card min-h-44 p-3" style={!day.inMonth ? { opacity: 0.58 } : undefined}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-heading text-lg font-semibold">{Number(day.date.slice(-2))}</span>
                  <Link href={`/admin/events/new?starts_at=${day.date}T12:00`} className="text-xs font-semibold text-primary">+ Event</Link>
                </div>
                <div className="flex flex-col gap-2">
                  {day.events.map((event) => (
                    <Link key={event.id} href={`/admin/events/${event.id}/edit`} className="rounded-xl border border-border bg-card/80 p-2 text-xs transition-colors hover:border-primary/30">
                      <span className="flex flex-wrap gap-1">
                        <span className={STATUS_BADGE[event.status] ?? "admin-badge"} style={{ fontSize: "0.58rem", padding: "0.1rem 0.4rem" }}>{event.status}</span>
                        <span className="admin-badge admin-badge--draft" style={{ fontSize: "0.58rem", padding: "0.1rem 0.4rem" }}>{virtualLabel(event)}</span>
                        {missingJoinLink(event) ? <span className="admin-badge admin-badge--review" style={{ fontSize: "0.58rem", padding: "0.1rem 0.4rem" }}>Needs link</span> : null}
                      </span>
                      <span className="mt-1 line-clamp-2 block font-semibold text-foreground">{event.title}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Event</th>
                <th>Date</th>
                <th>Type</th>
                <th>Access</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.events.map((event) => (
                <tr key={event.id}>
                  <td>
                    <div className="font-semibold text-foreground">{event.title}</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <span className="admin-badge admin-badge--draft">{virtualLabel(event)}</span>
                      {missingJoinLink(event) ? <span className="admin-badge admin-badge--review">Needs link</span> : null}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">{event.event_host?.name ?? "No host"}</div>
                  </td>
                  <td>{formatEventDateRange(event.starts_at, event.ends_at, event.timezone, event.all_day)}</td>
                  <td>{event.event_type?.name ?? "Event"}</td>
                  <td>{accessLabels(event)}</td>
                  <td><span className={STATUS_BADGE[event.status] ?? "admin-badge"}>{event.status}</span></td>
                  <td><Link href={`/admin/events/${event.id}/edit`} className="admin-btn admin-btn--outline">Edit</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
