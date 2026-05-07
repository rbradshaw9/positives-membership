import Link from "next/link";
import {
  checkInEventAttendee,
  checkInEventAttendeeByLookup,
  reverseEventCheckIn,
} from "../actions";
import { getAttendeeAdminData, type AttendeeAdminRow, type AttendeeEventOption } from "../data";
import { formatEventDateRange } from "@/lib/events/dates";

export const metadata = {
  title: "Event Check-In - Positives Admin",
};

type SearchParams = Promise<{
  event_id?: string;
  q?: string;
  success?: string;
  error?: string;
}>;

const SUCCESS_COPY: Record<string, string> = {
  checked_in: "Attendee checked in.",
  check_in_reversed: "Check-in reversed.",
};

const ERROR_COPY: Record<string, string> = {
  lookup_required: "Enter a name, email, attendee number, security code, or ticket code.",
  lookup_not_found: "No matching attendee or ticket was found.",
  lookup_ambiguous: "More than one attendee matched. Narrow the event or search term.",
  lookup_failed: "Check-in lookup failed. Try again.",
  already_checked_in: "This attendee is already checked in.",
  check_in_required: "Choose an attendee before checking in.",
  check_in_blocked: "Canceled, refunded, or chargeback attendees cannot be checked in.",
  check_in_failed: "Check-in could not be saved.",
  check_in_reverse_failed: "Check-in could not be reversed.",
};

function queryString(params: Record<string, string | undefined>) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) qs.set(key, value);
  });
  const query = qs.toString();
  return query ? `?${query}` : "";
}

function eventLabel(event: AttendeeEventOption) {
  return `${event.title} · ${formatEventDateRange(event.starts_at, event.starts_at, "America/New_York", false)}`;
}

function activeCheckIn(attendee: AttendeeAdminRow) {
  return attendee.event_check_in?.find((row) => row.status === "checked_in") ?? null;
}

function returnTo(params: Awaited<SearchParams>) {
  return `/admin/events/attendees/check-in${queryString({
    event_id: params.event_id,
    q: params.q,
  })}`;
}

function CheckInAction({
  attendee,
  target,
}: {
  attendee: AttendeeAdminRow;
  target: string;
}) {
  const checkedIn = activeCheckIn(attendee);
  return checkedIn ? (
    <form action={reverseEventCheckIn}>
      <input type="hidden" name="attendee_id" value={attendee.id} />
      <input type="hidden" name="event_id" value={attendee.event_id} />
      <input type="hidden" name="return_to" value={target} />
      <button type="submit" className="admin-btn admin-btn--outline">
        Reverse
      </button>
    </form>
  ) : (
    <form action={checkInEventAttendee}>
      <input type="hidden" name="attendee_id" value={attendee.id} />
      <input type="hidden" name="event_id" value={attendee.event_id} />
      <input type="hidden" name="return_to" value={target} />
      <button
        type="submit"
        className="admin-btn admin-btn--primary"
        disabled={["canceled", "refunded", "chargeback"].includes(attendee.status)}
      >
        Check in
      </button>
    </form>
  );
}

