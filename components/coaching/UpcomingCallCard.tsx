/**
 * components/coaching/UpcomingCallCard.tsx
 * Sprint 10: Shows the next upcoming live coaching call.
 * Zoom URL is NEVER rendered here — it is server-rendered only at the page level.
 */

interface UpcomingCallCardProps {
  title: string;
  description: string | null;
  startsAt: string | null;
  zoomUrl: string | null; // server-rendered, never in client JS bundle
}

function formatCallTime(isoString: string): string {
  const d = new Date(isoString);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(d);
}

export function UpcomingCallCard({ title, description, startsAt, zoomUrl }: UpcomingCallCardProps) {
  const isUpcoming = startsAt ? new Date(startsAt) > new Date() : false;

  return (
    <div
      className="rounded-2xl p-6 flex flex-col gap-4"
      style={{
        background: "color-mix(in srgb, var(--color-primary) 8%, var(--color-card))",
        border: "1px solid color-mix(in srgb, var(--color-primary) 20%, var(--color-border))",
      }}
    >
      {/* Label */}
      <div className="flex items-center gap-2">
        <span
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wide"
          style={{
            background: "color-mix(in srgb, var(--color-primary) 15%, transparent)",
            color: "var(--color-primary)",
          }}
        >
          <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor" aria-hidden="true">
            <circle cx="4" cy="4" r="4" />
          </svg>
          {isUpcoming ? "Upcoming" : "Next call"}
        </span>
      </div>

      {/* Title + time */}
      <div>
        <h2
          className="font-heading font-semibold text-lg tracking-tight"
          style={{ color: "var(--color-foreground)" }}
        >
          {title}
        </h2>
        {startsAt && (
          <p className="text-sm mt-1" style={{ color: "var(--color-muted-foreground)" }}>
            {formatCallTime(startsAt)}
          </p>
        )}
      </div>

      {description && (
        <p className="text-sm leading-relaxed" style={{ color: "var(--color-muted-foreground)" }}>
          {description}
        </p>
      )}

      {/* Join link — server rendered. Zoom URL stays on server-side only. */}
      {zoomUrl && isUpcoming && (
        <a
          href={zoomUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="self-start inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{
            background: "var(--color-primary)",
            color: "var(--color-primary-foreground)",
          }}
        >
          Join call
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </a>
      )}
    </div>
  );
}
