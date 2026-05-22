import Link from "next/link";
import {
  addManualEventAttendee,
  cancelEventAttendee,
  checkInEventAttendee,
  resendEventAttendeeConfirmation,
  reverseEventCheckIn,
} from "./actions";
import type { AttendeeAdminRow, AttendeeEventOption, AttendeeRsvpOption } from "./data";
import { formatEventDateRange } from "@/lib/events/dates";

type AttendeeManagementProps = {
  attendees: AttendeeAdminRow[];
  events: AttendeeEventOption[];
  rsvpTypes: AttendeeRsvpOption[];
  params: {
    eventId?: string;
    q?: string;
    status?: string;
    checkIn?: string;
    success?: string;
    error?: string;
  };
  lockedEventId?: string;
  title?: string;
  subtitle?: string;
};

const STATUS_LABEL: Record<string, string> = {
  registered: "Registered",
  checked_in: "Checked in",
  canceled: "Canceled",
  refunded: "Refunded",
  chargeback: "Chargeback",
  no_show: "No show",
};

const SOURCE_LABEL: Record<string, string> = {
  rsvp: "RSVP",
  manual: "Manual",
  paid: "Paid",
  comp: "Comp",
};

const SUCCESS_COPY: Record<string, string> = {
  attendee_added: "Attendee added.",
  checked_in: "Attendee checked in.",
  check_in_reversed: "Check-in reversed.",
  attendee_canceled: "Attendee canceled.",
  confirmation_sent: "Confirmation email sent.",
  confirmation_skipped: "Confirmation email did not need to be resent.",
};

const ERROR_COPY: Record<string, string> = {
  attendee_event_required: "Choose an event before adding an attendee.",
  attendee_save_failed: "The attendee could not be added.",
  check_in_required: "Choose an attendee before changing check-in status.",
  check_in_blocked: "This attendee cannot be checked in.",
  already_checked_in: "This attendee is already checked in.",
  check_in_failed: "Check-in could not be saved. The attendee may already be checked in.",
  check_in_reverse_failed: "Check-in could not be reversed.",
  attendee_required: "Choose an attendee before canceling.",
  attendee_cancel_failed: "The attendee could not be canceled.",
  confirmation_send_failed: "Confirmation email could not be sent. Check the attendee email status.",
};

function queryString(params: Record<string, string | undefined>) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value && key !== "success" && key !== "error") qs.set(key, value);
  });
  const query = qs.toString();
  return query ? `?${query}` : "";
}

function activeCheckIn(attendee: AttendeeAdminRow) {
  return attendee.event_check_in?.find((row) => row.status === "checked_in") ?? null;
}

function confirmationStatus(attendee: AttendeeAdminRow) {
  if (attendee.confirmation_sent_at) return { label: "Sent", className: "admin-badge admin-badge--published" };
  if (attendee.confirmation_send_error) return { label: "Send failed", className: "admin-badge admin-badge--review" };
  if (attendee.confirmation_send_attempted_at) return { label: "Attempted", className: "admin-badge admin-badge--review" };
  return { label: "Not sent", className: "admin-badge admin-badge--draft" };
}

function customFieldSummary(attendee: AttendeeAdminRow) {
  const labelById = new Map(
    (attendee.event_rsvp_type?.registration_fields ?? []).map((field) => [field.id, field.label])
  );
  const entries = Object.entries(attendee.custom_field_values ?? {}).filter(([, value]) => {
    if (typeof value === "boolean") return value;
    return String(value ?? "").trim();
  });
  if (entries.length === 0) return null;
  return entries
    .slice(0, 3)
    .map(([key, value]) => `${labelById.get(key) ?? key.replaceAll("_", " ")}: ${typeof value === "boolean" ? "yes" : String(value)}`)
    .join(" · ");
}

function eventLabel(event: AttendeeEventOption) {
  return `${event.title} · ${formatEventDateRange(event.starts_at, event.starts_at, "America/New_York", false)}`;
}

function eventOptions(events: AttendeeEventOption[], lockedEventId?: string) {
  if (!lockedEventId) return events;
  return events.filter((event) => event.id === lockedEventId);
}

function rsvpOptions(rsvpTypes: AttendeeRsvpOption[], eventId?: string) {
  return eventId && eventId !== "all" ? rsvpTypes.filter((rsvp) => rsvp.event_id === eventId) : rsvpTypes;
}

function ActionHiddenFields({
  attendee,
  returnTo,
}: {
  attendee: AttendeeAdminRow;
  returnTo: string;
}) {
  return (
    <>
      <input type="hidden" name="attendee_id" value={attendee.id} />
      <input type="hidden" name="event_id" value={attendee.event_id} />
      <input type="hidden" name="return_to" value={returnTo} />
    </>
  );
}

