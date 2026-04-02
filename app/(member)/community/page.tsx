import { requireActiveMember } from "@/lib/auth/require-active-member";
import { checkTierAccess } from "@/lib/auth/check-tier-access";
import { getWeeklyContent } from "@/lib/queries/get-weekly-content";
import {
  getCommunityPosts,
  getPostReplies,
  getMemberLikedPostIds,
} from "@/lib/queries/get-community-posts";
import { config } from "@/lib/config";
import { CommunityThreadHero } from "@/components/community/CommunityThreadHero";
import { CommunityComposerCard } from "@/components/community/CommunityComposerCard";
import { CommunityPostCard } from "@/components/community/CommunityPostCard";
import { PageHeader } from "@/components/member/PageHeader";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { Button } from "@/components/ui/Button";

/**
 * app/(member)/community/page.tsx
 * Community Q&A page — weekly principle discussion threads.
 *
 * Level 2+ tier gating: Level 1 members see a friendly upgrade prompt.
 * Admins get pin/answer/delete controls on all posts.
 */

export const metadata = {
  title: "Q&A — Positives",
  description:
    "A calm place for member reflection and discussion around this week's principle.",
};

export default async function CommunityPage() {
  const member = await requireActiveMember();

  // ── Tier gate: Level 2+ only ──────────────────────────────────────────────
  const hasAccess = checkTierAccess(member.subscription_tier, "level_2");

  if (!hasAccess) {
    return (
      <div>
        <PageHeader
          title="Q&A"
          subtitle="Weekly discussions around each principle."
          hero
        />
        <div className="member-container py-10">
          <SurfaceCard tone="tint" padding="lg" className="surface-card--editorial text-center max-w-xl mx-auto">
            <p className="ui-section-eyebrow mb-3">Level 2 Feature</p>
            <h2 className="heading-balance font-heading text-2xl font-semibold tracking-[-0.03em] text-foreground">
              Join the conversation
            </h2>
            <p className="mt-3 text-sm leading-[1.75] text-muted-foreground">
              The Q&A section is available to Level 2 members and above.
              Upgrade your plan to share reflections, ask questions, and
              connect with other members around each week&apos;s principle.
            </p>
            <Button href="/account" className="mt-6">
              View upgrade options
            </Button>
          </SurfaceCard>
        </div>
      </div>
    );
  }

  // ── Fetch data ────────────────────────────────────────────────────────────
  const weeklyContent = await getWeeklyContent();
  const isAdmin = config.app.adminEmails.includes(member.email ?? "");

  // If no weekly content is published yet, show a gentle empty state
  if (!weeklyContent) {
    return (
      <div>
        <PageHeader
          title="Q&A"
          subtitle="Weekly discussions around each principle."
          hero
        />
        <div className="member-container py-10">
          <SurfaceCard padding="lg" className="surface-card--editorial text-center max-w-xl mx-auto">
            <h2 className="heading-balance font-heading text-xl font-semibold tracking-[-0.02em] text-foreground">
              No active thread yet
            </h2>
            <p className="mt-3 text-sm leading-[1.75] text-muted-foreground">
              A new discussion thread opens each week when the weekly principle
              is published. Check back soon.
            </p>
          </SurfaceCard>
        </div>
      </div>
    );
  }

  const posts = await getCommunityPosts(weeklyContent.id);

  // Collect all post IDs (top-level + we'll need to batch replies)
  const topLevelIds = posts.map((p) => p.id);

  // Get replies for all top-level posts in parallel
  const repliesByPostId = new Map<string, Awaited<ReturnType<typeof getPostReplies>>>();
  if (topLevelIds.length > 0) {
    const repliesArray = await Promise.all(
      topLevelIds
        .filter((id) => {
          const post = posts.find((p) => p.id === id);
          return post && post.reply_count > 0;
        })
        .map(async (id) => {
          const replies = await getPostReplies(id);
          return { postId: id, replies };
        })
    );
    for (const { postId, replies } of repliesArray) {
      repliesByPostId.set(postId, replies);
    }
  }

  // Collect all post+reply IDs for like lookup
  const allPostIds = [
    ...topLevelIds,
    ...Array.from(repliesByPostId.values()).flatMap((r) => r.map((rr) => rr.id)),
  ];

  const memberLikedIds = await getMemberLikedPostIds(member.id, allPostIds);

  const promptText = weeklyContent.excerpt
    ?? weeklyContent.description
    ?? "How did this principle show up for you this week?";

  return (
    <div>
      <PageHeader
        title="Q&A"
        subtitle="A calm place for reflection and discussion around this week's principle."
        hero
      />

      <div className="member-container flex flex-col gap-5 py-8 md:py-10">
        {/* Thread hero */}
        <CommunityThreadHero
          title={weeklyContent.title}
          prompt={promptText}
          postCount={posts.length}
        />

        {/* Composer */}
        <CommunityComposerCard contentId={weeklyContent.id} />

        {/* Feed */}
        {posts.length === 0 ? (
          <SurfaceCard padding="lg" className="surface-card--editorial text-center">
            <p className="font-medium text-foreground">No posts yet this week</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Be the first to share a reflection or ask a question.
            </p>
          </SurfaceCard>
        ) : (
          <div className="flex flex-col gap-4">
            {posts.map((post) => (
              <CommunityPostCard
                key={post.id}
                post={post}
                currentMemberId={member.id}
                isLiked={memberLikedIds.has(post.id)}
                isAdmin={isAdmin}
                replies={repliesByPostId.get(post.id) ?? []}
                repliedPostIds={memberLikedIds}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
