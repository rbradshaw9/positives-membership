import Link from "next/link";
import { getAdminEvents, getEventAdminOptions, type EventRow } from "@/lib/queries/get-events";
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
  q?: string;
  success?: string;
}>;

type EventView = "list" | "calendar";

const STATUS_BADGE: Record<string, string> = {
  published: "admin-badge admin-badge--published",
  ready_for_review: "admin-badge admin-badge--review",
  draft: "admin-badge admin-badge--draft",
  canceled: "admin-badge admin-badge--past-due",
  postponed: "admin-badge admin-badge--review",
  archived: "admin-badge admin-badge--archived",
};

const STATUS_LABEL: Record<string, string> = {
  published: "Published",
  ready_for_review: "Ready",
  draft: "Draft",
  canceled: "Canceled",
  postponed: "Postponed",
  archived: "Archived",
};

function buildHref(params: Record<string, string | undefined>) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value && key !== "success") qs.set(key, value);
  });
  const query = qs.toString();
  return query ? `/admin/events?${query}` : "/admin/events";
}

function buildEventsHref(
  params: Awaited<SearchParams>,
  overrides: Partial<Awaited<SearchParams>> = {}
) {
  return buildHref({
    month: params.month,
    view: params.view,
    status: params.status,
    type: params.type,
    access: params.access,
    q: params.q,
    ...overrides,
  });
}

function statusFilter(params: Awaited<SearchParams>) {
  return params.status ?? "active";
}

function accessLabels(event: EventRow | null | undefined) {
  const labels = (event?.member_event_access_level ?? []).map((row) => accessLevelLabel(row.subscription_tier));
  return labels.length > 0 ? labels.join(", ") : "No access selected";
}

function virtualLabel(event: EventRow | null | undefined) {
  if (event?.virtual_mode === "zoom") return "Zoom";
  if (event?.virtual_mode === "manual") return "Manual link";
  if (event?.virtual_mode === "livekit") return "Legacy LiveKit";
  return "No virtual link";
}

function missingJoinLink(event: EventRow | null | undefined) {
  if (event?.virtual_mode === "zoom") return !event.event_zoom_meeting?.join_url;
  if (event?.virtual_mode === "manual") return !event.manual_join_url;
  if (event?.virtual_mode === "livekit") return true;
  return false;
}

function ticketLabel(event: EventRow | null | undefined) {
  return event?.ticketing_mode === "ticket_required" ? "Ticket required" : "Included";
}

function locationLabel(event: EventRow | null | undefined) {
  if (!event) return "Not set";
  if (event.virtual_mode === "zoom") return "Zoom session";
  if (event.virtual_mode === "manual") return "Manual virtual link";
  if (event.virtual_mode === "livekit") return "Legacy LiveKit event";
  return event.event_venue?.name ?? "No venue";
}

function hostLabel(event: EventRow | null | undefined) {
  const hosts = (event?.event_host_assignment ?? []).flatMap((assignment) =>
    assignment.event_host ? [assignment.event_host.name] : []
  );
  if (hosts.length > 0) return hosts.join(", ");
  return event?.event_host?.name ?? "No host";
}

function readinessLabel(event: EventRow) {
  if (event.status === "archived") return "Archived";
  if (event.status !== "published") return "Admin only";
  if (missingJoinLink(event)) return "Needs join link";
  return "Member-ready";
}

function readinessBadge(event: EventRow) {
  if (event.status === "archived") return "admin-badge admin-badge--archived";
  if (event.status !== "published") return "admin-badge admin-badge--draft";
  if (missingJoinLink(event)) return "admin-badge admin-badge--review";
  return "admin-badge admin-badge--published";
}

function formatMonthLabel(month: string) {
  const [year, monthIndex] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, monthIndex - 1, 1))
  );
}

function formatTimezoneLabel(timezone: string) {
  const common: Record<string, string> = {
    "America/New_York": "Eastern Time",
    "America/Chicago": "Central Time",
    "America/Denver": "Mountain Time",
    "America/Phoenix": "Arizona Time",
    "America/Los_Angeles": "Pacific Time",
    "America/Anchorage": "Alaska Time",
    "Pacific/Honolulu": "Hawaii Time",
    UTC: "UTC",
  };
  return common[timezone] ?? timezone.replaceAll("_", " ");
}

