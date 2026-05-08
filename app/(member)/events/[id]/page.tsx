import { notFound } from "next/navigation";
import Link from "next/link";
import { requireActiveMember } from "@/lib/auth/require-active-member";
import {
  getMemberEvent,
  getMemberRelatedEvents,
  type EventRow,
} from "@/lib/queries/get-events";
import { currentTimestampMs, formatEventDateRange } from "@/lib/events/dates";
import { EventDetailsBody } from "@/components/content/EventDetailsBody";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { Button } from "@/components/ui/Button";
import {
  EventVisual,
  MemberEventCard,
  eventCostLabel,
  eventHostNames,
  eventJoinUrl,
  eventLocationLabel,
} from "@/components/events/MemberEventCard";
import { SafeImage } from "@/components/media/SafeImage";
import { EventTicketPurchasePanel } from "./EventTicketPurchasePanel";
import { EventJoinButton } from "./EventJoinButton";
import { registerEventRsvp } from "./actions";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ ticket?: string; ticket_error?: string; rsvp?: string; rsvp_error?: string }>;
type MemberEvent = NonNullable<Awaited<ReturnType<typeof getMemberEvent>>>;

function venueAddress(event: MemberEvent) {
  const venue = event.event_venue;
  if (!venue) return null;
  return [venue.address_line1, venue.address_line2, venue.city, venue.region, venue.postal_code, venue.country]
    .filter(Boolean)
    .join(", ");
}

