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
        subtitle="A readable, thoughtful preview of how member conversation will feel when the community launches."
        hero
      />

      <div className="member-container flex flex-col gap-5 py-8 md:py-10">
        {!communityPreviewEnabled && (
          <SurfaceCard tone="tint" className="surface-card--editorial border-dashed">
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

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <SurfaceCard elevated className="surface-card--editorial p-0">
            <div className="border-b border-border px-5 py-4">
              <p className="ui-section-eyebrow mb-2">Feed Preview</p>
              <p className="text-lg font-semibold tracking-[-0.02em] text-foreground">
                Weekly discussion thread
              </p>
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

          <SurfaceCard tone="tint" className="surface-card--editorial">
            <p className="ui-section-eyebrow mb-2">Preview Structure</p>
            <h2 className="heading-balance font-heading text-2xl font-semibold tracking-[-0.03em] text-foreground">
              Calm by design
            </h2>
            <p className="mt-2 text-sm leading-[1.75] text-muted-foreground">
              This preview keeps the layout intentional: a hero for the weekly prompt, a clear
              composer area, and readable post cards ready for launch.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full bg-background px-3 py-1 text-xs font-semibold text-muted-foreground ring-1 ring-border">
                Weekly prompt
              </span>
              <span className="rounded-full bg-background px-3 py-1 text-xs font-semibold text-muted-foreground ring-1 ring-border">
                Composer
              </span>
              <span className="rounded-full bg-background px-3 py-1 text-xs font-semibold text-muted-foreground ring-1 ring-border">
                Feed cards
              </span>
            </div>
          </SurfaceCard>
        </div>

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
