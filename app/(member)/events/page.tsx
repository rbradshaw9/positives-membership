import { requireActiveMember } from "@/lib/auth/require-active-member";
import { checkTierAccess } from "@/lib/auth/check-tier-access";
import { getEventContent } from "@/lib/queries/get-event-content";
import { PageHeader } from "@/components/member/PageHeader";
import { EmptyState } from "@/components/member/EmptyState";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { Button } from "@/components/ui/Button";
import { UpcomingEventCard } from "@/components/events/UpcomingEventCard";
import { EventReplayCard } from "@/components/events/EventReplayCard";

export const metadata = {
  title: "Events — Positives",
  description: "Live workshops, member events, and replays for Membership + Events members.",
};

const EVENTS_MIN_TIER = "level_2";

export default async function EventsPage() {
  const member = await requireActiveMember();
  const hasAccess = checkTierAccess(member.subscription_tier, EVENTS_MIN_TIER);

  if (!hasAccess) {
    return (
      <div>
        <PageHeader
          title="Events"
          subtitle="Live workshops, member events, and replay access."
          hero
        />
        <div className="member-container py-10">
          <SurfaceCard tone="tint" padding="lg" className="surface-card--editorial mx-auto max-w-xl text-center">
            <p className="ui-section-eyebrow mb-3">Membership + Events Feature</p>
            <h2 className="heading-balance font-heading text-2xl font-semibold tracking-[-0.03em] text-foreground">
              Join live events and workshop replays
            </h2>
            <p className="mt-3 text-sm leading-[1.75] text-muted-foreground">
              The Events area is available to Membership + Events members and above. Upgrade your
              plan to join live sessions, revisit replays, and stay close to the broader Positives
              rhythm beyond the daily practice.
            </p>
            <Button href="/account/billing" className="mt-6">
              Manage membership
            </Button>
          </SurfaceCard>
        </div>
      </div>
    );
  }

  const events = await getEventContent(20);
  const now = new Date();
  const upcoming = events.filter((event) => event.starts_at && new Date(event.starts_at) > now);
  const replays = events.filter((event) => !event.starts_at || new Date(event.starts_at) <= now);
  const nextEvent =
    upcoming.sort(
      (a, b) => new Date(a.starts_at!).getTime() - new Date(b.starts_at!).getTime()
    )[0] ?? null;

  return (
    <div>
      <PageHeader
        title="Events"
        subtitle="Live workshops, member sessions, and replay access for Membership + Events and above."
        hero
      />

      <div className="member-container py-8 md:py-10">
        <section className="mb-10">
          {nextEvent ? (
            <UpcomingEventCard
              title={nextEvent.title}
              description={nextEvent.description}
              startsAt={nextEvent.starts_at}
              joinUrl={nextEvent.join_url}
            />
          ) : (
            <EmptyState
              icon={
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="3" y="5" width="18" height="16" rx="2" ry="2" />
                  <line x1="16" y1="3" x2="16" y2="7" />
                  <line x1="8" y1="3" x2="8" y2="7" />
                  <line x1="3" y1="11" x2="21" y2="11" />
                </svg>
              }
              title="No live event is scheduled yet"
              subtitle="Check back soon. New workshops and member sessions will show up here as soon as they are scheduled."
              action={
                <Button href="/community" variant="secondary">
                  Open Q&A
                </Button>
              }
            />
          )}
        </section>

        {replays.length > 0 ? (
          <section>
            <h2
              className="mb-4 text-xs font-semibold uppercase tracking-widest"
              style={{ color: "var(--color-muted-fg)" }}
            >
              Past events
            </h2>
            <div className="flex flex-col gap-3">
              {replays.map((event) => (
                <EventReplayCard
                  key={event.id}
                  title={event.title}
                  description={event.description}
                  startsAt={event.starts_at}
                  vimeoVideoId={event.vimeo_video_id}
                  youtubeVideoId={event.youtube_video_id}
                  durationSeconds={event.duration_seconds}
                />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
