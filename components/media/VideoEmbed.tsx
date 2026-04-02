"use client";

import { useEffect, useRef, useState } from "react";
import Player from "@vimeo/player";
import { useMemberAudio } from "@/components/member/audio/MemberAudioProvider";

/**
 * components/media/VideoEmbed.tsx
 *
 * Bidirectional "latest wins" audio/video coordination:
 *   - Video starts  → pause the member audio player
 *   - Audio starts  → pause this Vimeo player (via the videoPauserRef registry)
 *
 * This works across ALL routes (today, library, archive) since VideoEmbed is
 * the single embed component and MemberAudioProvider wraps the entire shell.
 *
 * UX pattern: poster + play button → click → real iframe loads (avoids SDK
 * init cost on page load, saves ~300ms on slow connections).
 *
 * Intentionally unstyled for dimensions — caller controls sizing.
 * Default aspect ratio: 16/9.
 */

interface VideoEmbedProps {
  vimeoId?: string | null;
  youtubeId?: string | null;
  title: string;
  dark?: boolean;
}

export function VideoEmbed({ vimeoId, youtubeId, title, dark = false }: VideoEmbedProps) {
  const [expanded, setExpanded] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<Player | null>(null);
  const { pause, registerVideoPauser, unregisterVideoPauser } = useMemberAudio();

  const isVimeo = !!vimeoId;

  useEffect(() => {
    if (!expanded || !isVimeo || !iframeRef.current) return;

    let player: Player | null = null;

    // Small delay so the iframe src has initialised before the SDK attaches.
    const timeout = setTimeout(() => {
      if (!iframeRef.current) return;

      player = new Player(iframeRef.current);
      playerRef.current = player;

      // ── Direction 1: Video plays → pause audio ──────────────────────────
      player.on("play", () => {
        pause(); // pause the member audio player
      });

      // ── Direction 2: Audio plays → pause this video ──────────────────────
      // Register a pauser so MemberAudioProvider can call it when audio starts.
      registerVideoPauser(() => {
        player?.pause().catch(() => {
          // Ignore errors (e.g. player not yet ready or already paused)
        });
      });
    }, 300);

    return () => {
      clearTimeout(timeout);
      unregisterVideoPauser(); // deregister before destroying
      player?.destroy().catch(() => {});
      playerRef.current = null;
    };
  }, [expanded, isVimeo, pause, registerVideoPauser, unregisterVideoPauser]);

  // When the user collapses the video (e.g. navigates away and component
  // unmounts), also deregister so we don't hold a stale reference.
  useEffect(() => {
    return () => {
      unregisterVideoPauser();
    };
  }, [unregisterVideoPauser]);

  if (!vimeoId && !youtubeId) return null;

  const thumbnailUrl = !isVimeo
    ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`
    : null;

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
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="group absolute inset-0 w-full h-full flex flex-col items-center justify-center focus:outline-none"
          aria-label={`Play: ${title} on ${providerLabel}`}
        >
          {thumbnailUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbnailUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover opacity-55 group-hover:opacity-70 transition-opacity duration-200"
            />
          )}

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

          <div aria-hidden="true" className="absolute inset-0 bg-black/30" />

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
