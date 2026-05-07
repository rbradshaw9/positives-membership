import { notFound } from "next/navigation";
import Link from "next/link";
import { requireActiveMember } from "@/lib/auth/require-active-member";
import { getMemberEvent } from "@/lib/queries/get-events";
import { currentTimestampMs, formatEventDateRange } from "@/lib/events/dates";
import { EventDetailsBody } from "@/components/content/EventDetailsBody";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { Button } from "@/components/ui/Button";
import { EventTicketPurchasePanel } from "./EventTicketPurchasePanel";
import { registerEventRsvp } from "./actions";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ ticket?: string; ticket_error?: string; rsvp?: string; rsvp_error?: string }>;

function joinUrl(event: NonNullable<Awaited<ReturnType<typeof getMemberEvent>>>) {
  if (!event.member_ticket_access) return null;
  if (event.virtual_mode === "manual") return event.manual_join_url;
  if (event.virtual_mode === "zoom") return event.event_zoom_meeting?.join_url ?? null;
  return null;
}

function venueText(event: NonNullable<Awaited<ReturnType<typeof getMemberEvent>>>) {
  const venue = event.event_venue;
  if (!venue) return null;
  return [venue.address_line1, venue.city, venue.region].filter(Boolean).join(", ");
}

function eventHosts(event: NonNullable<Awaited<ReturnType<typeof getMemberEvent>>>) {
  const assignments = event.event_host_assignment ?? [];
  if (assignments.length > 0) {
    return assignments.flatMap((assignment) =>
      assignment.event_host ? [{ ...assignment.event_host, role: assignment.role, isPrimary: assignment.is_primary }] : []
    );
  }
  return event.event_host ? [{ ...event.event_host, role: "host" as const, isPrimary: true }] : [];
}

function canShowHostContact(host: ReturnType<typeof eventHosts>[number]) {
  return host.contact_visibility === "public" || host.contact_visibility === "logged_in";
}

function hostRoleLabel(role: string) {
  if (role === "organizer") return "Organizer";
  if (role === "speaker") return "Speaker";
  if (role === "instructor") return "Instructor";
  if (role === "partner") return "Partner";
  return "Host";
}

function rsvpState(event: NonNullable<Awaited<ReturnType<typeof getMemberEvent>>>) {
  const rsvp = (event.event_rsvp_type ?? []).find((row) => row.status === "active") ?? null;
  if (!rsvp) return null;
  const now = currentTimestampMs();
  const opens = rsvp.start_at ? new Date(rsvp.start_at).getTime() : null;
  const closes = rsvp.end_at ? new Date(rsvp.end_at).getTime() : null;
  const count = rsvp.confirmed_count ?? 0;
  const remaining = rsvp.capacity === null || rsvp.capacity === undefined ? null : Math.max(0, rsvp.capacity - count);
  return {
    rsvp,
    count,
    remaining,
    notOpen: opens !== null && now < opens,
    closed: closes !== null && now > closes,
    full: remaining !== null && remaining <= 0,
  };
}

