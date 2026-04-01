type PageHeroProps = {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  eyebrow?: string;
};

export function PageHero({ title, subtitle, right, eyebrow }: PageHeroProps) {
  return (
    <section className="ui-page-hero">
      <div className="member-container py-10 md:py-14">
        {eyebrow && <p className="ui-section-eyebrow mb-3">{eyebrow}</p>}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1
              className="font-heading font-bold text-3xl md:text-4xl text-foreground tracking-[-0.035em] leading-tight heading-balance"
            >
              {title}
            </h1>
            {subtitle && (
              <p className="mt-2 max-w-2xl text-base text-muted-foreground leading-body">
                {subtitle}
              </p>
            )}
          </div>
          {right && <div className="flex-shrink-0 mt-1.5">{right}</div>}
        </div>
      </div>
    </section>
  );
}
