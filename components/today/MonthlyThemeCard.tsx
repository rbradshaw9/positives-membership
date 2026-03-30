/**
 * components/today/MonthlyThemeCard.tsx
 * This Month section on the Today page — placeholder until content is wired.
 */
export function MonthlyThemeCard() {
  return (
    <article className="bg-surface-tint rounded-lg border border-border shadow-soft p-5">
      <span className="text-xs font-medium uppercase tracking-widest text-accent mb-3 block">
        This Month
      </span>
      <h2 className="font-heading font-semibold text-lg text-foreground leading-heading tracking-[-0.02em] mb-2">
        Building Emotional Resilience
      </h2>
      <p className="text-sm text-muted-foreground leading-body">
        April&apos;s theme explores the foundation beneath calm — how to stay
        grounded when life pushes back. Dr. Paul guides us through the science
        and practice of emotional resilience.
      </p>
    </article>
  );
}
