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
    <SurfaceCard tone="dark" padding="lg" className="surface-card--editorial">
      <SectionEyebrow className="mb-3 text-white/65">This Week&apos;s Thread</SectionEyebrow>
      <h2 className="heading-balance font-heading text-[clamp(1.9rem,1.45rem+1vw,2.8rem)] font-bold tracking-[-0.04em] text-white">
        {title}
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-[1.75] text-white/72">{prompt}</p>
      <Button href={ctaHref} variant="secondary" size="sm" className="mt-5">
        {ctaLabel}
      </Button>
    </SurfaceCard>
  );
}
