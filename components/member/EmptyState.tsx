import { EmptyStateCard } from "@/components/ui/EmptyStateCard";

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
  return <EmptyStateCard icon={icon} title={title} subtitle={subtitle} action={action} />;
}