function eventHosts(event: MemberEvent) {
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

function rsvpState(event: MemberEvent) {
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
  if (error === "fields_required") return "Please complete the required registration details.";
  return error ? "RSVP could not be saved." : null;
}

function CustomRegistrationFields({
  fields,
}: {
  fields: NonNullable<MemberEvent["event_rsvp_type"]>[number]["registration_fields"];
}) {
  if (!fields?.length) return null;
  return (
    <div className="grid gap-3">
      {fields.map((field) => {
        const fieldName = `custom_${field.id}`;
        const commonProps = {
          id: fieldName,
          name: fieldName,
          required: field.required,
          className: "admin-input",
        };
        return (
          <label key={field.id} htmlFor={fieldName} className="grid gap-1 text-sm font-medium text-foreground">
            <span>
              {field.label}
              {field.required ? <span className="text-destructive"> *</span> : null}
            </span>
            {field.type === "long_text" ? (
              <textarea {...commonProps} className="admin-textarea" rows={3} />
            ) : field.type === "select" ? (
              <select {...commonProps} className="admin-select" defaultValue="">
                <option value="" disabled>
                  Choose one
                </option>
                {(field.options ?? []).map((option) => (
                  <option key={option.id} value={option.value || option.label}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : field.type === "checkbox" ? (
              <span className="flex items-start gap-3 rounded-xl border border-border px-3 py-2">
                <input
                  id={fieldName}
                  name={fieldName}
                  type="checkbox"
                  required={field.required}
                  className="mt-0.5 h-4 w-4"
                />
                <span className="text-sm text-muted-foreground">{field.helpText || "Yes"}</span>
              </span>
            ) : (
              <input
                {...commonProps}
                type={field.type === "email" ? "email" : field.type === "phone" ? "tel" : "text"}
              />
            )}
            {field.type !== "checkbox" && field.helpText ? (
              <span className="text-xs font-normal text-muted-foreground">{field.helpText}</span>
            ) : null}
          </label>
        );
      })}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="border-b border-border/70 py-3 last:border-b-0">
      <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-medium leading-relaxed text-foreground">{value}</dd>
    </div>
  );
}

function RsvpModule({
  event,
  rsvp,
  query,
}: {
  event: MemberEvent;
  rsvp: NonNullable<ReturnType<typeof rsvpState>>;
  query: Awaited<SearchParams>;
}) {
  const rsvpError = rsvpErrorMessage(query.rsvp_error);
  return (
    <SurfaceCard padding="lg" elevated>
      <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-start">
        <div>
          <p className="ui-section-eyebrow mb-2">RSVP</p>
          <h2 className="heading-balance font-heading text-2xl font-semibold tracking-normal text-foreground">
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
          <div className="rounded-2xl border border-border bg-muted/30 p-4 text-sm md:min-w-72">
            <p className="font-semibold text-foreground">{event.member_rsvp_attendee.name ?? "Registered attendee"}</p>
            <p className="mt-1 text-muted-foreground">{event.member_rsvp_attendee.attendee_number}</p>
          </div>
        ) : rsvp.notOpen ? (
          <p className="rounded-2xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground md:min-w-72">RSVP has not opened yet.</p>
        ) : rsvp.closed ? (
          <p className="rounded-2xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground md:min-w-72">RSVP has closed for this event.</p>
        ) : rsvp.full ? (
          <p className="rounded-2xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground md:min-w-72">This RSVP is full.</p>
        ) : (
          <form action={registerEventRsvp} className="grid gap-3 md:min-w-72">
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
            <CustomRegistrationFields fields={rsvp.rsvp.registration_fields} />
            <Button type="submit" className="w-full justify-center">Confirm RSVP</Button>
          </form>
        )}
      </div>
    </SurfaceCard>
  );
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

  const nowMs = currentTimestampMs();
  const joinUrl = eventJoinUrl(event);
  const isPast = new Date(event.ends_at).getTime() < nowMs;
  const hosts = eventHosts(event);
  const body = event.body || event.description || "";
  const ticketRequired = event.ticketing_mode === "ticket_required";
  const hasTicketAccess = Boolean(event.member_ticket_access);
  const rsvp = rsvpState(event);
  const relatedEvents = await getMemberRelatedEvents({
    event: event as EventRow,
    memberId: member.id,
    memberTier: member.subscription_tier,
    limit: 3,
  });
  const address = venueAddress(event);
  const location = eventLocationLabel(event);
  const hostNames = eventHostNames(event);
  const registrationModule = (
    <div id="event-registration" className="scroll-mt-24 space-y-4">
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

      {rsvp ? <RsvpModule event={event} rsvp={rsvp} query={query} /> : null}
    </div>
  );

  return (
    <div className="member-container py-8 md:py-12">
      <Link href="/events" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Events
      </Link>

      <article className="space-y-7">
        <header>
          <div>
            <p className="ui-section-eyebrow mb-3">{event.event_type?.name ?? "Event"}</p>
            <h1 className="heading-balance font-heading text-4xl font-bold leading-heading tracking-normal text-foreground md:text-5xl">
              {event.title}
            </h1>
            <p className="mt-4 text-base font-semibold leading-relaxed text-foreground/85">
              {formatEventDateRange(event.starts_at, event.ends_at, event.timezone, event.all_day)}
            </p>
            {hostNames ? (
              <p className="mt-2 text-sm text-muted-foreground">Hosted by {hostNames}</p>
            ) : null}
          </div>
        </header>

        <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          <div className="space-y-6">
            <EventVisual event={event} priority className="rounded-[1.75rem]" />

            {event.registration_placement === "below_hero" ? registrationModule : null}

            {event.excerpt ? (
              <p className="text-lg leading-relaxed text-muted-foreground">{event.excerpt}</p>
            ) : null}

            {body ? (
              <SurfaceCard padding="lg" elevated>
                <EventDetailsBody content={body} />
              </SurfaceCard>
            ) : null}

            {event.registration_placement === "after_description" ? registrationModule : null}

            <SurfaceCard padding="lg" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="ui-section-eyebrow mb-2">Calendar</p>
                <p className="text-sm text-muted-foreground">Save this event to your personal calendar.</p>
              </div>
              <Button href={`/events/${event.id}/calendar`} variant="primary" className="w-full justify-center sm:w-auto">
                Add to Calendar
              </Button>
            </SurfaceCard>

            {relatedEvents.length > 0 ? (
              <section className="space-y-3">
                <h2 className="heading-balance font-heading text-2xl font-semibold tracking-normal text-foreground">
                  More Events
                </h2>
                <div className="grid gap-4">
                  {relatedEvents.map((relatedEvent) => (
                    <MemberEventCard key={relatedEvent.id} event={relatedEvent} nowMs={nowMs} compact />
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24">
            {event.registration_placement === "sidebar" ? registrationModule : null}

            <SurfaceCard padding="lg" elevated>
              <p className="ui-section-eyebrow mb-3">Event Details</p>
              <dl>
                <DetailRow label="Date & Time" value={formatEventDateRange(event.starts_at, event.ends_at, event.timezone, event.all_day)} />
                <DetailRow label="Timezone" value={event.timezone} />
                <DetailRow label="Cost" value={eventCostLabel(event)} />
                <DetailRow label="Event Type" value={event.event_type?.name ?? "Event"} />
                <DetailRow label="Location" value={location} />
              </dl>
              <div className="mt-4 grid gap-2">
                <EventJoinButton
                  joinUrl={joinUrl}
                  startsAt={event.starts_at}
                  endsAt={event.ends_at}
                  initialNowMs={nowMs}
                />
                <Button href={`/events/${event.id}/calendar`} variant="outline" className="w-full justify-center">
                  Add to Calendar
                </Button>
              </div>
            </SurfaceCard>

            {event.event_venue ? (
              <SurfaceCard padding="lg">
                <p className="ui-section-eyebrow mb-3">Venue</p>
                <Link href={`/events/venues/${event.event_venue.slug}`} className="font-heading text-lg font-semibold text-foreground hover:text-primary">
                  {event.event_venue.name}
                </Link>
                {event.venue_room_name ? <p className="mt-1 text-sm text-muted-foreground">{event.venue_room_name}</p> : null}
                {address ? <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{address}</p> : null}
                {event.venue_notes ? <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{event.venue_notes}</p> : null}
                {event.event_venue.parking_notes ? <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{event.event_venue.parking_notes}</p> : null}
                {event.event_venue.accessibility_notes ? <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{event.event_venue.accessibility_notes}</p> : null}
                <div className="mt-4 flex flex-col gap-2 sm:flex-row lg:flex-col">
                  {event.event_venue.show_map_link && event.event_venue.map_url ? (
                    <Button href={event.event_venue.map_url} target="_blank" rel="noopener noreferrer" variant="outline" size="sm" className="justify-center">
                      View Map
                    </Button>
                  ) : null}
                  {event.event_venue.website_url ? (
                    <Button href={event.event_venue.website_url} target="_blank" rel="noopener noreferrer" variant="ghost" size="sm" className="justify-center">
                      Venue Website
                    </Button>
                  ) : null}
                </div>
              </SurfaceCard>
            ) : event.virtual_mode === "zoom" || event.virtual_mode === "manual" ? (
              <SurfaceCard padding="lg">
                <p className="ui-section-eyebrow mb-3">Online Event</p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  The online event link appears here for eligible registered members.
                </p>
              </SurfaceCard>
            ) : null}

            {hosts.length > 0 ? (
              <SurfaceCard padding="lg">
                <p className="ui-section-eyebrow mb-3">{hosts.length === 1 ? "Host" : "Hosts"}</p>
                <div className="grid gap-4">
                  {hosts.map((host) => (
                    <div key={host.id} className="flex gap-3">
                      {host.image_url ? (
                        <SafeImage
                          src={host.image_url}
                          alt=""
                          width={56}
                          height={56}
                          sizes="56px"
                          className="h-14 w-14 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 font-heading font-semibold text-primary">
                          {host.name.slice(0, 1)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <Link href={`/events/hosts/${host.slug}`} className="font-semibold text-foreground hover:text-primary">
                          {host.name}
                        </Link>
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                          {host.isPrimary ? "Primary " : ""}{hostRoleLabel(host.role)}
                        </p>
                        {hosts.length === 1 && host.bio ? (
                          <p className="mt-2 line-clamp-4 text-sm leading-relaxed text-muted-foreground">{host.bio}</p>
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
          </aside>
        </div>

        {isPast ? (
          <SurfaceCard padding="lg">
            <p className="ui-section-eyebrow mb-2">Replay</p>
            {event.replay_url && hasTicketAccess ? (
              <Button href={event.replay_url} target="_blank" rel="noopener noreferrer">Watch Replay</Button>
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