export default async function AdminEventsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const view: EventView = params.view === "calendar" || params.view === "month" ? "calendar" : "list";
  const [{ types }, data] = await Promise.all([
    getEventAdminOptions(),
    getAdminEvents({
      month: params.month,
      status: statusFilter(params),
      typeId: params.type ?? "all",
      accessLevel: params.access ?? "all",
      query: params.q,
    }),
  ]);
  const month = data.month;
  const monthLabel = formatMonthLabel(month);
  const visibleEvents = data.events.filter((event) => event.status !== "archived");
  const publishedCount = visibleEvents.filter((event) => event.status === "published").length;
  const draftCount = visibleEvents.filter((event) => event.status === "draft").length;
  const needsLinkCount = visibleEvents.filter(missingJoinLink).length;
  const ticketedCount = visibleEvents.filter((event) => event.ticketing_mode === "ticket_required").length;

  return (
    <div style={{ maxWidth: "92rem" }}>
      <div className="admin-page-header admin-page-header--split">
        <div>
          <p className="admin-page-header__eyebrow">Events</p>
          <h1 className="admin-page-header__title" style={{ textWrap: "balance" }}>Events</h1>
          <p className="admin-page-header__subtitle">
            Manage member-only events from a practical list, with the calendar available when timing needs a visual check.
          </p>
        </div>
        <div className="admin-page-header__actions">
          <Link href="/admin/events/new" className="admin-btn admin-btn--primary">
            New event
          </Link>
        </div>
      </div>

      {params.success ? <div className="admin-banner admin-banner--success">Event updated.</div> : null}

      <div className="admin-events-toolbar mb-5">
        <div>
          <p className="admin-events-toolbar__label">Showing {data.events.length} event{data.events.length === 1 ? "" : "s"}</p>
          <p className="admin-events-toolbar__meta">{monthLabel}</p>
        </div>
        <nav className="admin-view-toggle" aria-label="Event view">
          <Link
            href={buildEventsHref(params, { month, view: undefined })}
            className={`admin-view-toggle__link${view === "list" ? " admin-view-toggle__link--active" : ""}`}
            aria-current={view === "list" ? "page" : undefined}
          >
            List
          </Link>
          <Link
            href={buildEventsHref(params, { month, view: "calendar" })}
            className={`admin-view-toggle__link${view === "calendar" ? " admin-view-toggle__link--active" : ""}`}
            aria-current={view === "calendar" ? "page" : undefined}
          >
            Calendar
          </Link>
        </nav>
      </div>

      <form className="admin-form-card mb-5" style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
        {view === "calendar" ? <input type="hidden" name="view" value="calendar" /> : null}
        <div style={{ gridColumn: "1 / -1" }}>
          <label className="admin-label" htmlFor="q">Search</label>
          <input id="q" name="q" type="search" defaultValue={params.q ?? ""} className="admin-input" placeholder="Title, host, type, venue, or status" />
        </div>
        <div>
          <label className="admin-label" htmlFor="month">Month</label>
          <input id="month" name="month" type="month" defaultValue={month} className="admin-input" />
        </div>
        <div>
          <label className="admin-label" htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue={statusFilter(params)} className="admin-select">
            <option value="active">Active statuses</option>
            <option value="all">All statuses, including archived</option>
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
          <Link href={buildEventsHref(params, { month, q: undefined, status: undefined, type: undefined, access: undefined })} className="admin-btn admin-btn--outline">
            Reset
          </Link>
        </div>
      </form>

      <div className="admin-events-summary-grid mb-5">
        <div className="admin-events-summary-card">
          <span>Published</span>
          <strong>{publishedCount}</strong>
        </div>
        <div className="admin-events-summary-card">
          <span>Drafts</span>
          <strong>{draftCount}</strong>
        </div>
        <div className="admin-events-summary-card">
          <span>Needs link</span>
          <strong>{needsLinkCount}</strong>
        </div>
        <div className="admin-events-summary-card">
          <span>Ticketed</span>
          <strong>{ticketedCount}</strong>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <Link href={buildEventsHref(params, { month: shiftMonth(month, -1), view: view === "calendar" ? "calendar" : undefined })} className="admin-btn admin-btn--outline">Previous month</Link>
          <Link href={buildEventsHref(params, { month: new Date().toISOString().slice(0, 7), view: view === "calendar" ? "calendar" : undefined })} className="admin-btn admin-btn--outline">This month</Link>
          <Link href={buildEventsHref(params, { month: shiftMonth(month, 1), view: view === "calendar" ? "calendar" : undefined })} className="admin-btn admin-btn--outline">Next month</Link>
        </div>
      </div>

      {view === "calendar" ? (
        <>
          <div className="mb-3 grid grid-cols-7 gap-2">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
              <div key={day} className="px-2 py-1 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{day}</div>
            ))}
          </div>
          <div className="admin-events-calendar-grid grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-7">
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
                        <span className="admin-badge admin-badge--draft" style={{ fontSize: "0.58rem", padding: "0.1rem 0.4rem" }}>{ticketLabel(event)}</span>
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
          <table className="admin-table admin-events-table">
            <thead>
              <tr>
                <th>Event</th>
                <th>Schedule</th>
                <th>Type</th>
                <th>Access</th>
                <th>Status</th>
                <th>Readiness</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {data.events.length > 0 ? (
                data.events.map((event) => (
                  <tr key={event.id}>
                    <td>
                      <Link href={`/admin/events/${event.id}/edit`} className="admin-events-table__title">
                        {event.title}
                      </Link>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <span className="admin-badge admin-badge--draft">{virtualLabel(event)}</span>
                        <span className="admin-badge admin-badge--draft">{ticketLabel(event)}</span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">{hostLabel(event)}</div>
                    </td>
                    <td>
                      <div className="font-medium text-foreground">{formatEventDateRange(event.starts_at, event.ends_at, event.timezone, event.all_day)}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{formatTimezoneLabel(event.timezone)}</div>
                    </td>
                    <td>
                      <div>{event.event_type?.name ?? "Event"}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{locationLabel(event)}</div>
                    </td>
                    <td>{accessLabels(event)}</td>
                    <td><span className={STATUS_BADGE[event.status] ?? "admin-badge"}>{STATUS_LABEL[event.status] ?? event.status}</span></td>
                    <td><span className={readinessBadge(event)}>{readinessLabel(event)}</span></td>
                    <td>
                      <div className="flex flex-wrap gap-1.5">
                        <Link href={`/admin/events/${event.id}/edit`} className="admin-btn admin-btn--outline">Edit</Link>
                        <Link href={`/admin/events/attendees?event_id=${event.id}`} className="admin-btn admin-btn--ghost">Attendees</Link>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7}>
                    <div className="admin-empty-state">
                      <h2 style={{ textWrap: "balance" }}>No events match these filters.</h2>
                      <p>Adjust the month, search, status, type, or access filters to find the event you need.</p>
                      <Link href="/admin/events/new" className="admin-btn admin-btn--primary">New event</Link>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
