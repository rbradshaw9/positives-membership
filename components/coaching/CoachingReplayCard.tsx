/**
 * components/coaching/CoachingReplayCard.tsx
 * Sprint 10: Card for past coaching call replays.
 * Shows a Vimeo/YouTube embed link or a plain title if no video is available.
 */

interface CoachingReplayCardProps {
  id: string;
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
  const m = Math.floor(seconds / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  return `${m}m`;
}

export function CoachingReplayCard({
  title,
  description,
  startsAt,
  vimeoVideoId,
  youtubeVideoId,
  durationSeconds,
}: CoachingReplayCardProps) {
  const hasVideo = !!(vimeoVideoId || youtubeVideoId);

  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-3"
      style={{
        background: "var(--color-card)",
        border: "1px solid var(--color-border)",
      }}
    >
      <div className="flex items-start gap-3">
        {/* Video badge */}
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
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

        <div className="flex-1 min-w-0">
          <h3
            className="font-semibold text-sm leading-snug"
            style={{ color: "var(--color-foreground)" }}
          >
            {title}
          </h3>

          <div className="flex items-center gap-3 mt-1">
            {startsAt && (
              <span className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>
                {formatReplayDate(startsAt)}
              </span>
            )}
            {durationSeconds && (
              <span className="text-xs" style={{ color: "var(--color-muted-foreground)" }}>
                {formatDuration(durationSeconds)}
              </span>
            )}
          </div>
        </div>
      </div>

      {description && (
        <p className="text-xs leading-relaxed" style={{ color: "var(--color-muted-foreground)" }}>
          {description}
        </p>
      )}

      {/* Watch link — only if video exists */}
      {hasVideo && (
        <div className="pt-1">
          {vimeoVideoId && (
            <a
              href={`https://vimeo.com/${vimeoVideoId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium transition-colors hover:opacity-80"
              style={{ color: "var(--color-primary)" }}
            >
              Watch replay →
            </a>
          )}
          {!vimeoVideoId && youtubeVideoId && (
            <a
              href={`https://youtube.com/watch?v=${youtubeVideoId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium transition-colors hover:opacity-80"
              style={{ color: "var(--color-primary)" }}
            >
              Watch replay →
            </a>
          )}
        </div>
      )}
    </div>
  );
}
