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
};

// Subtle tonal chip per content type
const TYPE_STYLE: Record<string, string> = {
  daily_audio:
    "text-primary bg-primary/8 ring-1 ring-primary/15",
  weekly_principle:
    "text-secondary bg-secondary/8 ring-1 ring-secondary/15",
  monthly_theme:
    "text-accent bg-accent/8 ring-1 ring-accent/15",
};

const DEFAULT_STYLE = "text-muted-foreground bg-muted ring-1 ring-border";

export function TypeBadge({ type, size = "sm" }: TypeBadgeProps) {
  const label = TYPE_LABEL[type] ?? type;
  const style = TYPE_STYLE[type] ?? DEFAULT_STYLE;
  const textSize = size === "xs" ? "text-[9px]" : "text-[10px]";

  return (
    <span
      className={`${textSize} font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full ${style}`}
    >
      {label}
    </span>
  );
}
