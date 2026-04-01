/**
 * components/today/MediaStub.tsx
 * Minimal video/media placeholder that links out to the full player.
 *
 * Sprint 5: stub-only approach — shows a dark poster with a play icon and
 * the provider name. Opens in a new tab. Full inline embed deferred to Sprint 6.
 *
 * Server component — no client state needed.
 */

interface MediaStubProps {
  vimeoId?: string | null;
  youtubeId?: string | null;
  title: string;
}

export function MediaStub({ vimeoId, youtubeId, title }: MediaStubProps) {
  if (!vimeoId && !youtubeId) return null;

  const isVimeo = !!vimeoId;
  const href = isVimeo
    ? `https://vimeo.com/${vimeoId}`
    : `https://www.youtube.com/watch?v=${youtubeId}`;
  const providerLabel = isVimeo ? "Vimeo" : "YouTube";

  // YouTube thumbnail (medium quality) — free, no API key required
  const thumbnailUrl = !isVimeo
    ? `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`
    : null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-lg overflow-hidden bg-surface-dark relative"
      style={{ aspectRatio: "16/9" }}
      aria-label={`Watch: ${title} on ${providerLabel}`}
    >
      {/* Thumbnail or dark background */}
      {thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbnailUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity"
        />
      ) : (
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background:
              "radial-gradient(ellipse at 40% 50%, #2F6FED 0%, transparent 70%)",
          }}
        />
      )}

      {/* Play button overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-10">
        <div className="w-14 h-14 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/25 transition-colors">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="text-white ml-1"
            aria-hidden="true"
          >
            <polygon points="5,3 19,12 5,21" />
          </svg>
        </div>
        <span className="text-xs text-white/60 font-medium">
          Watch on {providerLabel}
        </span>
      </div>
    </a>
  );
}
