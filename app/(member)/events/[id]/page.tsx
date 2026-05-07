import { notFound } from "next/navigation";
import Link from "next/link";
import { requireActiveMember } from "@/lib/auth/require-active-member";
import { getMemberEvent } from "@/lib/queries/get-events";
import { currentTimestampMs, formatEventDateRange } from "@/lib/events/dates";
import { EventDetailsBody } from "@/components/content/EventDetailsBody";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { Button } from "@/components/ui/Button";
import { EventTicketPurchasePanel } from "./EventTicketPurchasePanel";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ ticket?: string; ticket_error?: string }>;

function joinUrl(event: NonNullable<Awaited<ReturnType<typeof getMemberEvent>>>) {
  if (!event.member_ticket_access) return null;
  if (event.virtual_mode === "manual") return event.manual_join_url;
  if (event.virtual_mode === "zoom") return event.event_zoom_meeting?.join_url ?? null;
  return null;
}

function venueText(event: NonNullable<Awaited<ReturnType<typeof getMemberEvent>>>) {
  const venue = event.event_venue;
  if (!venue) return null;
  return [venue.name, venue.address_line1, venue.city, venue.region].filter(Boolean).join(", ");
}

export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const member = await requireActiveMember();
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const event = await getMemberEvent(id, member.subscription_tier, member.id);
  if (!event) notFound();

  const eventJoinUrl = joinUrl(event);
  const isPast = new Date(event.ends_at).getTime() < currentTimestampMs();
  const location = venueText(event);
  const body = event.body || event.description || "";
  const ticketRequired = event.ticketing_mode === "ticket_required";
  const hasTicketAccess = Boolean(event.member_ticket_access);

  return (
    <div className="member-container py-8 md:py-12">
      <Link href="/events" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Events
      </Link>

      <article className="space-y-6">
        <div>
          <div className="mb-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
              {event.event_type?.name ?? "Event"}
            </span>
            {isPast ? (
              <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Past event</span>
            ) : null}
            {ticketRequired ? (
              <span className="rounded-full bg-secondary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">
                {hasTicketAccess ? "Ticket confirmed" : "Ticket required"}
              </span>
            ) : null}
          </div>
          <h1 className="heading-balance font-heading text-3xl font-bold leading-heading tracking-tight text-foreground md:text-4xl">
            {event.title}
          </h1>
          {event.excerpt ? <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">{event.excerpt}</p> : null}
        </div>

        <SurfaceCard tone="tint" padding="lg" elevated>
          <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="ui-section-eyebrow mb-2">When</p>
              <p className="font-semibold text-foreground">
                {formatEventDateRange(event.starts_at, event.ends_at, event.timezone, event.all_day)}
              </p>
              {event.event_host?.name ? <p className="mt-2 text-sm text-muted-foreground">Hosted by {event.event_host.name}</p> : null}
              {location ? <p className="mt-2 text-sm text-muted-foreground">{location}</p> : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {eventJoinUrl && !isPast ? (
                <Button href={eventJoinUrl} target="_blank" rel="noopener noreferrer">Join event</Button>
              ) : null}
              <Button href={`/events/${event.id}/calendar`} variant="secondary">Add to calendar</Button>
            </div>
          </div>
        </SurfaceCard>

        {query.ticket === "success" || hasTicketAccess && ticketRequired ? (
          <SurfaceCard padding="lg">
            <p className="ui-section-eyebrow mb-2">Ticket</p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Your ticket is confirmed. The live link and replay are available from this page when they are ready.
            </p>
          </SurfaceCard>
        ) : null}

        {ticketRequired && !hasTicketAccess ? (
          <EventTicketPurchasePanel event={event} ticketError={query.ticket_error} />
        ) : null}

        {body ? (
          <SurfaceCard padding="lg" elevated>
            <EventDetailsBody content={body} />
          </SurfaceCard>
        ) : null}

        {isPast ? (
          <SurfaceCard padding="lg">
            <p className="ui-section-eyebrow mb-2">Replay</p>
            {event.replay_url && hasTicketAccess ? (
              <Button href={event.replay_url} target="_blank" rel="noopener noreferrer">Watch replay</Button>
            ) : ticketRequired && !hasTicketAccess ? (
              <p className="text-sm text-muted-foreground">Purchase a ticket to access the replay when it is available.</p>
            ) : (
              <p className="text-sm text-muted-foreground">Replay will appear here when it is ready.</p>
            )}
          </SurfaceCard>
        ) : null}
      </article>
    </div>
  );
}
