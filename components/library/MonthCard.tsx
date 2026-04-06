import Link from "next/link";
import type { MonthArchiveItem } from "@/lib/queries/get-monthly-archive";

/**
 * components/library/MonthCard.tsx
 *
 * Archive row card for the Library monthly archive section.
 * Shows month label, theme description, and content counts.
 */

interface MonthCardProps {
  month: MonthArchiveItem;
}

export function MonthCard({ month }: MonthCardProps) {
  const href = `/library/months/${month.month_year}`;

  const parts: string[] = [];
  if (month.daily_count > 0) parts.push(`${month.daily_count} daily`);
  if (month.weekly_count > 0) parts.push(`${month.weekly_count} weekly`);
  if (month.has_theme) parts.push("1 theme");

  return (
    <Link
      href={href}
      className="group flex items-center gap-4 p-4 md:p-5 rounded-2xl border transition-all duration-200 hover:border-primary/30 hover:shadow-md hover:bg-surface-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      style={{ borderColor: "var(--color-border)", background: "var(--color-surface, #fff)" }}
    >
      {/* Month indicator */}
      <div
        className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
        style={{
          background: "color-mix(in srgb, var(--color-primary) 10%, transparent)",
        }}
      >
        <svg
          width="20" height="20" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="1.5"
          style={{ color: "var(--color-primary)" }}
          aria-hidden="true"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        <p className="font-heading font-semibold text-base text-foreground group-hover:text-primary transition-colors">
          {month.label}
        </p>
        {month.description && (
          <p className="text-sm text-muted-foreground line-clamp-1">{month.description}</p>
        )}
        {parts.length > 0 && (
          <p className="text-xs text-muted-foreground/70 mt-0.5">{parts.join(" · ")}</p>
        )}
      </div>

      {/* Arrow */}
      <svg
        width="16" height="16" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="2"
        className="flex-shrink-0 text-muted-foreground group-hover:text-primary transition-colors group-hover:translate-x-0.5 duration-200"
        aria-hidden="true"
      >
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </Link>
  );
}
