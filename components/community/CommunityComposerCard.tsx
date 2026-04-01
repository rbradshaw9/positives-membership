import { Button } from "@/components/ui/Button";
import { SurfaceCard } from "@/components/ui/SurfaceCard";

type CommunityComposerCardProps = {
  title: string;
  subtitle: string;
  ctaLabel?: string;
  ctaHref?: string;
};

export function CommunityComposerCard({
  title,
  subtitle,
  ctaLabel = "Start writing",
  ctaHref = "/",
}: CommunityComposerCardProps) {
  return (
    <SurfaceCard elevated className="text-center">
      <h2 className="heading-balance font-heading text-xl font-semibold tracking-[-0.02em] text-foreground">
        {title}
      </h2>
      <p className="mt-2 text-sm leading-body text-muted-foreground">{subtitle}</p>
      <Button href={ctaHref} size="sm" className="mt-5">
        {ctaLabel}
      </Button>
    </SurfaceCard>
  );
}
