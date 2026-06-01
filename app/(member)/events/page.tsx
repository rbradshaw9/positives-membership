import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";
import { requireActiveMember } from "@/lib/auth/require-active-member";
import {
  getMemberEventFilterOptions,
  getMemberEvents,
  type EventRow,
} from "@/lib/queries/get-events";
import { eventDateKey, shiftMonth } from "@/lib/events/dates";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/member/EmptyState";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { MemberEventCard } from "@/components/events/MemberEventCard";

export const metadata = {
  title: "Events — Positives",
  description: "Member events, live sessions, and replays available with your Positives membership.",
};

type SearchParams = Promise<{
  month?: string;
  view?: string;
  q?: string;
  type?: string;
  venue?: string;
  date?: string;
}>;

type MemberEvent = EventRow & {
  member_ticket_access?: boolean;
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const EVENTS_DEFAULT_TIMEZONE = "America/New_York";

function currentEventDateKey() {
  return formatInTimeZone(new Date(), EVENTS_DEFAULT_TIMEZONE, "yyyy-MM-dd");
}

function currentEventMonthKey() {
  return formatInTimeZone(new Date(), EVENTS_DEFAULT_TIMEZONE, "yyyy-MM");
}

function cleanParam(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function isMonthKey(value?: string) {
  return Boolean(value && /^\d{4}-\d{2}$/.test(value));
}

function isDateKey(value?: string) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function href(params: {
  month: string;
  view: "month" | "list";
  q?: string;
  type?: string;
  venue?: string;
  date?: string;
}) {
  const qs = new URLSearchParams();
  qs.set("month", params.month);
  qs.set("view", params.view);
  if (params.q) qs.set("q", params.q);
  if (params.type) qs.set("type", params.type);
  if (params.venue) qs.set("venue", params.venue);
  if (params.date) qs.set("date", params.date);
  return `/events?${qs.toString()}`;
}

function formatMonthLabel(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, monthNumber - 1, 1)));
}

function formatDateHeading(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

function groupEventsByDate(events: MemberEvent[]) {
  const groups = new Map<string, MemberEvent[]>();
  for (const event of events) {
    const key = eventDateKey(event.starts_at, event.timezone);
    groups.set(key, [...(groups.get(key) ?? []), event]);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
}

function eventStartTime(event: MemberEvent) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: event.timezone,
  }).format(new Date(event.starts_at));
}

function resolveSelectedDate(paramsDate: string | undefined, month: string, events: MemberEvent[]) {
  if (isDateKey(paramsDate) && paramsDate?.startsWith(month)) return paramsDate;
  const today = currentEventDateKey();
  if (today.startsWith(month)) return today;
  const firstEventDate = events[0] ? eventDateKey(events[0].starts_at, events[0].timezone) : null;
  return firstEventDate?.startsWith(month) ? firstEventDate : `${month}-01`;
}

