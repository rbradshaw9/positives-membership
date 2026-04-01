/**
 * components/member/TypeBadge.tsx
 * Sprint 8: shared content-type badge chip.
 *
 * Used in JournalList and LibraryList for consistent type labeling.
 * Accepts a raw content type string and renders the human label + optional
 * color accent (Daily=primary, Weekly=secondary, Monthly=accent).
 */

interface TypeBadgeProps {
  type: string;
  /** Size variant — defaults to 'sm' */
  size?: "xs" | "sm";
}

const TYPE_LABEL: Record<string, string> = {
  daily_audio: "Daily",
  weekly_principle: "Weekly",
  monthly_theme: "Monthly",
  coaching_call: "Coaching",
};

// Subtle tonal chip per content type
const TYPE_STYLE: Record<string, string> = {
  daily_audio:
    "text-primary bg-primary/10 ring-1 ring-primary/20",
  weekly_principle:
    "text-secondary bg-secondary/10 ring-1 ring-secondary/20",
  monthly_theme:
    "text-accent bg-accent/10 ring-1 ring-accent/20",
  coaching_call:
    "text-foreground bg-foreground/6 ring-1 ring-border",
};

const DEFAULT_STYLE = "text-muted-foreground bg-muted ring-1 ring-border";

export function TypeBadge({ type, size = "sm" }: TypeBadgeProps) {
  const label = TYPE_LABEL[type] ?? type;
  const style = TYPE_STYLE[type] ?? DEFAULT_STYLE;
  const textSize = size === "xs" ? "text-[9px]" : "text-[10px]";

  return (
    <span
      className={`${textSize} inline-flex items-center rounded-full px-2.5 py-1 font-semibold uppercase tracking-[0.12em] ${style}`}
    >
      {label}
    </span>
  );
}
