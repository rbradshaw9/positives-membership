import { notFound } from "next/navigation";
import Link from "next/link";
import { requireActiveMember } from "@/lib/auth/require-active-member";
import { getMemberEventHostPage } from "@/lib/queries/get-events";
import { currentTimestampMs } from "@/lib/events/dates";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { Button } from "@/components/ui/Button";
import { SafeImage } from "@/components/media/SafeImage";
import { MemberEventCard } from "@/components/events/MemberEventCard";

type Params = Promise<{ slug: string }>;

function showContact(host: NonNullable<Awaited<ReturnType<typeof getMemberEventHostPage>>>["host"]) {
  return host.contact_visibility === "public" || host.contact_visibility === "logged_in";
}

function hostTypeLabel(value: string) {
  if (value === "internal_team") return "Internal team";
  return value.replace("_", " ");
}

export default async function EventHostPage({ params }: { params: Params }) {
  const member = await requireActiveMember();
  const { slug } = await params;
  const data = await getMemberEventHostPage(slug, member.subscription_tier, member.id);
  if (!data) notFound();
  const { host, events } = data;
  const socialLinks = Object.entries(host.social_links ?? {}).filter(([, value]) => Boolean(value));
  const nowMs = currentTimestampMs();
  const contactVisible = showContact(host);

  return (
    <div className="member-container py-8 md:py-12">
      <Link href="/events" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Events
      </Link>

      <section className="mb-8 grid gap-5 rounded-[1.75rem] border border-border bg-surface-tint p-5 md:p-7 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center">
        {host.image_url ? (
          <SafeImage
            src={host.image_url}
            alt=""
            width={128}
            height={128}
            sizes="128px"
            className="h-28 w-28 rounded-full object-cover md:h-32 md:w-32"
            preload
          />
        ) : (
          <div className="flex h-28 w-28 items-center justify-center rounded-full bg-primary/10 font-heading text-4xl font-semibold text-primary md:h-32 md:w-32">
            {host.name.slice(0, 1)}
          </div>
        )}

        <div>
          <p className="ui-section-eyebrow mb-3">Event Host</p>
          <h1 className="heading-balance font-heading text-4xl font-bold leading-heading tracking-normal text-foreground md:text-5xl">
            {host.name}
          </h1>
          <p className="mt-2 text-sm font-semibold capitalize text-primary">
            {hostTypeLabel(host.type)}
          </p>
          {host.bio ? (
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground">{host.bio}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          {host.website_url ? (
            <Button href={host.website_url} target="_blank" rel="noopener noreferrer" className="justify-center">
              Website
            </Button>
          ) : null}
          <Button href="/events" variant="outline" className="justify-center">
            Browse Events
          </Button>
        </div>
      </section>

      <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="space-y-4">
          <div>
            <p className="ui-section-eyebrow mb-2">Upcoming</p>
            <h2 className="heading-balance font-heading text-2xl font-semibold tracking-normal text-foreground">
              Events Hosted by {host.name}
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
                No upcoming events from this host
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                When a member event from this host is available, it will appear here.
              </p>
              <Button href="/events" className="mt-4 w-full justify-center sm:w-auto">
                Browse All Events
              </Button>
            </SurfaceCard>
          )}
        </section>

        <aside className="space-y-4">
          <SurfaceCard padding="lg" elevated>
            <p className="ui-section-eyebrow mb-3">About</p>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="font-semibold text-foreground">Type</dt>
                <dd className="mt-1 capitalize text-muted-foreground">{hostTypeLabel(host.type)}</dd>
              </div>
              {contactVisible && host.email ? (
                <div>
                  <dt className="font-semibold text-foreground">Email</dt>
                  <dd className="mt-1 text-muted-foreground">
                    <a href={`mailto:${host.email}`} className="hover:text-primary">{host.email}</a>
                  </dd>
                </div>
              ) : null}
              {contactVisible && host.phone ? (
                <div>
                  <dt className="font-semibold text-foreground">Phone</dt>
                  <dd className="mt-1 text-muted-foreground">{host.phone}</dd>
                </div>
              ) : null}
              {host.website_url ? (
                <div>
                  <dt className="font-semibold text-foreground">Website</dt>
                  <dd className="mt-1 text-muted-foreground">
                    <a href={host.website_url} target="_blank" rel="noopener noreferrer" className="hover:text-primary">
                      Visit website
                    </a>
                  </dd>
                </div>
              ) : null}
            </dl>
          </SurfaceCard>

          {socialLinks.length > 0 ? (
            <SurfaceCard padding="lg">
              <p className="ui-section-eyebrow mb-3">Social Links</p>
              <div className="flex flex-wrap gap-2">
                {socialLinks.map(([label, url]) => (
                  <Button key={label} href={url} target="_blank" rel="noopener noreferrer" variant="outline" size="sm">
                    {label}
                  </Button>
                ))}
              </div>
            </SurfaceCard>
          ) : null}

          {!contactVisible ? (
            <SurfaceCard padding="lg">
              <p className="text-sm leading-relaxed text-muted-foreground">
                Contact details are private for this host.
              </p>
            </SurfaceCard>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
