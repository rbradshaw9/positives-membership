import { requireActiveMember } from "@/lib/auth/require-active-member";
import { checkTierAccess } from "@/lib/auth/check-tier-access";
import { getWeeklyContent } from "@/lib/queries/get-weekly-content";
import {
  getCommunityTags,
  getSavedCommunityItems,
  getStandaloneCommunityThreads,
  getWeeklyCommunityThreads,
} from "@/lib/queries/get-community-posts";
import { CommunityThreadHero } from "@/components/community/CommunityThreadHero";
import { CommunityComposerCard } from "@/components/community/CommunityComposerCard";
import { CommunityThreadCard } from "@/components/community/CommunityThreadCard";
import { EmptyState } from "@/components/member/EmptyState";
import { PageHeader } from "@/components/member/PageHeader";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { Button } from "@/components/ui/Button";

export const metadata = {
  title: "Community — Positives",
  description:
    "A calm place for weekly reflection, thoughtful discussion, and curated member conversation.",
};

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CommunityPage({ searchParams }: PageProps) {
  const member = await requireActiveMember();
  const hasAccess = checkTierAccess(member.subscription_tier, "level_2");

  if (!hasAccess) {
    return (
      <div>
        <PageHeader
          title="Community"
          subtitle="Weekly reflection, thoughtful discussion, and guided connection."
          hero
        />
        <div className="member-container py-10">
          <SurfaceCard tone="tint" padding="lg" className="surface-card--editorial mx-auto max-w-2xl text-center">
            <p className="ui-section-eyebrow mb-3">Membership + Events Feature</p>
            <h2 className="heading-balance text-2xl font-semibold tracking-[-0.035em] text-foreground">
              Join the member conversation.
            </h2>
            <p className="mt-3 text-sm leading-[1.8] text-muted-foreground">
              Community is part of Membership + Events and above. That keeps the space smaller,
              warmer, and easier for members and coaches to engage with meaningfully.
            </p>
            <Button href="/account" className="mt-6">
              View upgrade options
            </Button>
          </SurfaceCard>
        </div>
      </div>
    );
  }

  const resolvedSearchParams = (await searchParams) ?? {};
  const topicSlug = firstValue(resolvedSearchParams.topic)?.trim() ?? "";

  const [weeklyContent, tags, savedItems] = await Promise.all([
    getWeeklyContent(),
    getCommunityTags(),
    getSavedCommunityItems(member.id, 16),
  ]);

  const [weeklyThreads, recentThreads] = await Promise.all([
    weeklyContent ? getWeeklyCommunityThreads(weeklyContent.id, member.id, 12) : Promise.resolve([]),
    getStandaloneCommunityThreads(member.id, { tagSlug: topicSlug || undefined, limit: 18 }),
  ]);

  const selectedTopic = tags.find((tag) => tag.slug === topicSlug) ?? null;
  const promptText =
    weeklyContent?.excerpt
    ?? weeklyContent?.description
    ?? "How is this week’s principle actually landing in your life?";

  return (
    <div>
      <PageHeader
        title="Community"
        subtitle="A guided place for weekly reflection, thoughtful discussion, and support that stays human."
        hero
      />

      <div className="member-container flex flex-col gap-6 py-8 md:gap-8 md:py-10">
        <nav aria-label="Community sections" className="member-segmented-control">
          <a className="member-segmented-control__item" data-active="true" href="#community-this-week">
            Featured / This Week
          </a>
          <a className="member-segmented-control__item" data-active="false" href="#community-discussions">
            Recent Discussions
          </a>
          <a className="member-segmented-control__item" data-active="false" href="#community-topics">
            Topics
          </a>
          <a className="member-segmented-control__item" data-active="false" href="#community-saved">
            Saved
          </a>
        </nav>

        <section id="community-this-week" className="space-y-5">
          {weeklyContent ? (
            <>
              <CommunityThreadHero
                title={weeklyContent.title}
                prompt={promptText}
                postCount={weeklyThreads.length}
                ctaLabel="Add to this week"
                ctaHref="#community-weekly-composer"
              />
              <CommunityComposerCard mode="weekly" contentId={weeklyContent.id} />

              {weeklyThreads.length > 0 ? (
                <div className="space-y-4">
                  {weeklyThreads.map((thread) => (
                    <CommunityThreadCard key={thread.id} thread={thread} currentMemberId={member.id} />
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
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  }
                  title="This week is still quiet."
                  subtitle="Be the first person to put language around how the principle is showing up for you."
                />
              )}
            </>
          ) : (
            <EmptyState
              icon={
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              }
              title="No weekly thread is live yet."
              subtitle="A weekly anchor appears here as soon as the next principle is published."
              action={<Button href="/today">Go to Today</Button>}
            />
          )}
        </section>

        <section id="community-discussions" className="space-y-5">
          <SurfaceCard padding="lg" className="surface-card--editorial">
            <p className="ui-section-eyebrow mb-2">Recent Discussions</p>
            <h2 className="heading-balance text-[clamp(1.8rem,1.5rem+0.8vw,2.4rem)] font-semibold tracking-[-0.04em] text-foreground">
              Broader conversations, still kept calm.
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-[1.8] text-muted-foreground">
              Start a standalone discussion when it needs more context than the weekly thread gives you.
              Keep it grounded, choose the right topics, and let the right people find it later.
            </p>
            <div className="mt-5">
              <CommunityComposerCard mode="standalone" tags={tags} />
            </div>
          </SurfaceCard>

          {selectedTopic ? (
            <div className="rounded-[1.25rem] border border-primary/15 bg-primary/5 px-4 py-3 text-sm text-primary">
              Filtering discussions by <span className="font-semibold">{selectedTopic.label}</span>.{" "}
              <a href="/community#community-discussions" className="underline underline-offset-4">
                Clear filter
              </a>
            </div>
          ) : null}

          {recentThreads.length > 0 ? (
            <div className="space-y-4">
              {recentThreads.map((thread) => (
                <CommunityThreadCard key={thread.id} thread={thread} currentMemberId={member.id} />
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
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
              }
              title={selectedTopic ? "Nothing has been posted in that topic yet." : "No standalone discussions yet."}
              subtitle={selectedTopic
                ? "You can be the first person to open a calm conversation in this topic."
                : "Standalone discussions are for the conversations that deserve more room than the weekly thread."}
            />
          )}
        </section>

        <section id="community-topics" className="space-y-4">
          <div>
            <p className="ui-section-eyebrow mb-2">Topics</p>
            <h2 className="heading-balance text-[clamp(1.7rem,1.45rem+0.7vw,2.2rem)] font-semibold tracking-[-0.04em] text-foreground">
              Curated lanes keep this easy to browse later.
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {tags.map((tag) => {
              const active = selectedTopic?.id === tag.id;
              return (
                <a
                  key={tag.id}
                  href={`/community?topic=${tag.slug}#community-discussions`}
                  className={`surface-card surface-card--editorial block p-5 transition-transform hover:translate-y-[-2px] ${
                    active ? "ring-2 ring-primary/20" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="heading-balance text-xl font-semibold tracking-[-0.03em] text-foreground">
                      {tag.label}
                    </h3>
                    <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                      {tag.thread_count}
                    </span>
                  </div>
                  {tag.description ? (
                    <p className="mt-3 text-sm leading-[1.7] text-muted-foreground">{tag.description}</p>
                  ) : null}
                </a>
              );
            })}
          </div>
        </section>

        <section id="community-saved" className="space-y-4">
          <div>
            <p className="ui-section-eyebrow mb-2">Saved</p>
            <h2 className="heading-balance text-[clamp(1.7rem,1.45rem+0.7vw,2.2rem)] font-semibold tracking-[-0.04em] text-foreground">
              Keep the threads and replies worth coming back to.
            </h2>
          </div>

          {savedItems.length > 0 ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {savedItems.map((item) => (
                <SurfaceCard key={item.id} padding="lg" className="surface-card--editorial">
                  <p className="ui-section-eyebrow mb-2">
                    {item.type === "thread" ? "Saved Discussion" : "Saved Reply"}
                  </p>
                  {item.thread ? (
                    <>
                      <h3 className="heading-balance text-xl font-semibold tracking-[-0.03em] text-foreground">
                        {item.thread.title ?? "Weekly reflection"}
                      </h3>
                      <p className="mt-3 line-clamp-4 whitespace-pre-wrap text-sm leading-[1.75] text-muted-foreground">
                        {item.thread.body}
                      </p>
                    </>
                  ) : item.post ? (
                    <>
                      <h3 className="heading-balance text-xl font-semibold tracking-[-0.03em] text-foreground">
                        {item.post.thread?.title ?? "Saved reply"}
                      </h3>
                      <p className="mt-3 line-clamp-4 whitespace-pre-wrap text-sm leading-[1.75] text-muted-foreground">
                        {item.post.body}
                      </p>
                    </>
                  ) : null}
                  <p className="mt-4 text-xs text-muted-foreground">
                    Saved {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(item.created_at))}
                  </p>
                </SurfaceCard>
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
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                </svg>
              }
              title="Nothing saved yet."
              subtitle="Use Save on any discussion or reply you want to return to later."
            />
          )}
        </section>
      </div>
    </div>
  );
}
