/**
 * components/member/EmptyState.tsx
 * Sprint 7: standardized empty state for member pages.
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
    <div className="text-center py-16 flex flex-col items-center gap-3">
      <div className="text-muted-foreground/40">{icon}</div>
      <div>
        <p className="text-foreground text-sm font-medium">{title}</p>
        {subtitle && (
          <p className="text-muted-foreground text-sm mt-1 max-w-[260px] mx-auto leading-body">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
