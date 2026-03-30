/**
 * components/today/WeeklyPrincipleCard.tsx
 * This Week section on the Today page — placeholder until content is wired.
 */
export function WeeklyPrincipleCard() {
  return (
    <article className="bg-card rounded-lg border border-border shadow-soft p-5">
      <span className="text-xs font-medium uppercase tracking-widest text-secondary mb-3 block">
        This Week
      </span>
      <h2 className="font-heading font-semibold text-lg text-foreground leading-heading tracking-[-0.02em] mb-2">
        The Practice of Presence
      </h2>
      <p className="text-sm text-muted-foreground leading-body">
        This week&apos;s principle is about returning your attention to the
        present moment — gently, without judgment, as many times as needed.
      </p>
    </article>
  );
}
