/**
 * components/member/SectionLabel.tsx
 * Sprint 7: shared uppercase eyebrow label for content sections.
 *
 * Extracted from Account page's inline SectionLabel — now shared
 * across Account, Library month groups, Journal month dividers.
 */

interface SectionLabelProps {
  id?: string;
  children: React.ReactNode;
}

export function SectionLabel({ id, children }: SectionLabelProps) {
  return (
    <h2
      id={id}
      className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3"
    >
      {children}
    </h2>
  );
}
