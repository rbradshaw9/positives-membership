import { requireActiveMember } from "@/lib/auth/require-active-member";
import { checkTierAccess } from "@/lib/auth/check-tier-access";
import { getCoachingContent } from "@/lib/queries/get-coaching-content";
import { CoachingUpgradePrompt } from "@/components/coaching/CoachingUpgradePrompt";
import { UpcomingCallCard } from "@/components/coaching/UpcomingCallCard";
import { CoachingReplayCard } from "@/components/coaching/CoachingReplayCard";
import { PageHeader } from "@/components/member/PageHeader";

/**
 * app/(member)/coaching/page.tsx
 * Sprint 10: Weekly coaching call hub.
 *
 * Access rules:
 *   Level 1 → upgrade prompt
 *   Level 2 → upgrade prompt
 *   Level 3+ → full coaching page
 *
 * Zoom URL is server-side ONLY. Never embedded in client JS.
 * join_url column holds the Zoom link (castos_episode_url is reserved for audio).
 */

export const metadata = {
  title: "Coaching — Positives",
  description: "Weekly live coaching calls with Dr. Paul Jenkins.",
};

const COACHING_MIN_TIER = "level_3";

export default async function CoachingPage() {
  const member = await requireActiveMember();
  const hasAccess = checkTierAccess(member.subscription_tier, COACHING_MIN_TIER);

  if (!hasAccess) {
    return <CoachingUpgradePrompt tier={member.subscription_tier} />;
  }

  // Member has access — fetch coaching calls
  const calls = await getCoachingContent(20);

  const now = new Date();
  // Split into upcoming (starts_at in future) and replays (past or no starts_at)
  const upcoming = calls.filter((c) => c.starts_at && new Date(c.starts_at) > now);
  const replays = calls.filter((c) => !c.starts_at || new Date(c.starts_at) <= now);

  // Upcoming: show the next call (earliest first)
  const nextCall = upcoming.sort(
    (a, b) => new Date(a.starts_at!).getTime() - new Date(b.starts_at!).getTime()
  )[0] ?? null;

  return (
    <div className="member-container py-8 md:py-10">
      <PageHeader
        title="Coaching"
        subtitle="Weekly live calls with Dr. Paul Jenkins. Join live or watch the replay."
      />

      {/* Upcoming call */}
      <section className="mb-10">
        {nextCall ? (
          <UpcomingCallCard
            title={nextCall.title}
            description={nextCall.description}
            startsAt={nextCall.starts_at}
            zoomUrl={nextCall.join_url}
          />
        ) : (
          <div
            className="rounded-xl px-6 py-8 text-center"
            style={{
              background: "var(--color-muted)",
              border: "1px solid var(--color-border)",
            }}
          >
            <p className="text-sm" style={{ color: "var(--color-muted-foreground)" }}>
              No upcoming call scheduled yet — check back soon.
            </p>
          </div>
        )}
      </section>

      {/* Replays */}
      {replays.length > 0 && (
        <section>
          <h2
            className="text-xs font-semibold uppercase tracking-widest mb-4"
            style={{ color: "var(--color-muted-foreground)" }}
          >
            Past calls
          </h2>
          <div className="flex flex-col gap-3">
            {replays.map((call) => (
              <CoachingReplayCard
                key={call.id}
                id={call.id}
                title={call.title}
                description={call.description}
                startsAt={call.starts_at}
                vimeoVideoId={call.vimeo_video_id}
                youtubeVideoId={call.youtube_video_id}
                durationSeconds={call.duration_seconds}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
