import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireActiveMember } from "@/lib/auth/require-active-member";
import { checkTierAccess } from "@/lib/auth/check-tier-access";
import { getMemberPracticeSummary } from "@/lib/queries/get-member-practice-summary";
import { getMemberNotes } from "@/lib/queries/get-member-notes";
import {
  getLibraryContent,
  getMemberNoteContentIds,
  type LibraryItem,
} from "@/lib/queries/get-library-content";
import { PageHeader } from "@/components/member/PageHeader";
import { SectionLabel } from "@/components/member/SectionLabel";
import { EmptyState } from "@/components/member/EmptyState";
import { JournalList } from "@/components/journal/JournalList";
import { NewJournalEntryButton } from "@/components/journal/NewJournalEntryButton";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { PracticeHeatmap } from "@/components/practice/PracticeHeatmap";
import { PracticeCollection } from "@/components/practice/PracticeCollection";
import { TypeBadge } from "@/components/member/TypeBadge";

export const metadata = {
  title: "My Practice — Positives",
  description: "A personal hub for your rhythm, reflections, and next practices.",
};

type SearchParams = Promise<{ tab?: string }>;

const VALID_TABS = [
  "overview",
  "daily",
  "weekly",
  "monthly",
  "journal",
  "saved",
] as const;

type PracticeTab = (typeof VALID_TABS)[number];

