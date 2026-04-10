import { SurfaceCard } from "@/components/ui/SurfaceCard";

interface EventReplayCardProps {
  title: string;
  description: string | null;
  startsAt: string | null;
  vimeoVideoId: string | null;
  youtubeVideoId: string | null;
  durationSeconds: number | null;
}

function formatReplayDate(isoString: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(isoString));
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}

export function EventReplayCard({
  title,
  description,
  startsAt,
  vimeoVideoId,
  youtubeVideoId,
  durationSeconds,
}: EventReplayCardProps) {
  const hasVideo = Boolean(vimeoVideoId || youtubeVideoId);

  return (
    <SurfaceCard elevated className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div
          className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg"
          style={{
            background: hasVideo
              ? "color-mix(in srgb, var(--color-secondary) 12%, transparent)"
              : "var(--color-muted)",
          }}
        >
          {hasVideo ? (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: "var(--color-secondary)" }}
              aria-hidden="true"
            >
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          ) : (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: "var(--color-muted-foreground)" }}
              aria-hidden="true"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold leading-snug" style={{ color: "var(--color-foreground)" }}>
            {title}
          </h3>

          <div className="mt-1 flex items-center gap-3">
            {startsAt ? (
              <span className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>
                {formatReplayDate(startsAt)}
              </span>
            ) : null}
            {durationSeconds ? (
              <span className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>
                {formatDuration(durationSeconds)}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {description ? (
        <p className="text-xs leading-relaxed" style={{ color: "var(--color-muted-foreground)" }}>
          {description}
        </p>
      ) : null}

      {hasVideo ? (
        <div className="pt-1">
          {vimeoVideoId ? (
            <a
              href={`https://vimeo.com/${vimeoVideoId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium transition-colors hover:opacity-80"
              style={{ color: "var(--color-primary)" }}
            >
              Watch replay →
            </a>
          ) : null}
          {!vimeoVideoId && youtubeVideoId ? (
            <a
              href={`https://youtube.com/watch?v=${youtubeVideoId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium transition-colors hover:opacity-80"
              style={{ color: "var(--color-primary)" }}
            >
              Watch replay →
            </a>
          ) : null}
        </div>
      ) : null}
    </SurfaceCard>
  );
}
