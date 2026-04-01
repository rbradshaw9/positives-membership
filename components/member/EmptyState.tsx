/**
 * components/member/EmptyState.tsx
 * Sprint 7: standardized empty state for member pages.
 * Sprint 11: improved visual weight — subtle card background, larger icon
 *   container, stronger title sizing, action slot unchanged.
 *
 * Renders a centered icon, title, subtitle, and optional CTA.
 * Used in Library no-results, Journal no-notes, etc.
 */

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, subtitle, action }: EmptyStateProps) {
  return (
    <div className="bg-card/60 rounded-2xl border border-border/50 p-8 md:p-12 mx-auto max-w-sm text-center flex flex-col items-center gap-3">
      <div className="w-14 h-14 rounded-full bg-muted/80 flex items-center justify-center text-muted-foreground/60">
        {icon}
      </div>
      <div>
        <p className="text-foreground text-base font-semibold">{title}</p>
        {subtitle && (
          <p className="text-muted-foreground text-sm mt-1 max-w-[260px] mx-auto leading-body">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
