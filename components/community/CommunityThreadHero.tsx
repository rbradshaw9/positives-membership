import { Button } from "@/components/ui/Button";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";

/**
 * components/community/CommunityThreadHero.tsx
 * Weekly principle thread hero card — dark card with weekly prompt.
 * Now accepts postCount for social proof.
 */

type CommunityThreadHeroProps = {
  title: string;
  prompt: string;
  postCount?: number;
  ctaLabel?: string;
  ctaHref?: string;
};

export function CommunityThreadHero({
  title,
  prompt,
  postCount,
  ctaLabel = "Share a reflection",
  ctaHref = "#community-composer",
}: CommunityThreadHeroProps) {
  return (
    <SurfaceCard tone="dark" padding="lg" className="surface-card--editorial">
      <SectionEyebrow className="mb-3 text-white/65">This Week&apos;s Thread</SectionEyebrow>
      <h2 className="heading-balance font-heading text-[clamp(1.9rem,1.45rem+1vw,2.8rem)] font-bold tracking-[-0.04em] text-white">
        {title}
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-[1.75] text-white/72">{prompt}</p>
      <div className="mt-5 flex flex-wrap items-center gap-4">
        <Button href={ctaHref} variant="secondary" size="sm">
          {ctaLabel}
        </Button>
        {postCount !== undefined && postCount > 0 && (
          <span className="text-xs font-medium text-white/50">
            {postCount} {postCount === 1 ? "post" : "posts"} this week
          </span>
        )}
      </div>
    </SurfaceCard>
  );
}
