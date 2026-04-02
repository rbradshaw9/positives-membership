"use client";

import { useEffect, useRef, useState } from "react";
import Player from "@vimeo/player";
import { useMemberAudio } from "@/components/member/audio/MemberAudioProvider";

/**
 * components/media/VideoEmbed.tsx
 * Sprint 6: inline video embed for Vimeo and YouTube.
 *
 * Strategy:
 *   - Vimeo:   privacy-enhanced player.vimeo.com embed (no tracking)
 *   - YouTube: privacy-enhanced nocookie embed + lazy loading
 *
 * Audio coordination (Vimeo only):
 *   When the Vimeo video fires a "play" event, we pause the global audio player
 *   so both audio streams never play simultaneously. The audio does NOT auto-resume
 *   when the video pauses — the member can resume it manually from the persistent bar.
 *
 * UX pattern: shows a thumbnail/poster with a play button. On click, swaps
 * to the real <iframe>. This avoids loading the iframe SDK on page load
 * (saves ~300ms + respects slow connections) and keeps layout calm.
 *
 * Intentionally unstyled for dimensions — caller wraps with the right sizing.
 * Default aspect ratio 16/9.
 */

interface VideoEmbedProps {
  vimeoId?: string | null;
  youtubeId?: string | null;
  title: string;
  /** Set true if the video is in a dark surface context */
  dark?: boolean;
}

export function VideoEmbed({ vimeoId, youtubeId, title, dark = false }: VideoEmbedProps) {
  const [expanded, setExpanded] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { pause } = useMemberAudio();

  const isVimeo = !!vimeoId;

  // Attach Vimeo Player SDK once the iframe is in the DOM and coordinate with
  // the global audio context — video play → audio pauses.
  useEffect(() => {
    if (!expanded || !isVimeo || !iframeRef.current) return;

    let player: Player | null = null;

    // Small timeout to let the iframe fully initialise before handing it to the SDK
    const timeout = setTimeout(() => {
      if (!iframeRef.current) return;
      player = new Player(iframeRef.current);

      player.on("play", () => {
        // Pause the member audio player when the video starts
        pause();
      });
    }, 300);

    return () => {
      clearTimeout(timeout);
      player?.destroy().catch(() => {
        // Ignore destroy errors (e.g. iframe already unmounted)
      });
    };
  }, [expanded, isVimeo, pause]);

  if (!vimeoId && !youtubeId) return null;

  // YouTube thumbnail — hqdefault is free, no API key needed
  const thumbnailUrl = !isVimeo
    ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`
    : null;

  // iframe src — built only once the user clicks play
  const iframeSrc = isVimeo
    ? `https://player.vimeo.com/video/${vimeoId}?autoplay=1&title=0&byline=0&portrait=0&dnt=1`
    : `https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1`;

  const providerLabel = isVimeo ? "Vimeo" : "YouTube";

  return (
    <div
      className="relative w-full overflow-hidden rounded-lg bg-surface-dark"
      style={{ aspectRatio: "16/9" }}
    >
      {expanded ? (
        // Real embed — only loaded after user interaction
        <iframe
          ref={iframeRef}
          src={iframeSrc}
          title={title}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full border-0"
          loading="lazy"
        />
      ) : (
        // Poster + play button
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="group absolute inset-0 w-full h-full flex flex-col items-center justify-center focus:outline-none"
          aria-label={`Play: ${title} on ${providerLabel}`}
        >
          {/* Thumbnail */}
          {thumbnailUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbnailUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover opacity-55 group-hover:opacity-70 transition-opacity duration-200"
            />
          )}

          {/* Vimeo: gradient glow */}
          {isVimeo && (
            <div
              aria-hidden="true"
              className="absolute inset-0 opacity-25"
              style={{
                background:
                  "radial-gradient(ellipse at 40% 50%, #1AB7EA 0%, transparent 65%)",
              }}
            />
          )}

          {/* Dark scrim for legibility */}
          <div aria-hidden="true" className="absolute inset-0 bg-black/30" />

          {/* Play button */}
          <div className="relative z-10 flex flex-col items-center gap-2.5">
            <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm border border-white/20 flex items-center justify-center group-hover:bg-white/30 group-hover:scale-105 transition-all duration-200">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="text-white ml-1"
                aria-hidden="true"
              >
                <polygon points="5,3 19,12 5,21" />
              </svg>
            </div>
            <span className={`text-xs font-medium ${dark ? "text-white/60" : "text-white/70"}`}>
              {providerLabel}
            </span>
          </div>
        </button>
      )}
    </div>
  );
}
