import { Button } from "@/components/ui/Button";
import { SurfaceCard } from "@/components/ui/SurfaceCard";

type MemberUnavailableStateProps = {
  eyebrow?: string;
  title: string;
  subtitle: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
};

export function MemberUnavailableState({
  eyebrow = "Not available",
  title,
  subtitle,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
}: MemberUnavailableStateProps) {
  return (
    <div className="member-container py-10 pb-28 md:py-14">
      <SurfaceCard
        tone="tint"
        padding="lg"
        elevated
        className="surface-card--editorial mx-auto max-w-2xl text-center"
      >
        <div
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary"
          aria-hidden="true"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 6v6l4 2" />
            <circle cx="12" cy="12" r="9" />
          </svg>
        </div>
        <p className="ui-section-eyebrow mt-5">{eyebrow}</p>
        <h1 className="heading-balance mt-3 font-heading text-2xl font-semibold tracking-[-0.035em] text-foreground md:text-3xl">
          {title}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-[1.8] text-muted-foreground">
          {subtitle}
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Button href={primaryHref} className="justify-center">
            {primaryLabel}
          </Button>
          {secondaryHref && secondaryLabel ? (
            <Button href={secondaryHref} variant="outline" className="justify-center">
              {secondaryLabel}
            </Button>
          ) : null}
        </div>
      </SurfaceCard>
    </div>
  );
}
