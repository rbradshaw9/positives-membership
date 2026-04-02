"use client";

import { useEffect, useRef, useState } from "react";
import Player from "@vimeo/player";
import { useMemberAudio } from "@/components/member/audio/MemberAudioProvider";

/**
 * components/media/VideoEmbed.tsx
 *
 * Bidirectional "latest wins" audio/video coordination:
 *
 * Direction 1 — Video → pause audio:
 *   Called synchronously on the play button click, BEFORE the iframe loads.
 *   This is 100% reliable because it's triggered by the user gesture, not
 *   an async SDK event that can race with autoplay.
 *   We also attach a Vimeo SDK listener as a fallback for when the user
 *   presses play *inside* the native Vimeo UI after pausing the video.
 *
 * Direction 2 — Audio → pause video:
 *   VideoEmbed registers its Vimeo player's pause() function with the audio
 *   context registry. When audio starts playing, MemberAudioProvider calls it.
 *
 * UX pattern: poster + play button → click → real iframe loads (defers SDK
 * cost until user interaction).
 */

interface VideoEmbedProps {
  vimeoId?: string | null;
  youtubeId?: string | null;
  muxPlaybackId?: string | null;
  title: string;
  dark?: boolean;
}

export function VideoEmbed({ vimeoId, youtubeId, muxPlaybackId, title, dark = false }: VideoEmbedProps) {
  const [expanded, setExpanded] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { pause, registerVideoPauser, unregisterVideoPauser } = useMemberAudio();

  const isVimeo = !!vimeoId;
  const isMux = !!muxPlaybackId;

  // Inject mux-player script once
  useEffect(() => {
    if (!isMux) return;
    if (document.querySelector('script[data-mux-player]')) return;
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@mux/mux-player';
    s.dataset.muxPlayer = '1';
    document.head.appendChild(s);
  }, [isMux]);

  // When the video is expanded, set up the Vimeo Player SDK for:
  //   (a) Fallback Direction 1: re-pause audio if user re-plays via native Vimeo UI
  //   (b) Direction 2: register our video pauser so audio can pause us
  useEffect(() => {
    if (!expanded || !isVimeo || !iframeRef.current) return;

    let player: Player | null = null;
    let cancelled = false;

    // Wait for the iframe to signal it's ready — poll for readyState rather than
    // using a fixed timeout, but cap at 3s to avoid hanging.
    const tryInit = (attempts = 0) => {
      if (cancelled) return;
      if (!iframeRef.current) return;

      player = new Player(iframeRef.current);

      player.ready().then(() => {
        if (cancelled) { player?.destroy(); return; }

        // (a) Fallback Direction 1: user hit play inside Vimeo's native UI
        player!.on("play", () => { pause(); });

        // (b) Direction 2: register our pauser so audio → pause video works
        registerVideoPauser(() => {
          player?.pause().catch(() => {});
        });
      }).catch(() => {
        // Ready handshake failed — retry up to 5×
        if (attempts < 5 && !cancelled) {
          setTimeout(() => tryInit(attempts + 1), 400);
        }
      });
    };

    // Small initial delay so the iframe src has been set before we attach
    const timeout = setTimeout(() => tryInit(), 200);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      unregisterVideoPauser();
      player?.destroy().catch(() => {});
    };
  }, [expanded, isVimeo, pause, registerVideoPauser, unregisterVideoPauser]);

  // Cleanup pauser when component unmounts entirely
  useEffect(() => {
    return () => { unregisterVideoPauser(); };
  }, [unregisterVideoPauser]);

  if (!vimeoId && !youtubeId && !muxPlaybackId) return null;

  // ── Mux player — rendered as web component, no poster/click needed ────────
  if (isMux) {
    return (
      <div
        className="relative w-full overflow-hidden rounded-lg bg-surface-dark"
        style={{ aspectRatio: "16/9" }}
      >
        {/* @ts-expect-error — mux-player is a custom element, not in JSX types */}
        <mux-player
          playback-id={muxPlaybackId}
          metadata-video-title={title}
          stream-type="on-demand"
          class="absolute inset-0 w-full h-full"
          style={{ '--controls': 'auto' } as React.CSSProperties}
        />
      </div>
    );
  }

  const thumbnailUrl = !isVimeo
    ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`
    : null;

  const iframeSrc = isVimeo
    ? `https://player.vimeo.com/video/${vimeoId}?autoplay=1&title=0&byline=0&portrait=0&dnt=1`
    : `https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1`;

  const providerLabel = isVimeo ? "Vimeo" : "YouTube";

  function handlePlayClick() {
    // Direction 1 (primary): pause audio synchronously before loading the iframe.
    // This is the reliable path — no SDK race condition, fires on user gesture.
    pause();
    setExpanded(true);
  }

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
          onClick={handlePlayClick}
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
              style={{ background: "radial-gradient(ellipse at 40% 50%, #1AB7EA 0%, transparent 65%)" }}
            />
          )}

          <div aria-hidden="true" className="absolute inset-0 bg-black/30" />

          <div className="relative z-10 flex flex-col items-center gap-2.5">
            <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm border border-white/20 flex items-center justify-center group-hover:bg-white/30 group-hover:scale-105 transition-all duration-200">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-white ml-1" aria-hidden="true">
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
