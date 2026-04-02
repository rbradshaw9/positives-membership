"use client";

import { useEffect, useId, useRef, useState } from "react";
import MuxPlayer from "@mux/mux-player-react";
import type MuxPlayerElement from "@mux/mux-player";
import Player from "@vimeo/player";
import { useMemberAudio } from "@/components/member/audio/MemberAudioProvider";
import {
  recordVideoProgress,
  getVideoResumePosition,
} from "@/app/(member)/today/video-actions";

/**
 * components/media/VideoEmbed.tsx
 *
 * Renders video from Mux (preferred), Vimeo, or YouTube with:
 *
 * ── Audio/video coordination ("one thing playing at a time") ──────────────
 *   Uses MemberAudioProvider's multi-video registry (Map<id, pauseFn>).
 *   When any video plays  → pause audio + pause all OTHER videos.
 *   When audio plays      → all registered video pausers are called.
 *
 * ── Mux Data analytics ────────────────────────────────────────────────────
 *   metadata.viewer_user_id, video_id, video_title sent to Mux Data.
 *
 * ── View tracking + resume position ──────────────────────────────────────
 *   Fetches resume_at_seconds on mount (from video_views table).
 *   Saves watch progress at 25/50/75/95% milestones and on pause.
 *   Mux player uses startTime prop; Vimeo uses setCurrentTime() after ready.
 *
 * ── Resume overlay ───────────────────────────────────────────────────────
 *   When there's a saved position > 10 seconds, shows a "Resume / Start
 *   Over" overlay on the Mux player before playback begins.
 *
 * ── Brand theming ────────────────────────────────────────────────────────
 *   Mux player styled with Positives brand tokens via CSS custom properties.
 */

/** Milestone thresholds (%) at which we write a progress record. */
const MILESTONES = [25, 50, 75, 95];
/** Minimum saved position (seconds) before showing the resume overlay. */
const RESUME_THRESHOLD = 10;

interface VideoEmbedProps {
  vimeoId?: string | null;
  youtubeId?: string | null;
  muxPlaybackId?: string | null;
  /** Used for Mux Data analytics + view-tracking upsert key. */
  muxAssetId?: string | null;
  /** Content row ID — primary upsert key for video_views. */
  contentId?: string | null;
  /** Pass from server component for Mux Data viewer tracking. */
  viewerUserId?: string | null;
  title: string;
  dark?: boolean;
}

function formatResumeTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function VideoEmbed({
  vimeoId,
  youtubeId,
  muxPlaybackId,
  muxAssetId,
  contentId,
  viewerUserId,
  title,
  dark = false,
}: VideoEmbedProps) {
  const registryId = useId(); // stable key for the video pauser registry
  const [expanded, setExpanded] = useState(false);

  // Resume position state — null means "still loading"
  const [resumeAt, setResumeAt] = useState<number | null>(null);
  // Whether the user has dismissed the resume overlay and chosen a start point
  const [chosenStart, setChosenStart] = useState<number | undefined>(undefined);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const muxRef = useRef<MuxPlayerElement>(null);
  const reportedMilestonesRef = useRef<Set<number>>(new Set());

  const { pause, registerVideoPauser, unregisterVideoPauser, pauseAllVideos } =
    useMemberAudio();

  const isVimeo = !!vimeoId;
  const isMux = !!muxPlaybackId;

  // ── Fetch resume position on mount ───────────────────────────────────────
  useEffect(() => {
    if (!contentId && !muxAssetId) {
      setResumeAt(0);
      return;
    }
    getVideoResumePosition({ contentId, muxAssetId }).then((seconds) => {
      setResumeAt(seconds);
    });
  }, [contentId, muxAssetId]);

  // ── Mux: register pauser in the global registry ──────────────────────────
  useEffect(() => {
    if (!isMux) return;
    registerVideoPauser(registryId, () => {
      muxRef.current?.pause();
    });
    return () => {
      unregisterVideoPauser(registryId);
    };
  }, [isMux, registryId, registerVideoPauser, unregisterVideoPauser]);

  // Cleanup registry on unmount
  useEffect(() => {
    return () => { unregisterVideoPauser(registryId); };
  }, [registryId, unregisterVideoPauser]);

  // ── Vimeo: SDK-based coordination + resume after player is ready ─────────
  useEffect(() => {
    if (!expanded || !isVimeo || !iframeRef.current) return;
    const resolvedResume = resumeAt ?? 0;

    let player: Player | null = null;
    let cancelled = false;

    const tryInit = (attempts = 0) => {
      if (cancelled || !iframeRef.current) return;
      player = new Player(iframeRef.current);

      player.ready().then(async () => {
        if (cancelled) { player?.destroy(); return; }

        // Seek to resume position
        if (resolvedResume > 0) {
          player!.setCurrentTime(resolvedResume).catch(() => {});
        }

        // Register pauser
        registerVideoPauser(registryId, () => {
          player?.pause().catch(() => {});
        });

        // Direction 1 fallback: user hits play inside native Vimeo UI
        player!.on("play", () => {
          pauseAllVideos(registryId);
          pause();
        });

        // Save progress on pause/end
        player!.on("pause", async () => {
          const [currentTime, duration] = await Promise.all([
            player!.getCurrentTime(),
            player!.getDuration(),
          ]);
          const pct = duration > 0 ? (currentTime / duration) * 100 : 0;
          void recordVideoProgress({
            contentId,
            muxAssetId,
            muxPlaybackId,
            watchPercent: pct,
            resumeAtSeconds: currentTime,
          });
        });

        // Track milestones
        player!.on("timeupdate", async ({ seconds, duration }) => {
          if (!duration) return;
          const pct = (seconds / duration) * 100;
          for (const milestone of MILESTONES) {
            if (
              pct >= milestone &&
              !reportedMilestonesRef.current.has(milestone)
            ) {
              reportedMilestonesRef.current.add(milestone);
              void recordVideoProgress({
                contentId,
                muxAssetId,
                muxPlaybackId,
                watchPercent: milestone,
                resumeAtSeconds: seconds,
              });
            }
          }
        });
      }).catch(() => {
        if (attempts < 5 && !cancelled) {
          setTimeout(() => tryInit(attempts + 1), 400);
        }
      });
    };

    const timeout = setTimeout(() => tryInit(), 200);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      unregisterVideoPauser(registryId);
      player?.destroy().catch(() => {});
    };
  }, [
    expanded,
    isVimeo,
    resumeAt,
    registryId,
    pause,
    pauseAllVideos,
    registerVideoPauser,
    unregisterVideoPauser,
    contentId,
    muxAssetId,
    muxPlaybackId,
  ]);

  if (!vimeoId && !youtubeId && !muxPlaybackId) return null;

  // ── Mux ──────────────────────────────────────────────────────────────────
  if (isMux) {
    // Wait for resume position to load before rendering the player
    const isLoading = resumeAt === null;
    const showResumeOverlay =
      !isLoading &&
      resumeAt > RESUME_THRESHOLD &&
      chosenStart === undefined;

    // Initial start time — only applied on first render (before user interacts)
    const initialStartTime =
      resumeAt && resumeAt > RESUME_THRESHOLD ? resumeAt : undefined;

    return (
      <div
        className="relative w-full overflow-hidden rounded-lg"
        style={{
          aspectRatio: "16/9",
          background: "var(--color-surface-dark, #1a1a1a)",
        }}
      >
        {/* Loading skeleton — waiting for resume position */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div
              className="w-10 h-10 rounded-full border-2 border-transparent animate-spin"
              style={{
                borderTopColor: "var(--color-accent)",
                borderRightColor: "color-mix(in srgb, var(--color-accent) 30%, transparent)",
              }}
              aria-label="Loading video"
            />
          </div>
        )}

        {/* Mux player — only rendered once resume position is known */}
        {!isLoading && (
          <MuxPlayer
            ref={muxRef}
            playbackId={muxPlaybackId}
            streamType="on-demand"
            startTime={initialStartTime}
            className="absolute inset-0 w-full h-full"
            style={{ borderRadius: "0.5rem" }}
            // Mux Data — per-viewer analytics in the Mux dashboard
            metadata={{
              video_id: muxAssetId ?? muxPlaybackId,
              video_title: title,
              viewer_user_id: viewerUserId ?? undefined,
            }}
            onPlay={() => {
              // Pause audio + pause all other video players
              pauseAllVideos(registryId);
              pause();
              // Record session start
              void recordVideoProgress({
                contentId,
                muxAssetId,
                muxPlaybackId,
                watchPercent: 0,
                resumeAtSeconds: muxRef.current?.currentTime ?? 0,
              });
            }}
            onTimeUpdate={() => {
              const el = muxRef.current;
              if (!el || !el.duration) return;
              const pct = (el.currentTime / el.duration) * 100;
              for (const milestone of MILESTONES) {
                if (
                  pct >= milestone &&
                  !reportedMilestonesRef.current.has(milestone)
                ) {
                  reportedMilestonesRef.current.add(milestone);
                  void recordVideoProgress({
                    contentId,
                    muxAssetId,
                    muxPlaybackId,
                    watchPercent: milestone,
                    resumeAtSeconds: el.currentTime,
                  });
                }
              }
            }}
            onPause={() => {
              const el = muxRef.current;
              if (!el) return;
              const pct = el.duration
                ? (el.currentTime / el.duration) * 100
                : 0;
              void recordVideoProgress({
                contentId,
                muxAssetId,
                muxPlaybackId,
                watchPercent: pct,
                resumeAtSeconds: el.currentTime,
              });
            }}
          />
        )}

        {/* ── Resume / Start Over overlay ────────────────────────────── */}
        {showResumeOverlay && (
          <div
            className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4"
            style={{
              background: "linear-gradient(180deg, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.85) 100%)",
              backdropFilter: "blur(4px)",
            }}
          >
            <p className="text-white/60 text-xs font-medium uppercase tracking-wider">
              You left off at {formatResumeTime(resumeAt)}
            </p>

            <div className="flex items-center gap-3">
              {/* Resume button — primary */}
              <button
                type="button"
                onClick={() => {
                  setChosenStart(resumeAt);
                  const el = muxRef.current;
                  if (el) {
                    el.currentTime = resumeAt;
                    el.play().catch(() => {});
                  }
                }}
                className="group flex items-center gap-2.5 rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-200 hover:scale-[1.03] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                style={{
                  background: "var(--color-accent, #F59E0B)",
                  color: "#1a1a1a",
                }}
              >
                <svg
                  width="14" height="14" viewBox="0 0 24 24"
                  fill="currentColor" stroke="none" aria-hidden="true"
                >
                  <polygon points="5,3 19,12 5,21" />
                </svg>
                Resume at {formatResumeTime(resumeAt)}
              </button>

              {/* Start Over — secondary */}
              <button
                type="button"
                onClick={() => {
                  setChosenStart(0);
                  const el = muxRef.current;
                  if (el) {
                    el.currentTime = 0;
                    el.play().catch(() => {});
                  }
                }}
                className="rounded-full px-4 py-2.5 text-sm font-medium text-white/70 transition-all duration-200 hover:text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                style={{
                  border: "1px solid rgba(255,255,255,0.2)",
                }}
              >
                Start over
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Vimeo / YouTube ───────────────────────────────────────────────────────
  const thumbnailUrl = !isVimeo
    ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`
    : null;

  const iframeSrc = isVimeo
    ? `https://player.vimeo.com/video/${vimeoId}?autoplay=1&title=0&byline=0&portrait=0&dnt=1`
    : `https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1`;

  const providerLabel = isVimeo ? "Vimeo" : "YouTube";

  function handlePlayClick() {
    pauseAllVideos(registryId);
    pause(); // pause audio synchronously on user gesture
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
            <span
              className={`text-xs font-medium ${
                dark ? "text-white/60" : "text-white/70"
              }`}
            >
              {providerLabel}
            </span>
          </div>
        </button>
      )}
    </div>
  );
}