export function AttendeeManagement({
  attendees,
  events,
  rsvpTypes,
  params,
  lockedEventId,
  title = "Attendees",
  subtitle = "Manage RSVPs, manual attendees, and check-ins across member events.",
}: AttendeeManagementProps) {
  const currentEventId = lockedEventId ?? params.eventId ?? "all";
  const currentPath = lockedEventId
    ? `/admin/events/${lockedEventId}/attendees`
    : `/admin/events/attendees${queryString({
        event_id: params.eventId,
        q: params.q,
        status: params.status,
        check_in: params.checkIn,
      })}`;
  const exportHref = lockedEventId
    ? `/admin/events/attendees/export?event_id=${lockedEventId}`
    : `/admin/events/attendees/export${queryString({
        event_id: params.eventId,
        q: params.q,
        status: params.status,
        check_in: params.checkIn,
      })}`;
  const scopedEvents = eventOptions(events, lockedEventId);
  const scopedRsvps = rsvpOptions(rsvpTypes, currentEventId);
  const checkedInCount = attendees.filter((attendee) => Boolean(activeCheckIn(attendee))).length;

  return (
    <div style={{ maxWidth: "92rem" }}>
      <div className="admin-page-header admin-page-header--split">
        <div>
          <p className="admin-page-header__eyebrow">Events</p>
          <h1 className="admin-page-header__title" style={{ textWrap: "balance" }}>{title}</h1>
          <p className="admin-page-header__subtitle">{subtitle}</p>
        </div>
        <div className="admin-page-header__actions">
          <Link href="/admin/events" className="admin-btn admin-btn--outline">Events</Link>
          <Link href="/admin/events/attendees/check-in" className="admin-btn admin-btn--outline">Check-in</Link>
          <Link href={exportHref} className="admin-btn admin-btn--outline">Export CSV</Link>
        </div>
      </div>

      {params.success ? (
        <div className="admin-banner admin-banner--success">{SUCCESS_COPY[params.success] ?? "Attendee updated."}</div>
      ) : null}
      {params.error ? (
        <div className="admin-banner admin-banner--error">{ERROR_COPY[params.error] ?? "Attendee update failed."}</div>
      ) : null}

      <div className="admin-events-summary-grid mb-5">
        <div className="admin-events-summary-card">
          <span>Total</span>
          <strong>{attendees.length}</strong>
        </div>
        <div className="admin-events-summary-card">
          <span>Checked in</span>
          <strong>{checkedInCount}</strong>
        </div>
        <div className="admin-events-summary-card">
          <span>Registered</span>
          <strong>{attendees.filter((attendee) => attendee.status === "registered").length}</strong>
        </div>
        <div className="admin-events-summary-card">
          <span>Canceled</span>
          <strong>{attendees.filter((attendee) => attendee.status === "canceled").length}</strong>
        </div>
      </div>

      <form className="admin-form-card mb-5" style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
        {lockedEventId ? <input type="hidden" name="event_id" value={lockedEventId} /> : null}
        {!lockedEventId ? (
          <label>
            <span className="admin-label">Event</span>
            <select name="event_id" defaultValue={currentEventId} className="admin-select">
              <option value="all">All events</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>{event.title}</option>
              ))}
            </select>
          </label>
        ) : null}
        <label>
          <span className="admin-label">Search</span>
          <input name="q" defaultValue={params.q ?? ""} className="admin-input" placeholder="Name, email, ticket number" />
        </label>
        <label>
          <span className="admin-label">Status</span>
          <select name="status" defaultValue={params.status ?? "all"} className="admin-select">
            <option value="all">All statuses</option>
            <option value="registered">Registered</option>
            <option value="checked_in">Checked in</option>
            <option value="canceled">Canceled</option>
            <option value="refunded">Refunded</option>
            <option value="no_show">No show</option>
          </select>
        </label>
        <label>
          <span className="admin-label">Check-in</span>
          <select name="check_in" defaultValue={params.checkIn ?? "all"} className="admin-select">
            <option value="all">All</option>
            <option value="checked_in">Checked in</option>
            <option value="not_checked_in">Not checked in</option>
          </select>
        </label>
        <div style={{ display: "flex", alignItems: "end", gap: "0.5rem" }}>
          <button type="submit" className="admin-btn admin-btn--primary">Apply</button>
          <Link href={lockedEventId ? `/admin/events/${lockedEventId}/attendees` : "/admin/events/attendees"} className="admin-btn admin-btn--outline">Reset</Link>
        </div>
      </form>

      <section className="admin-form-card mb-5">
        <div className="mb-4">
          <h2 className="font-heading text-xl font-semibold text-foreground" style={{ textWrap: "balance" }}>Add attendee</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Add a manual, comp, or RSVP attendee without changing Zoom, ticket inventory, or Stripe state.
          </p>
        </div>
        <form action={addManualEventAttendee} className="grid gap-3 md:grid-cols-2">
          <input type="hidden" name="return_to" value={currentPath} />
          <label>
            <span className="admin-label">Event</span>
            {lockedEventId ? (
              <input type="hidden" name="event_id" value={lockedEventId} />
            ) : null}
            <select name="event_id" defaultValue={lockedEventId ?? ""} className="admin-select" disabled={Boolean(lockedEventId)} required>
              <option value="">Choose event</option>
              {scopedEvents.map((event) => (
                <option key={event.id} value={event.id}>{eventLabel(event)}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="admin-label">RSVP type</span>
            <select name="rsvp_type_id" defaultValue="" className="admin-select">
              <option value="">No RSVP type</option>
              {scopedRsvps.map((rsvp) => (
                <option key={rsvp.id} value={rsvp.id}>{rsvp.name}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="admin-label">Member email</span>
            <input name="member_email" type="email" className="admin-input" placeholder="Optional existing member" />
          </label>
          <label>
            <span className="admin-label">Source</span>
            <select name="source" defaultValue="manual" className="admin-select">
              <option value="manual">Manual</option>
              <option value="rsvp">RSVP</option>
              <option value="comp">Comp</option>
            </select>
          </label>
          <label>
            <span className="admin-label">Attendee name</span>
            <input name="attendee_name" className="admin-input" placeholder="Optional" />
          </label>
          <label>
            <span className="admin-label">Attendee email</span>
            <input name="attendee_email" type="email" className="admin-input" placeholder="Optional" />
          </label>
          <div className="md:col-span-2">
            <button type="submit" className="admin-btn admin-btn--primary">Add attendee</button>
          </div>
        </form>
      </section>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Attendee</th>
              <th>Event</th>
              <th>Registration</th>
              <th>Confirmation</th>
              <th>Status</th>
              <th>Check-in</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {attendees.map((attendee) => {
              const checkIn = activeCheckIn(attendee);
              const confirmation = confirmationStatus(attendee);
              const customSummary = customFieldSummary(attendee);
              const returnTo = currentPath;
              return (
                <tr key={attendee.id}>
                  <td>
                    <div className="font-semibold text-foreground">{attendee.name ?? "Unnamed attendee"}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{attendee.email ?? "No attendee email"}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{attendee.attendee_number}</div>
                  </td>
                  <td>
                    {attendee.member_event ? (
                      <Link href={`/admin/events/${attendee.event_id}/edit`} className="font-semibold text-primary">
                        {attendee.member_event.title}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">Event removed</span>
                    )}
                    {attendee.member_event ? (
                      <div className="mt-1 text-xs text-muted-foreground">{attendee.member_event.status}</div>
                    ) : null}
                  </td>
                  <td>
                    <div>{attendee.event_rsvp_type?.name ?? SOURCE_LABEL[attendee.source] ?? attendee.source}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Purchaser: {attendee.purchaser_email ?? attendee.purchaser_name ?? "None"}
                    </div>
                    {customSummary ? (
                      <div className="mt-1 max-w-72 text-xs text-muted-foreground">
                        {customSummary}
                      </div>
                    ) : null}
                  </td>
                  <td>
                    <span className={confirmation.className}>{confirmation.label}</span>
                    {attendee.confirmation_sent_at ? (
                      <div className="mt-1 text-xs text-muted-foreground">
                        {new Date(attendee.confirmation_sent_at).toLocaleString()}
                      </div>
                    ) : attendee.confirmation_send_error ? (
                      <div className="mt-1 max-w-48 text-xs text-muted-foreground">
                        {attendee.confirmation_send_error}
                      </div>
                    ) : null}
                  </td>
                  <td>
                    <span className={attendee.status === "canceled" ? "admin-badge admin-badge--archived" : attendee.status === "checked_in" ? "admin-badge admin-badge--published" : "admin-badge admin-badge--draft"}>
                      {STATUS_LABEL[attendee.status] ?? attendee.status}
                    </span>
                  </td>
                  <td>
                    {checkIn ? (
                      <div>
                        <span className="admin-badge admin-badge--published">Checked in</span>
                        <div className="mt-1 text-xs text-muted-foreground">{new Date(checkIn.checked_in_at).toLocaleString()}</div>
                      </div>
                    ) : (
                      <span className="admin-badge admin-badge--draft">Not checked in</span>
                    )}
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      {!checkIn && attendee.status !== "canceled" ? (
                        <form action={checkInEventAttendee}>
                          <ActionHiddenFields attendee={attendee} returnTo={returnTo} />
                          <button type="submit" className="admin-btn admin-btn--outline">Check in</button>
                        </form>
                      ) : null}
                      {checkIn ? (
                        <form action={reverseEventCheckIn}>
                          <ActionHiddenFields attendee={attendee} returnTo={returnTo} />
                          <button type="submit" className="admin-btn admin-btn--outline">Reverse</button>
                        </form>
                      ) : null}
                      <form action={resendEventAttendeeConfirmation}>
                        <ActionHiddenFields attendee={attendee} returnTo={returnTo} />
                        <button type="submit" className="admin-btn admin-btn--outline">Resend</button>
                      </form>
                      {attendee.status !== "canceled" ? (
                        <form action={cancelEventAttendee}>
                          <ActionHiddenFields attendee={attendee} returnTo={returnTo} />
                          <button type="submit" className="admin-btn admin-btn--outline">Cancel</button>
                        </form>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
            {attendees.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className="admin-empty-state">
                    <h2 style={{ textWrap: "balance" }}>No attendees match these filters.</h2>
                    <p>RSVPs and manual attendees will show here once members register or an admin adds them.</p>
                  </div>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
