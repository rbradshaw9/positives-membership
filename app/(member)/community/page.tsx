import { CommunityComposerCard } from "@/components/community/CommunityComposerCard";
import { CommunityPostCard } from "@/components/community/CommunityPostCard";
import { CommunityThreadHero } from "@/components/community/CommunityThreadHero";
import { PageHeader } from "@/components/member/PageHeader";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { config } from "@/lib/config";

export const metadata = {
  title: "Community — Positives",
  description: "A calm place for member reflection and discussion.",
};

export default function CommunityPage() {
  const communityPreviewEnabled = config.app.communityPreviewEnabled;

  return (
    <div>
      <PageHeader
        title="Community"
        subtitle="Thoughtful conversation around this week’s practice, prepared for a future launch."
        hero
      />

      <div className="member-container flex flex-col gap-5 py-8 md:py-10">
        {!communityPreviewEnabled && (
          <SurfaceCard tone="tint" className="border-dashed">
            <p className="ui-section-eyebrow mb-2">Preview Mode</p>
            <h2 className="heading-balance font-heading text-xl font-semibold tracking-[-0.02em] text-foreground">
              Community is not live yet
            </h2>
            <p className="mt-2 text-sm leading-body text-muted-foreground">
              The route and reusable surfaces are ready. Member posting will stay behind a feature flag until the full system is launched.
            </p>
          </SurfaceCard>
        )}

        <CommunityThreadHero
          title="What helped this week’s principle land for you?"
          prompt="Use this space to share a reflection, a question, or a small shift you noticed while practicing. The live community flow is still being prepared, so the content below is placeholder-only for now."
          ctaLabel="Open composer preview"
          ctaHref="#community-composer"
        />

        <SurfaceCard elevated className="p-0">
          <div className="border-b border-border px-5 py-4">
            <p className="text-sm font-semibold text-foreground">Weekly discussion thread</p>
            <p className="mt-1 text-sm text-muted-foreground">
              The thread list is intentionally empty until community launches.
            </p>
          </div>
          <div className="px-5 py-10 text-center">
            <p className="font-medium text-foreground">No live posts yet</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Placeholder thread data is wired below so the production UI is ready when the flag turns on.
            </p>
          </div>
        </SurfaceCard>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div id="community-composer">
            <CommunityComposerCard
              title="Share a calm, honest reflection"
              subtitle="The composer is staged and ready. Posting is still disabled until the feature flag is enabled for launch."
              ctaLabel="Composer preview"
              ctaHref="/community"
            />
          </div>

          <CommunityPostCard
            author="Positives Preview"
            initials="PP"
            timeLabel="Placeholder"
            typeLabel="Reflection"
            body="This sample card shows the thread surface and spacing that will ship with the community launch. It is intentionally static for now."
            likes={0}
          />
        </div>
      </div>
    </div>
  );
}
