import { notFound } from "next/navigation";
import Link from "next/link";
import { requireActiveMember } from "@/lib/auth/require-active-member";
import { getMemberEventVenuePage } from "@/lib/queries/get-events";
import { formatEventDateRange } from "@/lib/events/dates";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { Button } from "@/components/ui/Button";
import { SafeImage } from "@/components/media/SafeImage";

type Params = Promise<{ slug: string }>;

function venueAddress(venue: NonNullable<Awaited<ReturnType<typeof getMemberEventVenuePage>>>["venue"]) {
  return [venue.address_line1, venue.address_line2, venue.city, venue.region, venue.postal_code, venue.country]
    .filter(Boolean)
    .join(", ");
}

export default async function EventVenuePage({ params }: { params: Params }) {
  const member = await requireActiveMember();
  const { slug } = await params;
  const data = await getMemberEventVenuePage(slug, member.subscription_tier, member.id);
  if (!data) notFound();
  const { venue, events } = data;
  const address = venueAddress(venue);

  return (
    <div className="member-container py-8 md:py-12">
      <Link href="/events" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Events
      </Link>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <div>
            <p className="ui-section-eyebrow mb-2">Event Venue</p>
            <h1 className="heading-balance font-heading text-3xl font-bold leading-heading tracking-tight text-foreground md:text-4xl">
              {venue.name}
            </h1>
            {venue.description ? <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">{venue.description}</p> : null}
          </div>

          <section className="space-y-3">
            <h2 className="heading-balance font-heading text-xl font-semibold text-foreground">Upcoming Events</h2>
            {events.length > 0 ? (
              <div className="grid gap-3">
                {events.map((event) => (
                  <SurfaceCard key={event.id} elevated>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <Link href={`/events/${event.id}`} className="font-semibold text-foreground hover:text-primary">
                          {event.title}
                        </Link>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {formatEventDateRange(event.starts_at, event.ends_at, event.timezone, event.all_day)}
                        </p>
                      </div>
                      <Button href={`/events/${event.id}`} variant="secondary" size="sm">Details</Button>
                    </div>
                  </SurfaceCard>
                ))}
              </div>
            ) : (
              <SurfaceCard>
                <p className="text-sm text-muted-foreground">No upcoming events at this venue are available for your membership right now.</p>
              </SurfaceCard>
            )}
          </section>
        </div>

        <SurfaceCard padding="lg" elevated>
          {venue.featured_image_url ? (
            <div className="relative mb-4 aspect-[4/3] w-full overflow-hidden rounded-xl">
              <SafeImage
                src={venue.featured_image_url}
                alt=""
                fill
                sizes="(max-width: 1024px) 100vw, 420px"
                className="h-full w-full object-cover"
              />
            </div>
          ) : null}
          <p className="ui-section-eyebrow mb-2">{venue.is_virtual ? "Virtual Location" : "Location"}</p>
          {address ? <p className="text-sm leading-relaxed text-muted-foreground">{address}</p> : null}
          {venue.parking_notes ? <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{venue.parking_notes}</p> : null}
          {venue.accessibility_notes ? <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{venue.accessibility_notes}</p> : null}
          <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold text-primary">
            {venue.show_map_link && venue.map_url ? <a href={venue.map_url} target="_blank" rel="noopener noreferrer">Open map</a> : null}
            {venue.website_url ? <a href={venue.website_url} target="_blank" rel="noopener noreferrer">Website</a> : null}
            {venue.email ? <a href={`mailto:${venue.email}`}>Email</a> : null}
            {venue.phone ? <span className="text-muted-foreground">{venue.phone}</span> : null}
          </div>
        </SurfaceCard>
      </div>
    </div>
  );
}
