/**
 * components/member/PageHeader.tsx
 * Sprint 9: larger display heading to match marketing site typography scale.
 *
 * h1: text-3xl md:text-4xl — matches marketing section headings.
 * subtitle: text-base with generous line-height to feel spacious and premium.
 */

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** Optional element rendered to the right of the title */
  right?: React.ReactNode;
}

export function PageHeader({ title, subtitle, right }: PageHeaderProps) {
  return (
    <header className="mb-8">
      <div className="flex items-start justify-between gap-4">
        <h1 className="font-heading font-bold text-3xl md:text-4xl text-foreground tracking-[-0.035em] leading-tight">
          {title}
        </h1>
        {right && <div className="flex-shrink-0 mt-1.5">{right}</div>}
      </div>
      {subtitle && (
        <p className="text-base text-muted-foreground mt-2 leading-body max-w-lg">
          {subtitle}
        </p>
      )}
    </header>
  );
}
