import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireActiveMember } from "@/lib/auth/require-active-member";
import { checkTierAccess } from "@/lib/auth/check-tier-access";
import { getMemberPracticeSummary } from "@/lib/queries/get-member-practice-summary";
import { getMemberListeningInsights } from "@/lib/queries/get-member-listening-insights";
import { resolveAudioUrl } from "@/lib/media/resolve-audio-url";
import { getTodayContent } from "@/lib/queries/get-today-content";
import {
  getLibraryContent,
  getMemberNoteContentIds,
  type LibraryItem,
} from "@/lib/queries/get-library-content";
import { PageHeader } from "@/components/member/PageHeader";
import { ContinueListeningCard } from "@/components/today/ContinueListeningCard";
import { TypeBadge } from "@/components/member/TypeBadge";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { PracticeHeatmap } from "@/components/practice/PracticeHeatmap";
import { PracticeCollection } from "@/components/practice/PracticeCollection";

export const metadata = {
  title: "My Practice — Positives",
  description: "A personal hub for your rhythm, reflections, and next practices.",
};

type SearchParams = Promise<{ tab?: string }>;

const VALID_TABS = ["daily", "weekly", "monthly"] as const;

type PracticeTab = (typeof VALID_TABS)[number];

function normalizeTab(tab: string | undefined): PracticeTab {
  return VALID_TABS.includes((tab ?? "") as PracticeTab)
    ? (tab as PracticeTab)
    : "daily";
}

function dateContext(item: LibraryItem): string | null {
  if (item.publish_date) {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(`${item.publish_date}T12:00:00`));
  }

  if (item.week_start) {
    return `Week of ${new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    }).format(new Date(`${item.week_start}T12:00:00`))}`;
  }

  if (item.month_year) {
    const [year, month] = item.month_year.split("-");
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      year: "numeric",
    }).format(new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1));
  }

  return null;
}

function buildItems(items: LibraryItem[], noteContentIds: Set<string>) {
  return items.map((item) => ({
    ...item,
    dateContext: dateContext(item),
    hasNote: noteContentIds.has(item.id),
  }));
}

function TabLink({
  tab,
  activeTab,
  children,
}: {
  tab: PracticeTab;
  activeTab: PracticeTab;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={tab === "daily" ? "/practice" : `/practice?tab=${tab}`}
      className="member-segmented-control__item"
      data-active={activeTab === tab}
      aria-current={activeTab === tab ? "page" : undefined}
    >
      {children}
    </Link>
  );
}

