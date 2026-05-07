import { notFound } from "next/navigation";
import Link from "next/link";
import { requireActiveMember } from "@/lib/auth/require-active-member";
import { getMemberEventHostPage } from "@/lib/queries/get-events";
import { formatEventDateRange } from "@/lib/events/dates";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { Button } from "@/components/ui/Button";

type Params = Promise<{ slug: string }>;

function showContact(host: NonNullable<Awaited<ReturnType<typeof getMemberEventHostPage>>>["host"]) {
  return host.contact_visibility === "public" || host.contact_visibility === "logged_in";
}

export default async function EventHostPage({ params }: { params: Params }) {
  const member = await requireActiveMember();
  const { slug } = await params;
  const data = await getMemberEventHostPage(slug, member.subscription_tier, member.id);
  if (!data) notFound();
  const { host, events } = data;
  const socialLinks = Object.entries(host.social_links ?? {}).filter(([, value]) => Boolean(value));

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
            <p className="ui-section-eyebrow mb-2">Event Host</p>
            <h1 className="heading-balance font-heading text-3xl font-bold leading-heading tracking-tight text-foreground md:text-4xl">
              {host.name}
            </h1>
            {host.bio ? <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">{host.bio}</p> : null}
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
                <p className="text-sm text-muted-foreground">No upcoming events from this host are available for your membership right now.</p>
              </SurfaceCard>
            )}
          </section>
        </div>

        <SurfaceCard padding="lg" elevated>
          {host.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={host.image_url} alt="" className="mb-4 aspect-square w-28 rounded-full object-cover" />
          ) : null}
          <p className="ui-section-eyebrow mb-2">{host.type.replace("_", " ")}</p>
          {showContact(host) ? (
            <div className="space-y-2 text-sm text-muted-foreground">
              {host.email ? <p><a href={`mailto:${host.email}`} className="hover:text-primary">{host.email}</a></p> : null}
              {host.phone ? <p>{host.phone}</p> : null}
              {host.website_url ? <p><a href={host.website_url} target="_blank" rel="noopener noreferrer" className="hover:text-primary">Website</a></p> : null}
              {socialLinks.map(([label, url]) => (
                <p key={label}>
                  <a href={url} target="_blank" rel="noopener noreferrer" className="capitalize hover:text-primary">{label}</a>
                </p>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Contact details are private for this host.</p>
          )}
        </SurfaceCard>
      </div>
    </div>
  );
}
