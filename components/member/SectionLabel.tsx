import { SectionEyebrow } from "@/components/ui/SectionEyebrow";

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
  return <SectionEyebrow id={id} as="h2" className="mb-3">{children}</SectionEyebrow>;
}