export default async function PracticePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const activeTab = normalizeTab(params.tab);
  const member = await requireActiveMember();
  const supabase = await createClient();

  const todayContent = await getTodayContent();

  const [
    summary,
    noteContentIds,
    dailyItems,
    weeklyItems,
    monthlyItems,
    userResult,
    listeningInsights,
  ] = await Promise.all([
    getMemberPracticeSummary(member.id),
    getMemberNoteContentIds(member.id),
    getLibraryContent("daily_audio", 6, 0, member.subscription_tier),
    getLibraryContent("weekly_principle", 6, 0, member.subscription_tier),
    getLibraryContent("monthly_theme", 6, 0, member.subscription_tier),
    supabase.auth.getUser(),
    getMemberListeningInsights(member.id, member.subscription_tier, todayContent?.id),
  ]);

  // Resolve audio URL for Continue Listening card
  const continueAudioUrl = listeningInsights.continueListening
    ? await resolveAudioUrl(
        listeningInsights.continueListening.castos_episode_url,
        listeningInsights.continueListening.s3_audio_key
      )
    : null;

  // Determine the "suggested next" practice
  const suggestedNext = listeningInsights.suggestedNext;

  const memberName = member.name?.trim() || "Member";
  const initials = memberName.charAt(0).toUpperCase();
  const joinedLabel = userResult.data.user?.created_at
    ? new Intl.DateTimeFormat("en-US", {
        month: "long",
        year: "numeric",
      }).format(new Date(userResult.data.user.created_at))
    : "Recently";

  const enrichedDaily = buildItems(dailyItems.slice(0, 4), noteContentIds);
  const enrichedWeekly = buildItems(weeklyItems.slice(0, 4), noteContentIds);
  const enrichedMonthly = buildItems(monthlyItems.slice(0, 4), noteContentIds);
  const coachingAccess = checkTierAccess(member.subscription_tier, "level_3");

  return (
    <div>
      <PageHeader
        title="My Practice"
        subtitle="Your rhythm, reflections, and next steps in one calm place."
        hero
        right={
          <Button href="/account" variant="secondary" size="sm" className="hidden md:inline-flex">
            Account settings
          </Button>
        }
      />

      <div className="member-container flex flex-col gap-6 py-8 md:py-10">
        <SurfaceCard
          tone="dark"
          padding="lg"
          className="flex flex-col gap-6"
        >
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-lg font-bold text-white">
                {initials}
              </div>
              <div>
                <p className="ui-section-eyebrow mb-2 text-white/60">My Practice</p>
                <h2 className="heading-balance font-heading text-2xl font-bold tracking-[-0.03em] text-white">
                  {memberName}
                </h2>
                <p className="mt-1 text-sm text-white/60">Member since {joinedLabel}</p>
                <p className="mt-2 max-w-xl text-sm leading-body text-white/72">
                  A focused home for your history and your next practice, without replacing the
                  day-by-day guidance on Home.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 md:min-w-[360px]">
              <StatCard label="Streak" value={summary.practiceStreak} />
              <StatCard label="Listens" value={summary.listenCount} />
              <StatCard label="Notes" value={summary.journalCount} />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <SurfaceCard elevated className="bg-white/5 text-white shadow-none ring-1 ring-white/8">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/48">
                Practice History
              </p>
              <h2 className="mt-3 text-xl font-semibold tracking-[-0.03em] text-white">
                Last 10 weeks
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-body text-white/62">
                Your activity map is based on completed listening inside Positives, so this view
                reflects real practice rather than browsing.
              </p>
              <div className="mt-5">
                <PracticeHeatmap values={summary.heatmap} />
              </div>
            </SurfaceCard>

            <SurfaceCard elevated className="bg-white/5 text-white shadow-none ring-1 ring-white/8">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/48">
                Quick Links
              </p>
              <div className="mt-4 flex flex-col gap-3">
                <Link
                  href="/today"
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 transition-colors hover:bg-white/8"
                >
                  <p className="text-sm font-semibold text-white">Go to Home</p>
                  <p className="mt-1 text-sm leading-body text-white/58">
                    Start with today&apos;s guided next step.
                  </p>
                </Link>

                <Link
                  href="/journal"
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 transition-colors hover:bg-white/8"
                >
                  <p className="text-sm font-semibold text-white">Open Journal</p>
                  <p className="mt-1 text-sm leading-body text-white/58">
                    Revisit private reflections and write a new note.
                  </p>
                </Link>

                <Link
                  href="/account"
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 transition-colors hover:bg-white/8"
                >
                  <p className="text-sm font-semibold text-white">Account Settings</p>
                  <p className="mt-1 text-sm leading-body text-white/58">
                    Billing, timezone, security, and session controls.
                  </p>
                </Link>

                {coachingAccess && (
                  <Link
                    href="/coaching"
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 transition-colors hover:bg-white/8"
                  >
                    <p className="text-sm font-semibold text-white">Coaching</p>
                    <p className="mt-1 text-sm leading-body text-white/58">
                      Upcoming calls and replays for coaching tiers.
                    </p>
                  </Link>
                )}
              </div>
            </SurfaceCard>
          </div>
        </SurfaceCard>

        {/* ── Continue Listening / Recently Completed / Suggested Next ── */}
        {listeningInsights.continueListening && (
          <ContinueListeningCard
            contentId={listeningInsights.continueListening.id}
            contentType={listeningInsights.continueListening.type}
            title={listeningInsights.continueListening.title}
            description={
              listeningInsights.continueListening.excerpt ??
              listeningInsights.continueListening.description
            }
            audioUrl={continueAudioUrl}
            durationLabel={
              listeningInsights.continueListening.duration_seconds
                ? `${Math.floor(listeningInsights.continueListening.duration_seconds / 60)}:${String(
                    listeningInsights.continueListening.duration_seconds % 60
                  ).padStart(2, "0")}`
                : "—"
            }
          />
        )}

        {(listeningInsights.recentlyCompleted.length > 0 || suggestedNext) && (
          <section className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            {listeningInsights.recentlyCompleted.length > 0 && (
              <article className="surface-card surface-card--editorial p-5 md:p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="ui-section-eyebrow mb-2">Recently Completed</p>
                    <h2 className="heading-balance font-heading text-xl font-semibold tracking-[-0.02em] text-foreground">
                      Practices you&apos;ve finished lately
                    </h2>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  {listeningInsights.recentlyCompleted.map((item) => (
                    <Link
                      key={item.id}
                      href={`/library/${item.id}`}
                      className="group flex items-center justify-between gap-3 rounded-2xl border border-border bg-background px-4 py-3 transition-colors hover:border-primary/25 hover:bg-primary/5"
                    >
                      <div className="min-w-0">
                        <div className="mb-2 flex items-center gap-2">
                          <TypeBadge type={item.type} size="xs" />
                          {item.listenedAt ? (
                            <span className="text-xs text-muted-foreground">
                              {new Intl.DateTimeFormat("en-US", {
                                month: "short",
                                day: "numeric",
                              }).format(new Date(item.listenedAt))}
                            </span>
                          ) : null}
                        </div>
                        <p className="truncate text-sm font-semibold text-foreground">
                          {item.title}
                        </p>
                        {(item.excerpt ?? item.description) && (
                          <p className="mt-1 line-clamp-2 text-sm leading-body text-muted-foreground">
                            {item.excerpt ?? item.description}
                          </p>
                        )}
                      </div>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                        className="flex-shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
                      >
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </Link>
                  ))}
                </div>
              </article>
            )}

            {suggestedNext && (
              <article className="surface-card surface-card--tint surface-card--editorial p-5 md:p-6">
                <p className="ui-section-eyebrow mb-2">Next Recommended Practice</p>
                <h2 className="heading-balance font-heading text-xl font-semibold tracking-[-0.02em] text-foreground">
                  {suggestedNext.title}
                </h2>
                {(suggestedNext.excerpt ?? suggestedNext.description) && (
                  <p className="mt-2 text-sm leading-body text-muted-foreground">
                    {suggestedNext.excerpt ?? suggestedNext.description}
                  </p>
                )}

                <div className="mt-4 flex items-center gap-2">
                  <TypeBadge type={suggestedNext.type} size="xs" />
                  {suggestedNext.duration_seconds ? (
                    <span className="text-xs text-muted-foreground">
                      {Math.max(1, Math.round(suggestedNext.duration_seconds / 60))} min
                    </span>
                  ) : null}
                </div>

                <Button href={`/library/${suggestedNext.id}`} className="mt-5">
                  Explore next practice
                </Button>
              </article>
            )}
          </section>
        )}

        {/* ── Practice Collection Tabs ────────────────────────────────── */}
        <nav aria-label="Practice sections" className="member-segmented-control">
          <TabLink tab="daily" activeTab={activeTab}>
            Daily
          </TabLink>
          <TabLink tab="weekly" activeTab={activeTab}>
            Weekly
          </TabLink>
          <TabLink tab="monthly" activeTab={activeTab}>
            Monthly
          </TabLink>
        </nav>

        {activeTab === "daily" && (
          <PracticeCollection
            title="Daily practices"
            subtitle="A calmer archive of recent daily grounding sessions. Start here when you want a focused practice without digging through the full library."
            items={enrichedDaily}
          />
        )}

        {activeTab === "weekly" && (
          <PracticeCollection
            title="Weekly principles"
            subtitle="The principles that anchor each week, designed to feel readable, intentional, and easy to revisit."
            items={enrichedWeekly}
          />
        )}

        {activeTab === "monthly" && (
          <PracticeCollection
            title="Monthly themes"
            subtitle="Longer-range themes that give the month its shape and help the rest of your practice cohere."
            items={enrichedMonthly}
          />
        )}
      </div>
    </div>
  );
}
