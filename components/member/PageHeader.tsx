/**
 * components/member/PageHeader.tsx
 * Sprint 7: consistent page header for all member pages.
 *
 * Renders a title (h1), optional subtitle, and optional right-side element.
 */

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** Optional element rendered to the right of the title (e.g. streak chip, action) */
  right?: React.ReactNode;
}

export function PageHeader({ title, subtitle, right }: PageHeaderProps) {
  return (
    <header className="mb-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading font-bold text-2xl text-foreground tracking-[-0.03em]">
          {title}
        </h1>
        {right && <div className="flex-shrink-0">{right}</div>}
      </div>
      {subtitle && (
        <p className="text-sm text-muted-foreground mt-1 leading-body">
          {subtitle}
        </p>
      )}
    </header>
  );
}
