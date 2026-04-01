import { Button } from "@/components/ui/Button";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";

type CommunityThreadHeroProps = {
  title: string;
  prompt: string;
  ctaLabel?: string;
  ctaHref?: string;
};

export function CommunityThreadHero({
  title,
  prompt,
  ctaLabel = "Share a reflection",
  ctaHref = "/",
}: CommunityThreadHeroProps) {
  return (
    <SurfaceCard tone="dark" padding="lg">
      <SectionEyebrow className="mb-3 text-white/65">This Week&apos;s Thread</SectionEyebrow>
      <h2 className="heading-balance font-heading text-2xl font-bold tracking-[-0.03em] text-white">
        {title}
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-body text-white/72">{prompt}</p>
      <Button href={ctaHref} variant="secondary" size="sm" className="mt-5">
        {ctaLabel}
      </Button>
    </SurfaceCard>
  );
}
