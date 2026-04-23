import { requireActiveMember } from "@/lib/auth/require-active-member";
import { checkTierAccess } from "@/lib/auth/check-tier-access";
import {
  COMMUNITY_POST_TYPE_OPTIONS,
  getCommunityLaneDescription,
  getCommunityLaneHref,
  getCommunityLaneLabel,
  getCommunityPostTypeFromLaneSlug,
  isCommunityView,
} from "@/lib/community/shared";
import {
  getCommunityFeedThreads,
  getCommunityNotifications,
  getFollowingCommunityThreads,
  getSavedCommunityItems,
} from "@/lib/queries/get-community-posts";
import { CommunityComposerCard } from "@/components/community/CommunityComposerCard";
import { CommunityNotificationStrip } from "@/components/community/CommunityNotificationStrip";
import { CommunityThreadCard } from "@/components/community/CommunityThreadCard";
import { EmptyState } from "@/components/member/EmptyState";
import { PageHeader } from "@/components/member/PageHeader";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { Button } from "@/components/ui/Button";

export const metadata = {
  title: "Community — Positives",
  description:
    "A calm community space for wins, support, thoughtful questions, and the discussions you want to follow.",
};

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatSavedDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(value));
}

export default async function CommunityPage({ searchParams }: PageProps) {
  const member = await requireActiveMember();
  const hasAccess = checkTierAccess(member.subscription_tier, "level_2");

  if (!hasAccess) {
    return (
      <div>
        <PageHeader
          title="Community"
          subtitle="A calm place for support, shared wins, and thoughtful member conversation."
          hero
        />
        <div className="member-container py-10">
          <SurfaceCard tone="tint" padding="lg" className="surface-card--editorial mx-auto max-w-2xl text-center">
            <p className="ui-section-eyebrow mb-3">Membership + Events Feature</p>
            <h2 className="heading-balance text-2xl font-semibold tracking-[-0.035em] text-foreground">
              Join the deeper member room.
            </h2>
            <p className="mt-3 text-sm leading-[1.8] text-muted-foreground">
              Community is part of Membership + Events and above. That keeps the room smaller,
              warmer, and much easier for members and coaches to engage with care.
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
  const laneSlug = firstValue(resolvedSearchParams.lane)?.trim() ?? "";
  const selectedLane = getCommunityPostTypeFromLaneSlug(laneSlug);
  const selectedViewRaw = firstValue(resolvedSearchParams.view)?.trim() ?? "feed";
  const selectedView = isCommunityView(selectedViewRaw) ? selectedViewRaw : "feed";

  const [feedThreads, followingThreads, savedItems, notifications] = await Promise.all([
    getCommunityFeedThreads(member.id, { lane: selectedLane ?? undefined, limit: 24 }),
    getFollowingCommunityThreads(member.id, { limit: 24 }),
    getSavedCommunityItems(member.id, 16),
    getCommunityNotifications(member.id, { limit: 6, unreadOnly: true }),
  ]);

  const featuredThreads = feedThreads.filter((thread) => thread.is_pinned || thread.is_featured).slice(0, 4);
  const helpfulReplies = featuredThreads
    .flatMap((thread) =>
      thread.replies
        .filter((reply) => reply.is_official_answer)
        .map((reply) => ({
          id: reply.id,
          body: reply.body,
          threadId: thread.id,
          threadTitle: thread.title ?? getCommunityLaneLabel(thread.post_type),
        }))
    )
    .slice(0, 3);
  const savedThreads = savedItems
    .filter((item) => item.thread)
    .map((item) => item.thread)
    .filter((thread): thread is NonNullable<typeof thread> => Boolean(thread));
  const viewHref = (view: string) => `/community?view=${view}`;

  return (
    <div>
      <PageHeader
        title="Community"
        subtitle="A calm room for support, shared wins, questions, and the conversations you want to stay with."
        hero
      />

      <div className="member-container flex flex-col gap-6 py-8 md:gap-8 md:py-10">
        <CommunityNotificationStrip notifications={notifications} />

        <nav aria-label="Community sections" className="member-segmented-control">
          {[
            { key: "featured", label: "Featured" },
            { key: "feed", label: "Feed" },
            { key: "following", label: "Following" },
            { key: "saved", label: "Saved" },
          ].map((item) => (
            <a
              key={item.key}
              className="member-segmented-control__item"
              data-active={selectedView === item.key}
              href={viewHref(item.key)}
            >
              {item.label}
            </a>
          ))}
        </nav>

        {selectedView === "featured" ? (
          <section className="space-y-5">
            <SurfaceCard tone="dark" padding="lg" className="surface-card--editorial">
              <p className="ui-section-eyebrow mb-3 text-white/65">Featured</p>
              <h2 className="heading-balance font-heading text-[clamp(1.95rem,1.5rem+1vw,2.95rem)] font-bold tracking-[-0.045em] text-white">
                Helpful posts and replies worth reading first.
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-[1.8] text-white/72">
                Coaches and moderators can feature posts or mark replies as helpful so the best
                parts of the room are easier to find again.
              </p>
            </SurfaceCard>

            <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
              <SurfaceCard padding="lg" className="surface-card--editorial">
                <p className="ui-section-eyebrow mb-2">Featured posts</p>
                <h3 className="heading-balance text-[clamp(1.5rem,1.3rem+0.6vw,2rem)] font-semibold tracking-[-0.04em] text-foreground">
                  A few grounded conversations to start with.
                </h3>
                {featuredThreads.length > 0 ? (
                  <div className="mt-4 space-y-4">
                    {featuredThreads.map((thread) => (
                      <div key={thread.id} id={`thread-${thread.id}`}>
                        <CommunityThreadCard thread={thread} currentMemberId={member.id} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm leading-[1.8] text-muted-foreground">
                    Featured posts will show up here when the community has strong conversations to highlight.
                  </p>
                )}
              </SurfaceCard>

              <SurfaceCard padding="lg" className="surface-card--editorial">
                <p className="ui-section-eyebrow mb-2">Helpful replies</p>
                <h3 className="heading-balance text-[clamp(1.35rem,1.2rem+0.5vw,1.8rem)] font-semibold tracking-[-0.035em] text-foreground">
                  Small responses that carry a lot.
                </h3>
                {helpfulReplies.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {helpfulReplies.map((reply) => (
                      <div key={reply.id} className="rounded-[1.25rem] border border-border/80 bg-white p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
                          Helpful reply
                        </p>
                        <p className="mt-2 line-clamp-5 whitespace-pre-wrap text-sm leading-[1.75] text-muted-foreground">
                          {reply.body}
                        </p>
                        <a
                          href={`/community?view=feed#thread-${reply.threadId}`}
                          className="mt-3 inline-flex text-xs font-semibold text-primary underline underline-offset-4"
                        >
                          Jump to {reply.threadTitle}
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm leading-[1.8] text-muted-foreground">
                    Helpful replies will show up here once moderators start surfacing the most useful responses.
                  </p>
                )}
              </SurfaceCard>
            </div>
          </section>
        ) : null}

        {selectedView === "feed" ? (
          <section className="space-y-5">
            <SurfaceCard padding="lg" className="surface-card--editorial">
              <p className="ui-section-eyebrow mb-2">Main feed</p>
              <h2 className="heading-balance text-[clamp(1.8rem,1.5rem+0.8vw,2.4rem)] font-semibold tracking-[-0.04em] text-foreground">
                Share what is real, then let the right people meet you there.
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-[1.8] text-muted-foreground">
                Use Wins for celebrations, Support for the parts that feel hard, and Questions when
                you want perspective from the room.
              </p>
              <div className="mt-5">
                <CommunityComposerCard />
              </div>
            </SurfaceCard>

            <div className="flex flex-wrap gap-2">
              <a
                href={viewHref("feed")}
                className={`rounded-full border px-3.5 py-2 text-xs font-semibold transition-all ${
                  !selectedLane
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border bg-white text-muted-foreground hover:border-primary/20 hover:text-foreground"
                }`}
              >
                All posts
              </a>
              {COMMUNITY_POST_TYPE_OPTIONS.map((option) => {
                const active = selectedLane === option.value;
                return (
                  <a
                    key={option.value}
                    href={`/community?view=feed&lane=${getCommunityLaneHref(option.value)}`}
                    className={`rounded-full border px-3.5 py-2 text-xs font-semibold transition-all ${
                      active
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : "border-border bg-white text-muted-foreground hover:border-primary/20 hover:text-foreground"
                    }`}
                  >
                    {option.label}
                  </a>
                );
              })}
            </div>

            {selectedLane ? (
              <div className="rounded-[1.25rem] border border-primary/15 bg-primary/5 px-4 py-3 text-sm text-primary">
                Showing <span className="font-semibold">{getCommunityLaneLabel(selectedLane)}</span> posts only.
                <span className="ml-2 text-primary/80">{getCommunityLaneDescription(selectedLane)}</span>
              </div>
            ) : null}

            {feedThreads.length > 0 ? (
              <div className="space-y-4">
                {feedThreads.map((thread) => (
                  <div key={thread.id} id={`thread-${thread.id}`}>
                    <CommunityThreadCard thread={thread} currentMemberId={member.id} />
                  </div>
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
                title={selectedLane ? `No ${getCommunityLaneLabel(selectedLane).toLowerCase()} posts yet.` : "The room is still quiet."}
                subtitle={selectedLane
                  ? "You can be the first person to open this lane in a real and grounded way."
                  : "A simple, honest post is enough to make the community feel alive."}
              />
            )}
          </section>
        ) : null}

        {selectedView === "following" ? (
          <section className="space-y-5">
            <SurfaceCard padding="lg" className="surface-card--editorial">
              <p className="ui-section-eyebrow mb-2">Following</p>
              <h2 className="heading-balance text-[clamp(1.8rem,1.5rem+0.8vw,2.4rem)] font-semibold tracking-[-0.04em] text-foreground">
                The discussions you chose to stay with.
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-[1.8] text-muted-foreground">
                Following means you want reply updates when a conversation moves. New replies show up directly on the cards below.
              </p>
            </SurfaceCard>

            {followingThreads.length > 0 ? (
              <div className="space-y-4">
                {followingThreads.map((thread) => (
                  <div key={thread.id} id={`thread-${thread.id}`}>
                    <CommunityThreadCard thread={thread} currentMemberId={member.id} />
                  </div>
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
                    <path d="M8 12h8" />
                    <path d="M12 8v8" />
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                }
                title="You are not following any discussions yet."
                subtitle="Use Follow on any post you want updates from. Your own posts will be followed automatically."
              />
            )}
          </section>
        ) : null}

        {selectedView === "saved" ? (
          <section className="space-y-4">
            <div>
              <p className="ui-section-eyebrow mb-2">Saved</p>
              <h2 className="heading-balance text-[clamp(1.7rem,1.45rem+0.7vw,2.2rem)] font-semibold tracking-[-0.04em] text-foreground">
                Keep the posts worth returning to.
              </h2>
            </div>

            {savedThreads.length > 0 ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {savedItems.filter((item) => item.thread).map((item) => (
                  <SurfaceCard key={item.id} padding="lg" className="surface-card--editorial">
                    <p className="ui-section-eyebrow mb-2">Saved post</p>
                    <h3 className="heading-balance text-xl font-semibold tracking-[-0.03em] text-foreground">
                      {item.thread?.title ?? getCommunityLaneLabel(item.thread?.post_type ?? "reflection")}
                    </h3>
                    <p className="mt-3 line-clamp-4 whitespace-pre-wrap text-sm leading-[1.75] text-muted-foreground">
                      {item.thread?.body}
                    </p>
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <p className="text-xs text-muted-foreground">Saved {formatSavedDate(item.created_at)}</p>
                      {item.thread ? (
                        <a
                          href={`/community?view=feed#thread-${item.thread.id}`}
                          className="text-xs font-semibold text-primary underline underline-offset-4"
                        >
                          Open post
                        </a>
                      ) : null}
                    </div>
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
                subtitle="Use Save on any post you want to come back to when you need it."
              />
            )}
          </section>
        ) : null}
      </div>
    </div>
  );
}