function normalizeTab(tab: string | undefined): PracticeTab {
  return VALID_TABS.includes((tab ?? "") as PracticeTab)
    ? (tab as PracticeTab)
    : "overview";
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
      href={tab === "overview" ? "/practice" : `/practice?tab=${tab}`}
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

  const [
    summary,
    notes,
    noteContentIds,
    dailyItems,
    weeklyItems,
    monthlyItems,
    coachingItems,
    userResult,
  ] = await Promise.all([
    getMemberPracticeSummary(member.id),
    getMemberNotes(),
    getMemberNoteContentIds(member.id),
    getLibraryContent("daily_audio", 6, 0, member.subscription_tier),
    getLibraryContent("weekly_principle", 6, 0, member.subscription_tier),
    getLibraryContent("monthly_theme", 6, 0, member.subscription_tier),
    checkTierAccess(member.subscription_tier, "level_3")
      ? getLibraryContent("coaching_call", 3, 0, member.subscription_tier)
      : Promise.resolve([]),
    supabase.auth.getUser(),
  ]);

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
  const recentNotes = notes.slice(0, 3);
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
          className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between"
        >
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
                This space brings together your history, your notes, and the next practices
                worth returning to.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 md:min-w-[360px]">
            <StatCard label="Streak" value={summary.practiceStreak} />
            <StatCard label="Listens" value={summary.listenCount} />
            <StatCard label="Notes" value={summary.journalCount} />
          </div>
        </SurfaceCard>

        <nav aria-label="Practice sections" className="member-segmented-control">
          <TabLink tab="overview" activeTab={activeTab}>
            Overview
          </TabLink>
          <TabLink tab="daily" activeTab={activeTab}>
            Daily
          </TabLink>
          <TabLink tab="weekly" activeTab={activeTab}>
            Weekly
          </TabLink>
          <TabLink tab="monthly" activeTab={activeTab}>
            Monthly
          </TabLink>
          <TabLink tab="journal" activeTab={activeTab}>
            Journal
          </TabLink>
          <TabLink tab="saved" activeTab={activeTab}>
            Saved
          </TabLink>
        </nav>

        {activeTab === "overview" && (
          <>
            <section aria-labelledby="practice-history">
              <SectionLabel id="practice-history">Practice History</SectionLabel>
              <SurfaceCard elevated>
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="member-card-title">Last 10 weeks</h2>
                    <p className="member-body-copy mt-1 max-w-2xl">
                      Your activity map is based on completed listening inside Positives, so
                      the rhythm here reflects real practice rather than page visits.
                    </p>
                  </div>
                  <Button href="/today" variant="outline" size="sm">
                    Go to Home
                  </Button>
                </div>
                <PracticeHeatmap values={summary.heatmap} />
              </SurfaceCard>
            </section>

            <section aria-labelledby="practice-rhythms" className="grid gap-4 lg:grid-cols-3">
              {[
                {
                  id: "practice-daily",
                  title: "Daily grounding",
                  subtitle: "Open the latest daily practices and keep your rhythm current.",
                  href: "/practice?tab=daily",
                  type: "daily_audio",
                },
                {
                  id: "practice-weekly",
                  title: "Weekly principles",
                  subtitle: "Return to the bigger idea guiding this week of practice.",
                  href: "/practice?tab=weekly",
                  type: "weekly_principle",
                },
                {
                  id: "practice-monthly",
                  title: "Monthly themes",
                  subtitle: "Browse the wider themes that frame your month inside Positives.",
                  href: "/practice?tab=monthly",
                  type: "monthly_theme",
                },
              ].map((card) => (
                <SurfaceCard
                  key={card.id}
                  as="article"
                  elevated
                  className="surface-card--editorial flex h-full flex-col"
                >
                  <TypeBadge type={card.type} size="xs" />
                  <h2 className="member-card-title mt-4">{card.title}</h2>
                  <p className="member-body-copy mt-2">{card.subtitle}</p>
                  <Button href={card.href} variant="outline" size="sm" className="mt-6 self-start">
                    Open collection
                  </Button>
                </SurfaceCard>
              ))}
            </section>

            <section className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
              <SurfaceCard elevated className="surface-card--editorial">
                <SectionLabel>Recent Reflections</SectionLabel>
                {recentNotes.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {recentNotes.map((note) => (
                      <Link
                        key={note.id}
                        href="/practice?tab=journal"
                        className="rounded-2xl border border-border bg-background px-4 py-4 transition-colors hover:border-primary/20 hover:bg-primary/5"
                      >
                        {note.content_type ? <TypeBadge type={note.content_type} size="xs" /> : null}
                        {note.content_title ? (
                          <p className="mt-3 text-sm font-semibold text-foreground">
                            {note.content_title}
                          </p>
                        ) : null}
                        <p className="mt-2 line-clamp-3 text-sm leading-body text-muted-foreground">
                          {note.entry_text}
                        </p>
                      </Link>
                    ))}
                  </div>
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
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                      </svg>
                    }
                    title="No reflections yet"
                    subtitle="Your first note will show up here after you reflect on a practice."
                    action={<NewJournalEntryButton />}
                  />
                )}
              </SurfaceCard>

              <SurfaceCard tone="tint" className="surface-card--editorial">
                <SectionLabel>Next Steps</SectionLabel>
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold tracking-[-0.02em] text-foreground">
                      Keep the daily rhythm moving
                    </h2>
                    <p className="member-body-copy mt-2">
                      Start from Home when you want the guided next step, then come back here
                      to explore the wider archive.
                    </p>
                  </div>

                  {coachingAccess && coachingItems.length > 0 ? (
                    <div className="rounded-2xl border border-border bg-background px-4 py-4">
                      <p className="member-detail-kicker">Coaching</p>
                      <p className="mt-2 text-base font-semibold text-foreground">
                        Your coaching library is available
                      </p>
                      <p className="mt-2 text-sm leading-body text-muted-foreground">
                        Upcoming calls and replays stay available without crowding the main nav.
                      </p>
                      <Button href="/coaching" variant="outline" size="sm" className="mt-4">
                        Open coaching
                      </Button>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-border bg-background px-4 py-4">
                      <p className="member-detail-kicker">Account</p>
                      <p className="mt-2 text-base font-semibold text-foreground">
                        Manage your settings and billing
                      </p>
                      <p className="mt-2 text-sm leading-body text-muted-foreground">
                        Account settings, timezone, password, and billing all live in one place.
                      </p>
                      <Button href="/account" variant="outline" size="sm" className="mt-4">
                        Open account
                      </Button>
                    </div>
                  )}
                </div>
              </SurfaceCard>
            </section>
          </>
        )}

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

        {activeTab === "journal" && (
          <section className="flex flex-col gap-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <SectionLabel>Journal</SectionLabel>
                <h2 className="member-card-title">Your recent reflections</h2>
                <p className="member-body-copy mt-2 max-w-2xl">
                  Personal notes from your practice, kept private and easy to return to.
                </p>
              </div>
              <NewJournalEntryButton />
            </div>

            {notes.length > 0 ? (
              <JournalList notes={notes} />
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
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                }
                title="No journal entries yet"
                subtitle="Write your first note after a practice and it will be ready here."
                action={<NewJournalEntryButton />}
              />
            )}
          </section>
        )}

        {activeTab === "saved" && (
          <SurfaceCard elevated className="surface-card--editorial text-center">
            <p className="ui-section-eyebrow mb-3">Saved Practices</p>
            <h2 className="member-card-title">Coming soon</h2>
            <p className="member-body-copy mx-auto mt-3 max-w-xl">
              Saved practices are staying as a staged placeholder in this sprint. The design
              is ready, but we are not introducing a new favorites system yet.
            </p>
            <Button href="/library" variant="outline" className="mt-6">
              Browse the library
            </Button>
          </SurfaceCard>
        )}
      </div>
    </div>
  );
}
