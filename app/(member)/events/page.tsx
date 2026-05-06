import Link from "next/link";
import { requireActiveMember } from "@/lib/auth/require-active-member";
import { getMemberEvents } from "@/lib/queries/get-events";
import { PageHeader } from "@/components/member/PageHeader";
import { EmptyState } from "@/components/member/EmptyState";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { Button } from "@/components/ui/Button";
import { formatEventDateRange, shiftMonth } from "@/lib/events/dates";

export const metadata = {
  title: "Events — Positives",
  description: "Member events, live sessions, and replays available with your Positives membership.",
};

type SearchParams = Promise<{ month?: string; view?: string }>;

function href(params: Record<string, string>) {
  const qs = new URLSearchParams(params);
  return `/events?${qs.toString()}`;
}

function joinUrl(event: Awaited<ReturnType<typeof getMemberEvents>>["events"][number]) {
  if (event.virtual_mode === "manual") return event.manual_join_url;
  if (event.virtual_mode === "zoom") return event.event_zoom_meeting?.join_url ?? null;
  return null;
}

function EventListItem({
  event,
  nowMs,
}: {
  event: Awaited<ReturnType<typeof getMemberEvents>>["events"][number];
  nowMs: number;
}) {
  const starts = new Date(event.starts_at).getTime();
  const ends = new Date(event.ends_at).getTime();
  const isLive = starts <= nowMs && ends >= nowMs;
  const isPast = ends < nowMs;
  const eventJoinUrl = joinUrl(event);

  return (
    <SurfaceCard elevated as="article" className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
            {event.event_type?.name ?? "Event"}
          </span>
          {isLive ? (
            <span className="rounded-full bg-secondary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">
              Happening now
            </span>
          ) : null}
          {isPast ? (
            <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Past event
            </span>
          ) : null}
        </div>
        <h2 className="heading-balance font-heading text-xl font-semibold tracking-tight text-foreground">
          <Link href={`/events/${event.id}`} className="hover:text-primary">
            {event.title}
          </Link>
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {formatEventDateRange(event.starts_at, event.ends_at, event.timezone, event.all_day)}
        </p>
        {event.event_host?.name ? (
          <p className="mt-1 text-xs font-medium text-muted-foreground">Hosted by {event.event_host.name}</p>
        ) : null}
        {(event.excerpt ?? event.description) ? (
          <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {event.excerpt ?? event.description}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        {eventJoinUrl && !isPast ? (
          <Button href={eventJoinUrl} target="_blank" rel="noopener noreferrer" size="sm">
            Join
          </Button>
        ) : null}
        <Button href={`/events/${event.id}`} variant="secondary" size="sm">
          Details
        </Button>
      </div>
    </SurfaceCard>
  );
}

export default async function EventsPage({ searchParams }: { searchParams: SearchParams }) {
  const member = await requireActiveMember();
  const params = await searchParams;
  const view = params.view === "list" ? "list" : "month";
  const data = await getMemberEvents({
    month: params.month,
    memberTier: member.subscription_tier,
  });
  const month = data.month;
  const upcoming = data.events.filter((event) => new Date(event.ends_at).getTime() >= data.nowMs);
  const past = data.events.filter((event) => new Date(event.ends_at).getTime() < data.nowMs);

  return (
    <div>
      <PageHeader
        title="Events"
        subtitle="Live member events and replays available with your membership."
        hero
      />

      <div className="member-container py-6 md:py-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <Button href={href({ month: shiftMonth(month, -1), view })} variant="outline" size="sm">Previous</Button>
            <Button href={href({ month: new Date().toISOString().slice(0, 7), view })} variant="outline" size="sm">Today</Button>
            <Button href={href({ month: shiftMonth(month, 1), view })} variant="outline" size="sm">Next</Button>
          </div>
          <div className="flex gap-2">
            <Button href={href({ month, view: "month" })} variant={view === "month" ? "primary" : "outline"} size="sm">Month</Button>
            <Button href={href({ month, view: "list" })} variant={view === "list" ? "primary" : "outline"} size="sm">List</Button>
          </div>
        </div>

        {data.events.length === 0 ? (
          <EmptyState
            icon={
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <rect x="3" y="5" width="18" height="16" rx="2" />
                <path d="M16 3v4M8 3v4M3 11h18" />
              </svg>
            }
            title="No events are scheduled for this month"
            subtitle="When a live event is available for your membership, it will appear here. Today is still the center of your practice."
            action={<Button href="/today">Go to Today</Button>}
          />
        ) : view === "month" ? (
          <>
            <div className="mb-3 grid grid-cols-7 gap-2">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                <div key={day} className="px-2 py-1 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{day}</div>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-7">
              {data.calendarDays.map((day) => (
                <SurfaceCard key={day.date} className="min-h-40 p-3" elevated={day.events.length > 0}>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-heading text-lg font-semibold text-foreground">{Number(day.date.slice(-2))}</span>
                    {!day.inMonth ? <span className="text-[10px] text-muted-foreground">{day.date.slice(5, 7)}</span> : null}
                  </div>
                  <div className="flex flex-col gap-2">
                    {day.events.map((event) => (
                      <Link key={event.id} href={`/events/${event.id}`} className="rounded-xl border border-primary/15 bg-primary/5 p-2 text-xs transition-colors hover:border-primary/35">
                        <span className="line-clamp-2 font-semibold text-foreground">{event.title}</span>
                        <span className="mt-1 block text-[11px] text-muted-foreground">
                          {new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: event.timezone }).format(new Date(event.starts_at))}
                        </span>
                      </Link>
                    ))}
                  </div>
                </SurfaceCard>
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-6">
            <section>
              <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Upcoming</h2>
              <div className="flex flex-col gap-3">
                {upcoming.length > 0 ? upcoming.map((event) => <EventListItem key={event.id} event={event} nowMs={data.nowMs} />) : (
                  <SurfaceCard><p className="text-sm text-muted-foreground">No upcoming events this month.</p></SurfaceCard>
                )}
              </div>
            </section>
            {past.length > 0 ? (
              <section>
                <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Past events</h2>
                <div className="flex flex-col gap-3">{past.map((event) => <EventListItem key={event.id} event={event} nowMs={data.nowMs} />)}</div>
              </section>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
