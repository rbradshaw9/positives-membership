import { notFound } from "next/navigation";
import Link from "next/link";
import { requireActiveMember } from "@/lib/auth/require-active-member";
import { getMemberEventVenuePage } from "@/lib/queries/get-events";
import { currentTimestampMs } from "@/lib/events/dates";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { Button } from "@/components/ui/Button";
import { SafeImage } from "@/components/media/SafeImage";
import { MemberEventCard } from "@/components/events/MemberEventCard";

type Params = Promise<{ slug: string }>;

function venueAddress(venue: NonNullable<Awaited<ReturnType<typeof getMemberEventVenuePage>>>["venue"]) {
  return [venue.address_line1, venue.address_line2, venue.city, venue.region, venue.postal_code]
    .filter(Boolean)
    .join(", ");
}

function isOnlineOnlyVenue(venue: NonNullable<Awaited<ReturnType<typeof getMemberEventVenuePage>>>["venue"]) {
  const name = venue.name.trim().toLowerCase();
  return venue.is_virtual || name === "zoom" || name === "online";
}

export default async function EventVenuePage({ params }: { params: Params }) {
  const member = await requireActiveMember();
  const { slug } = await params;
  const data = await getMemberEventVenuePage(slug, member.subscription_tier, member.id);
  if (!data) notFound();
  const { venue, events } = data;
  const address = venueAddress(venue);
  const onlineOnlyVenue = isOnlineOnlyVenue(venue);
  const hasVenueDetails = Boolean(address || venue.phone || venue.email || venue.website_url);
  const showMap = !onlineOnlyVenue && (Boolean(venue.show_map_link && venue.map_url) || Boolean(venue.show_map));
  const nowMs = currentTimestampMs();

  return (
    <div className="member-container py-8 pb-28 md:py-12">
      <Link href="/events" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Events
      </Link>

      <section className="mb-8 overflow-hidden rounded-[1.75rem] border border-border bg-card">
        <div className="relative aspect-video bg-surface-tint">
          {venue.featured_image_url ? (
            <SafeImage
              src={venue.featured_image_url}
              alt=""
              fill
              sizes="100vw"
              preload
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full flex-col justify-end bg-[radial-gradient(ellipse_at_15%_15%,rgba(46,196,182,0.24),transparent_45%),linear-gradient(135deg,rgba(255,255,255,0.96),rgba(232,246,243,0.88))] p-6">
              <span className="ui-section-eyebrow">{onlineOnlyVenue ? "Online event space" : "Venue"}</span>
              <span className="mt-2 max-w-lg font-heading text-3xl font-semibold tracking-normal text-foreground">
                {venue.name}
              </span>
            </div>
          )}
        </div>
        <div className="grid gap-5 p-5 md:p-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <p className="ui-section-eyebrow mb-3">{onlineOnlyVenue ? "Online event space" : "Event venue"}</p>
            <h1 className="heading-balance font-heading text-4xl font-bold leading-heading tracking-normal text-foreground md:text-5xl">
              {venue.name}
            </h1>
            {address ? <p className="mt-3 text-base leading-relaxed text-muted-foreground">{address}</p> : null}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
            {venue.show_map_link && venue.map_url ? (
              <Button href={venue.map_url} target="_blank" rel="noopener noreferrer" className="justify-center">
                Get directions
              </Button>
            ) : null}
            {venue.website_url ? (
              <Button href={venue.website_url} target="_blank" rel="noopener noreferrer" variant="outline" className="justify-center">
                Venue website
              </Button>
            ) : null}
          </div>
        </div>
      </section>

      <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="space-y-6">
          {venue.description ? (
            <SurfaceCard padding="lg" elevated>
              <p className="ui-section-eyebrow mb-3">About this venue</p>
              <p className="text-sm leading-relaxed text-muted-foreground">{venue.description}</p>
            </SurfaceCard>
          ) : null}

          <div className="space-y-4">
            <div>
              <p className="ui-section-eyebrow mb-2">Upcoming</p>
              <h2 className="heading-balance font-heading text-2xl font-semibold tracking-normal text-foreground">
                Upcoming events at {venue.name}
              </h2>
            </div>
            {events.length > 0 ? (
              <div className="grid gap-4">
                {events.map((event) => (
                  <MemberEventCard key={event.id} event={event} nowMs={nowMs} compact />
                ))}
              </div>
            ) : (
              <SurfaceCard padding="lg">
                <h3 className="heading-balance font-heading text-xl font-semibold tracking-normal text-foreground">
                  No upcoming events at this venue
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  When a member event is scheduled here, it will appear on this page.
                </p>
                <Button href="/events" className="mt-4 w-full justify-center sm:w-auto">
                  Browse all events
                </Button>
              </SurfaceCard>
            )}
          </div>
        </section>

        <aside className="space-y-4">
          {hasVenueDetails ? (
            <SurfaceCard padding="lg" elevated>
              <p className="ui-section-eyebrow mb-3">Venue details</p>
              <dl className="space-y-3 text-sm">
                {address ? (
                  <div>
                    <dt className="font-semibold text-foreground">Address</dt>
                    <dd className="mt-1 leading-relaxed text-muted-foreground">{address}</dd>
                  </div>
                ) : null}
                {venue.phone ? (
                  <div>
                    <dt className="font-semibold text-foreground">Phone</dt>
                    <dd className="mt-1 text-muted-foreground">{venue.phone}</dd>
                  </div>
                ) : null}
                {venue.email ? (
                  <div>
                    <dt className="font-semibold text-foreground">Email</dt>
                    <dd className="mt-1 text-muted-foreground">
                      <a href={`mailto:${venue.email}`} className="hover:text-primary">{venue.email}</a>
                    </dd>
                  </div>
                ) : null}
                {venue.website_url ? (
                  <div>
                    <dt className="font-semibold text-foreground">Website</dt>
                    <dd className="mt-1 text-muted-foreground">
                      <a href={venue.website_url} target="_blank" rel="noopener noreferrer" className="hover:text-primary">Visit website</a>
                    </dd>
                  </div>
                ) : null}
              </dl>
            </SurfaceCard>
          ) : null}

          {showMap ? (
            <SurfaceCard padding="lg">
              <p className="ui-section-eyebrow mb-3">Map</p>
              <div className="rounded-2xl border border-border bg-surface-tint p-5 text-sm text-muted-foreground">
                Map display will appear here when map embedding is configured.
              </div>
              {venue.show_map_link && venue.map_url ? (
                <Button href={venue.map_url} target="_blank" rel="noopener noreferrer" variant="outline" size="sm" className="mt-4 w-full justify-center">
                  Open in map
                </Button>
              ) : null}
            </SurfaceCard>
          ) : null}

          {(venue.accessibility_notes || venue.parking_notes) ? (
            <SurfaceCard padding="lg">
              <p className="ui-section-eyebrow mb-3">Good to know</p>
              {venue.accessibility_notes ? (
                <div>
                  <h3 className="font-semibold text-foreground">Accessibility</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{venue.accessibility_notes}</p>
                </div>
              ) : null}
              {venue.parking_notes ? (
                <div className={venue.accessibility_notes ? "mt-4" : ""}>
                  <h3 className="font-semibold text-foreground">Parking</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{venue.parking_notes}</p>
                </div>
              ) : null}
            </SurfaceCard>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