function BrowseToolbar({
  month,
  view,
  query,
  type,
  venue,
  options,
}: {
  month: string;
  view: "month" | "list";
  query?: string;
  type?: string;
  venue?: string;
  options: Awaited<ReturnType<typeof getMemberEventFilterOptions>>;
}) {
  return (
    <SurfaceCard className="mb-5" padding="sm">
      <form action="/events" className="grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_1fr_1fr_auto_auto] lg:items-end">
        <input type="hidden" name="month" value={month} />
        <input type="hidden" name="view" value={view} />

        <label className="grid gap-1.5 text-sm font-medium text-foreground">
          Search events
          <input
            name="q"
            defaultValue={query ?? ""}
            placeholder="Search events"
            className="admin-input"
          />
        </label>

        <label className="grid gap-1.5 text-sm font-medium text-foreground">
          Event type
          <select name="type" defaultValue={type ?? ""} className="admin-select">
            <option value="">All types</option>
            {options.types.map((eventType) => (
              <option key={eventType.id} value={eventType.slug}>
                {eventType.name}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1.5 text-sm font-medium text-foreground">
          Location
          <select name="venue" defaultValue={venue ?? ""} className="admin-select">
            <option value="">All locations</option>
            {options.venues.map((eventVenue) => (
              <option key={eventVenue.id} value={eventVenue.slug}>
                {eventVenue.name}
              </option>
            ))}
          </select>
        </label>

        <Button type="submit" className="justify-center">
          Find events
        </Button>
        <Button href={href({ month, view })} variant="ghost" className="justify-center">
          Reset
        </Button>
      </form>
    </SurfaceCard>
  );
}

function ViewControls({
  month,
  view,
  query,
  type,
  venue,
}: {
  month: string;
  view: "month" | "list";
  query?: string;
  type?: string;
  venue?: string;
}) {
  const shared = { q: query, type, venue };
  return (
    <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <nav aria-label="Event month" className="flex flex-wrap gap-2">
        <Button href={href({ month: shiftMonth(month, -1), view, ...shared })} variant="outline" size="sm">
          Previous
        </Button>
        <Button href={href({ month: currentEventMonthKey(), view, ...shared })} variant="outline" size="sm">
          Today
        </Button>
        <Button href={href({ month: shiftMonth(month, 1), view, ...shared })} variant="outline" size="sm">
          Next
        </Button>
      </nav>

      <div className="flex flex-wrap items-center gap-3">
        <h2 className="heading-balance font-heading text-2xl font-semibold tracking-normal text-foreground">
          {formatMonthLabel(month)}
        </h2>
        <nav aria-label="Event view" className="flex rounded-full border border-border bg-background p-1">
          {([
            { value: "month", label: "Month" },
            { value: "list", label: "List" },
          ] as const).map(({ value: nextView, label }) => (
            <Link
              key={nextView}
              href={href({ month, view: nextView, ...shared })}
              aria-current={view === nextView ? "page" : undefined}
              className={[
                "rounded-full px-4 py-2 text-sm font-semibold transition",
                view === nextView
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}

function MonthView({
  events,
  calendarDays,
  month,
  selectedDate,
  nowMs,
  query,
  type,
  venue,
}: {
  events: MemberEvent[];
  calendarDays: Awaited<ReturnType<typeof getMemberEvents>>["calendarDays"];
  month: string;
  selectedDate: string;
  nowMs: number;
  query?: string;
  type?: string;
  venue?: string;
}) {
  const selectedEvents = events.filter(
    (event) => eventDateKey(event.starts_at, event.timezone) === selectedDate
  );
  const today = currentEventDateKey();
  const shared = { q: query, type, venue };

  return (
    <div className="space-y-6">
      <div className="hidden lg:block" data-events-month-desktop>
        <div className="grid grid-cols-7 rounded-t-[1.25rem] border border-border bg-surface-tint">
          {WEEKDAYS.map((day) => (
            <div key={day} className="px-3 py-3 text-center text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 overflow-hidden rounded-b-[1.25rem] border-x border-b border-border bg-card">
          {calendarDays.map((day) => {
            const isToday = day.date === today;
            const isPast = day.date < today;
            return (
              <div
                key={day.date}
                className={[
                  "min-h-36 border-r border-b border-border/80 p-3 last:border-r-0",
                  day.inMonth ? "bg-card" : "bg-muted/20",
                  isPast ? "text-muted-foreground" : "text-foreground",
                  isToday ? "ring-2 ring-inset ring-primary/40" : "",
                ].join(" ")}
              >
                <Link
                  href={href({ month, view: "month", date: day.date, ...shared })}
                  className="font-heading text-lg font-semibold hover:text-primary"
                >
                  {Number(day.date.slice(-2))}
                </Link>
                <div className="mt-2 space-y-1.5">
                  {day.events.slice(0, 3).map((event) => (
                    <Link
                      key={event.id}
                      href={`/events/${event.id}`}
                      className="block rounded-lg border border-primary/15 bg-primary/5 px-2 py-1.5 text-xs transition hover:border-primary/35"
                    >
                      <span className="line-clamp-2 font-semibold text-foreground">{event.title}</span>
                      <span className="mt-0.5 block text-[11px] text-muted-foreground">{eventStartTime(event)}</span>
                    </Link>
                  ))}
                  {day.events.length > 3 ? (
                    <Link
                      href={href({ month, view: "month", date: day.date, ...shared })}
                      className="block text-xs font-semibold text-primary"
                    >
                      +{day.events.length - 3} more
                    </Link>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="lg:hidden" data-events-month-mobile>
        <div className="grid grid-cols-7 gap-1.5">
          {WEEKDAYS.map((day) => (
            <div key={day} className="text-center text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              {day.slice(0, 1)}
            </div>
          ))}
          {calendarDays.map((day) => {
            const isSelected = day.date === selectedDate;
            const isToday = day.date === today;
            return (
              <Link
                key={day.date}
                href={href({ month, view: "month", date: day.date, ...shared })}
                className={[
                  "flex aspect-square flex-col items-center justify-center rounded-2xl border text-sm font-semibold transition",
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground"
                    : isToday
                      ? "border-primary/40 bg-primary/5 text-foreground"
                      : "border-border bg-card text-foreground",
                  day.inMonth ? "" : "opacity-45",
                ].join(" ")}
              >
                <span>{Number(day.date.slice(-2))}</span>
                {day.events.length > 0 ? (
                  <span
                    className={[
                      "mt-1 h-1.5 w-1.5 rounded-full",
                      isSelected ? "bg-primary-foreground" : "bg-secondary",
                    ].join(" ")}
                    aria-label={`${day.events.length} event${day.events.length === 1 ? "" : "s"}`}
                  />
                ) : null}
              </Link>
            );
          })}
        </div>
        <section className="mt-5 space-y-3" aria-label="Selected date events">
          <h2 className="heading-balance font-heading text-xl font-semibold tracking-normal text-foreground">
            {formatDateHeading(selectedDate)}
          </h2>
          {selectedEvents.length > 0 ? (
            selectedEvents.map((event) => (
              <MemberEventCard key={event.id} event={event} nowMs={nowMs} compact />
            ))
          ) : (
            <SurfaceCard>
              <p className="text-sm text-muted-foreground">
                No events are scheduled for this date.
              </p>
            </SurfaceCard>
          )}
        </section>
      </div>
    </div>
  );
}

function ListView({
  events,
  nowMs,
}: {
  events: MemberEvent[];
  nowMs: number;
}) {
  const groups = groupEventsByDate(events);
  return (
    <div className="space-y-8" data-events-list>
      {groups.map(([date, dateEvents]) => (
        <section key={date} className="space-y-3">
          <h2 className="heading-balance font-heading text-xl font-semibold tracking-normal text-foreground">
            {formatDateHeading(date)}
          </h2>
          <div className="grid gap-4">
            {dateEvents.map((event) => (
              <MemberEventCard key={event.id} event={event} nowMs={nowMs} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export default async function EventsPage({ searchParams }: { searchParams: SearchParams }) {
  const member = await requireActiveMember();
  const params = await searchParams;
  const view = params.view === "list" ? "list" : "month";
  const month = isMonthKey(params.month) ? params.month as string : currentEventMonthKey();
  const query = cleanParam(params.q);
  const type = cleanParam(params.type);
  const venue = cleanParam(params.venue);

  const [data, filterOptions] = await Promise.all([
    getMemberEvents({
      month,
      query,
      typeSlug: type,
      venueSlug: venue,
      memberId: member.id,
      memberTier: member.subscription_tier,
    }),
    getMemberEventFilterOptions(member.subscription_tier),
  ]);
  const selectedDate = resolveSelectedDate(params.date, data.month, data.events);
  const hasFilters = Boolean(query || type || venue);

  return (
    <div className="member-container py-8 pb-28 md:py-12">
      <section className="mb-7 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <p className="ui-section-eyebrow mb-3">Positives Plus</p>
          <h1 className="heading-balance font-heading text-4xl font-bold leading-heading tracking-normal text-foreground md:text-5xl">
            Events
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground">
            Live member events and replays that support the daily Positives practice without making you feel behind.
          </p>
        </div>
        <Button href="/today" variant="outline">
          Back to Today
        </Button>
      </section>

      <BrowseToolbar
        month={data.month}
        view={view}
        query={query}
        type={type}
        venue={venue}
        options={filterOptions}
      />

      <ViewControls
        month={data.month}
        view={view}
        query={query}
        type={type}
        venue={venue}
      />

      {data.events.length === 0 ? (
        <EmptyState
          icon={
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path d="M16 3v4M8 3v4M3 11h18" />
            </svg>
          }
          title={hasFilters ? "No events match those filters" : "No events are scheduled for this month"}
          subtitle={
            hasFilters
              ? "Try clearing the filters or checking another month."
              : "When a live event is available for your membership, it will appear here. Today is still the center of your practice."
          }
          action={
            hasFilters ? (
              <Button href={href({ month: data.month, view })}>Clear filters</Button>
            ) : (
              <Button href="/today">Go to Today</Button>
            )
          }
        />
      ) : view === "month" ? (
        <MonthView
          events={data.events}
          calendarDays={data.calendarDays}
          month={data.month}
          selectedDate={selectedDate}
          nowMs={data.nowMs}
          query={query}
          type={type}
          venue={venue}
        />
      ) : (
        <ListView events={data.events} nowMs={data.nowMs} />
      )}

      {data.events.length > 0 ? (
        <div className="mt-8 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button href={href({ month: shiftMonth(data.month, -1), view, q: query, type, venue })} variant="outline" size="sm">
              Previous events
            </Button>
            <Button href={href({ month: shiftMonth(data.month, 1), view, q: query, type, venue })} variant="outline" size="sm">
              Next events
            </Button>
          </div>
          <Button href={href({ month: data.month, view: "list", q: query, type, venue })} variant="ghost" size="sm">
            List view
          </Button>
        </div>
      ) : null}
    </div>
  );
}
