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
  const hasReplayLibrary = replays.length > 0;

  return (
    <div>
      <PageHeader
        title="Events"
        subtitle="Live workshops, member sessions, and replay access for Membership + Events and above."
        hero
      />

      <div className="member-container py-6 md:py-8">
        <section className={hasReplayLibrary ? "mb-6" : "mb-4"}>
          {nextEvent ? (
            <UpcomingEventCard
              title={nextEvent.title}
              description={nextEvent.description}
              startsAt={nextEvent.starts_at}
              joinUrl={nextEvent.join_url}
            />
          ) : hasReplayLibrary ? (
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
              subtitle="Nothing new is on the calendar right now, but you can still revisit past events below while the next live session is being scheduled."
              action={
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Button href="#event-replays">Browse replays</Button>
                  <Button href="/community" variant="secondary">
                    Open Community
                  </Button>
                </div>
              }
              className="max-w-xl"
            />
          ) : (
            <SurfaceCard
              tone="tint"
              padding="lg"
              elevated
              className="surface-card--editorial mx-auto max-w-2xl overflow-hidden"
            >
              <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_220px] md:items-center">
                <div>
                  <p className="ui-section-eyebrow mb-3">Live events are being scheduled</p>
                  <h2 className="heading-balance font-heading text-2xl font-semibold tracking-[-0.03em] text-foreground md:text-3xl">
                    Your first live event will appear here
                  </h2>
                  <p className="mt-3 text-sm leading-[1.75] text-muted-foreground">
                    When the next workshop is published, you will see the date, join link, and
                    replay here. Until then, Today and Community are good places to stay connected.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Button href="/today">Go to Today</Button>
                    <Button href="/community" variant="secondary">
                      Open Community
                    </Button>
                  </div>
                </div>

                <div className="rounded-[var(--radius-xl)] border border-border/70 bg-card/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    What to expect
                  </p>
                  <div className="mt-4 space-y-3 text-sm text-foreground">
                    <div className="flex gap-3">
                      <span
                        className="mt-1 h-2 w-2 rounded-full bg-accent"
                        aria-hidden="true"
                      />
                      <span>Live workshops for guided practice</span>
                    </div>
                    <div className="flex gap-3">
                      <span
                        className="mt-1 h-2 w-2 rounded-full bg-accent"
                        aria-hidden="true"
                      />
                      <span>Simple reminders before sessions</span>
                    </div>
                    <div className="flex gap-3">
                      <span
                        className="mt-1 h-2 w-2 rounded-full bg-accent"
                        aria-hidden="true"
                      />
                      <span>Replays after events are published</span>
                    </div>
                  </div>
                </div>
              </div>
            </SurfaceCard>
          )}
        </section>

        {replays.length > 0 ? (
          <section id="event-replays">
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