export default async function EventCheckInPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const data = await getAttendeeAdminData({
    eventId: params.event_id,
    q: params.q,
    checkIn: "all",
    status: "all",
  });
  const target = returnTo(params);
  const selectedEvent = data.events.find((event) => event.id === params.event_id) ?? null;
  const recentMatches = data.attendees.slice(0, 25);
  const checkedInCount = recentMatches.filter((attendee) => Boolean(activeCheckIn(attendee))).length;

  return (
    <div style={{ maxWidth: "78rem" }}>
      <div className="admin-page-header admin-page-header--split">
        <div>
          <p className="admin-page-header__eyebrow">Events</p>
          <h1 className="admin-page-header__title" style={{ textWrap: "balance" }}>
            Check-In
          </h1>
          <p className="admin-page-header__subtitle">
            Search by security code, ticket code, attendee number, name, or email. This screen is built for phones at the door.
          </p>
        </div>
        <div className="admin-page-header__actions">
          <Link href="/admin/events/attendees" className="admin-btn admin-btn--outline">All attendees</Link>
          <Link href="/admin/events" className="admin-btn admin-btn--outline">Events</Link>
        </div>
      </div>

      {params.success ? (
        <div className="admin-banner admin-banner--success">
          {SUCCESS_COPY[params.success] ?? "Check-in updated."}
        </div>
      ) : null}
      {params.error ? (
        <div className="admin-banner admin-banner--error">
          {ERROR_COPY[params.error] ?? "Check-in failed."}
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <main className="grid gap-5">
          <form action={checkInEventAttendeeByLookup} className="admin-form-card">
            <input type="hidden" name="return_to" value={target} />
            <h2 className="admin-form-section__label" style={{ textWrap: "balance" }}>Manual lookup</h2>
            <p className="admin-hint">
              Exact security and ticket codes check in immediately. Name and email searches work best with an event selected.
            </p>
            <label className="admin-form-field mt-4">
              <span className="admin-label">Event</span>
              <select name="event_id" defaultValue={params.event_id ?? ""} className="admin-select">
                <option value="">Any event</option>
                {data.events.map((event) => (
                  <option key={event.id} value={event.id}>{eventLabel(event)}</option>
                ))}
              </select>
            </label>
            <label className="admin-form-field">
              <span className="admin-label">Lookup</span>
              <input
                name="lookup"
                defaultValue={params.q ?? ""}
                className="admin-input text-lg"
                placeholder="Code, name, email, or attendee number"
                autoComplete="off"
              />
            </label>
            <div className="admin-form-actions">
              <button type="submit" className="admin-btn admin-btn--primary w-full sm:w-auto">Check in attendee</button>
            </div>
          </form>

          <form className="admin-form-card" style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
            <label>
              <span className="admin-label">Filter event</span>
              <select name="event_id" defaultValue={params.event_id ?? ""} className="admin-select">
                <option value="">All events</option>
                {data.events.map((event) => (
                  <option key={event.id} value={event.id}>{event.title}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="admin-label">Search list</span>
              <input name="q" defaultValue={params.q ?? ""} className="admin-input" placeholder="Name, email, code" />
            </label>
            <div className="flex items-end gap-2">
              <button type="submit" className="admin-btn admin-btn--primary">Apply</button>
              <Link href="/admin/events/attendees/check-in" className="admin-btn admin-btn--outline">Reset</Link>
            </div>
          </form>

          <section className="grid gap-3">
            {recentMatches.map((attendee) => {
              const checkedIn = activeCheckIn(attendee);
              return (
                <article key={attendee.id} className="surface-card grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-heading text-lg font-semibold text-foreground" style={{ textWrap: "balance" }}>
                        {attendee.name ?? "Unnamed attendee"}
                      </h2>
                      <span className={checkedIn ? "admin-badge admin-badge--published" : "admin-badge admin-badge--draft"}>
                        {checkedIn ? "Checked in" : attendee.status.replace("_", " ")}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{attendee.email ?? "No attendee email"}</p>
                    <p className="mt-2 text-sm font-semibold text-foreground">
                      {attendee.member_event?.title ?? "Event removed"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {attendee.attendee_number} · Security code {attendee.security_code}
                    </p>
                    {checkedIn ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Checked in {new Date(checkedIn.checked_in_at).toLocaleString()}
                      </p>
                    ) : null}
                  </div>
                  <CheckInAction attendee={attendee} target={target} />
                </article>
              );
            })}
            {recentMatches.length === 0 ? (
              <div className="admin-empty-state">
                <h2 style={{ textWrap: "balance" }}>No attendees found.</h2>
                <p>Select an event or search for a code, name, or email to start checking people in.</p>
              </div>
            ) : null}
          </section>
        </main>

        <aside className="grid gap-4 self-start">
          <div className="surface-card p-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Current event</p>
            <h2 className="mt-2 font-heading text-xl font-semibold text-foreground" style={{ textWrap: "balance" }}>
              {selectedEvent?.title ?? "All events"}
            </h2>
            <dl className="mt-4 grid gap-2 text-sm">
              <div className="rounded-lg bg-muted/40 p-2">
                <dt className="font-semibold text-foreground">Matches</dt>
                <dd className="mt-1 text-muted-foreground">{recentMatches.length}</dd>
              </div>
              <div className="rounded-lg bg-muted/40 p-2">
                <dt className="font-semibold text-foreground">Checked in</dt>
                <dd className="mt-1 text-muted-foreground">{checkedInCount}</dd>
              </div>
              <div className="rounded-lg bg-muted/40 p-2">
                <dt className="font-semibold text-foreground">Remaining</dt>
                <dd className="mt-1 text-muted-foreground">{Math.max(0, recentMatches.length - checkedInCount)}</dd>
              </div>
            </dl>
          </div>
          <div className="surface-card p-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Scan-ready rules</p>
            <ul className="mt-3 grid gap-2 text-sm text-muted-foreground">
              <li>Already checked-in attendees are blocked from duplicate check-in.</li>
              <li>Canceled, refunded, and chargeback attendees cannot be checked in.</li>
              <li>Ticket codes and random security codes avoid exposing attendee IDs.</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