function rsvpErrorMessage(error?: string) {
  if (error === "registration_failed") return "RSVP could not be saved. It may be closed or full.";
  if (error === "membership_required") return "An active membership is required to RSVP.";
  return error ? "RSVP could not be saved." : null;
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
  const hosts = eventHosts(event);
  const body = event.body || event.description || "";
  const ticketRequired = event.ticketing_mode === "ticket_required";
  const hasTicketAccess = Boolean(event.member_ticket_access);
  const rsvp = rsvpState(event);
  const rsvpError = rsvpErrorMessage(query.rsvp_error);

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
              {hosts.length > 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  Hosted by {hosts.map((host) => host.name).join(", ")}
                </p>
              ) : null}
              {event.event_venue ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  {event.event_venue.name}{location ? ` · ${location}` : ""}
                </p>
              ) : null}
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

        {rsvp ? (
          <SurfaceCard padding="lg" elevated>
            <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-start">
              <div>
                <p className="ui-section-eyebrow mb-2">RSVP</p>
                <h2 className="heading-balance font-heading text-xl font-semibold text-foreground">
                  {event.member_rsvp_attendee ? "You are registered" : rsvp.rsvp.name}
                </h2>
                {rsvp.rsvp.description ? (
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{rsvp.rsvp.description}</p>
                ) : null}
                {query.rsvp === "success" ? (
                  <p className="mt-3 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-primary">
                    RSVP confirmed. We saved your spot.
                  </p>
                ) : null}
                {rsvpError ? (
                  <p className="mt-3 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                    {rsvpError}
                  </p>
                ) : null}
                <p className="mt-3 text-xs text-muted-foreground">
                  {rsvp.remaining === null ? "Unlimited spots" : `${rsvp.remaining} spot${rsvp.remaining === 1 ? "" : "s"} remaining`}
                </p>
              </div>

              {event.member_rsvp_attendee ? (
                <div className="rounded-2xl border border-border bg-muted/30 p-4 text-sm">
                  <p className="font-semibold text-foreground">{event.member_rsvp_attendee.name ?? "Registered attendee"}</p>
                  <p className="mt-1 text-muted-foreground">{event.member_rsvp_attendee.attendee_number}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Status: {event.member_rsvp_attendee.status.replace("_", " ")}
                  </p>
                </div>
              ) : rsvp.notOpen ? (
                <p className="rounded-2xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">RSVP has not opened yet.</p>
              ) : rsvp.closed ? (
                <p className="rounded-2xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">RSVP has closed for this event.</p>
              ) : rsvp.full ? (
                <p className="rounded-2xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">This RSVP is full.</p>
              ) : (
                <form action={registerEventRsvp} className="grid min-w-72 gap-3">
                  <input type="hidden" name="event_id" value={event.id} />
                  <input type="hidden" name="rsvp_type_id" value={rsvp.rsvp.id} />
                  {rsvp.rsvp.collect_attendee_info ? (
                    <>
                      <label className="grid gap-1 text-sm font-medium text-foreground">
                        Name
                        <input name="attendee_name" required className="admin-input" />
                      </label>
                      <label className="grid gap-1 text-sm font-medium text-foreground">
                        Email
                        <input name="attendee_email" type="email" required className="admin-input" />
                      </label>
                    </>
                  ) : null}
                  <Button type="submit">RSVP</Button>
                </form>
              )}
            </div>
          </SurfaceCard>
        ) : null}

        {body ? (
          <SurfaceCard padding="lg" elevated>
            <EventDetailsBody content={body} />
          </SurfaceCard>
        ) : null}

        {(hosts.length > 0 || event.event_venue) ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {hosts.length > 0 ? (
              <SurfaceCard padding="lg">
                <p className="ui-section-eyebrow mb-3">{hosts.length === 1 ? "Host" : "Hosts"}</p>
                <div className="grid gap-4">
                  {hosts.map((host) => (
                    <div key={host.id} className="flex gap-3">
                      {host.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={host.image_url} alt="" className="h-14 w-14 rounded-full object-cover" />
                      ) : null}
                      <div>
                        <Link href={`/events/hosts/${host.slug}`} className="font-semibold text-foreground hover:text-primary">
                          {host.name}
                        </Link>
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{hostRoleLabel(host.role)}</p>
                        {hosts.length === 1 && host.bio ? (
                          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{host.bio}</p>
                        ) : null}
                        {canShowHostContact(host) ? (
                          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            {host.email ? <a href={`mailto:${host.email}`} className="hover:text-primary">{host.email}</a> : null}
                            {host.website_url ? <a href={host.website_url} target="_blank" rel="noopener noreferrer" className="hover:text-primary">Website</a> : null}
                            {host.phone ? <span>{host.phone}</span> : null}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </SurfaceCard>
            ) : null}

            {event.event_venue ? (
              <SurfaceCard padding="lg">
                <p className="ui-section-eyebrow mb-3">Venue</p>
                <Link href={`/events/venues/${event.event_venue.slug}`} className="font-semibold text-foreground hover:text-primary">
                  {event.event_venue.name}
                </Link>
                {event.venue_room_name ? <p className="mt-1 text-sm text-muted-foreground">{event.venue_room_name}</p> : null}
                {location ? <p className="mt-2 text-sm text-muted-foreground">{location}</p> : null}
                {event.venue_notes ? <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{event.venue_notes}</p> : null}
                {event.event_venue.parking_notes ? <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{event.event_venue.parking_notes}</p> : null}
                {event.event_venue.accessibility_notes ? <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{event.event_venue.accessibility_notes}</p> : null}
                <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold text-primary">
                  {event.event_venue.show_map_link && event.event_venue.map_url ? (
                    <a href={event.event_venue.map_url} target="_blank" rel="noopener noreferrer">Open map</a>
                  ) : null}
                  {event.event_venue.website_url ? (
                    <a href={event.event_venue.website_url} target="_blank" rel="noopener noreferrer">Venue website</a>
                  ) : null}
                </div>
              </SurfaceCard>
            ) : null}
          </div>
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
