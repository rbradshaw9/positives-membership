import { Button } from "@/components/ui/Button";
import { SurfaceCard } from "@/components/ui/SurfaceCard";

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
    <SurfaceCard tone="tint" padding="lg" elevated className="flex flex-col gap-4">
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
          className="heading-balance font-heading font-semibold text-lg tracking-tight"
        >
          {title}
        </h2>
        {startsAt && (
          <p className="mt-1 text-sm text-muted-foreground">
            {formatCallTime(startsAt)}
          </p>
        )}
      </div>

      {description && (
        <p className="text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}

      {/* Join link — server rendered. Zoom URL stays on server-side only. */}
      {zoomUrl && isUpcoming && (
        <Button href={zoomUrl} target="_blank" rel="noopener noreferrer" className="self-start">
          Join call
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </Button>
      )}
    </SurfaceCard>
  );
}
