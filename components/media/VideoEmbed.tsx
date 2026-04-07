"use client";

import { useEffect, useId, useRef, useState } from "react";
import Player from "@vimeo/player";
import { useMemberAudio } from "@/components/member/audio/MemberAudioProvider";
import {
  recordVideoProgress,
  getVideoResumePosition,
} from "@/app/(member)/today/video-actions";

/**
 * components/media/VideoEmbed.tsx
 *
 * Renders video from Vimeo or YouTube with:
 *
 * ── Audio/video coordination ("one thing playing at a time") ──────────────
 *   Uses MemberAudioProvider's multi-video registry (Map<id, pauseFn>).
 *   When any video plays  → pause audio + pause all OTHER videos.
 *   When audio plays      → all registered video pausers are called.
 *
 * ── View tracking + resume position ──────────────────────────────────────
 *   Fetches resume_at_seconds on mount (from video_views table).
 *   Saves watch progress at 25/50/75/95% milestones and on pause.
 *   Vimeo uses setCurrentTime() after player is ready.
 *
 * ── Resume overlay ───────────────────────────────────────────────────────
 *   When there's a saved position > 10 seconds, shows a "Resume / Start
 *   Over" overlay before playback begins.
 *
 * ── Brand theming ────────────────────────────────────────────────────────
 *   Vimeo player uses color param matching Positives accent (#2EC4B6).
 *   No title, byline, or portrait overlays. Clean minimal player.
 */

/** Milestone thresholds (%) at which we write a progress record. */
const MILESTONES = [25, 50, 75, 95];
/** Minimum saved position (seconds) before showing the resume overlay. */
const RESUME_THRESHOLD = 10;

/** Extract a numeric Vimeo ID from a full URL or bare ID string. */
function extractVimeoId(value: string): string {
  // Already a numeric ID
  if (/^\d+$/.test(value)) return value;
  // URL like https://vimeo.com/123456789 or https://vimeo.com/123456789/hash
  const match = value.match(/vimeo\.com\/(\d+)/);
  return match ? match[1] : value;
}

function formatResumeTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

interface VideoEmbedProps {
  /** Vimeo video ID or full Vimeo URL (https://vimeo.com/123456789) */
  vimeoId?: string | null;
  youtubeId?: string | null;
  /** Content row ID — primary upsert key for video_views (daily/weekly/monthly). */
  contentId?: string | null;
  /** Course lesson ID — alternative key for video_views (course videos). */
  courseLessonId?: string | null;
  /** Pass from server component for analytics. */
  viewerUserId?: string | null;
  title: string;
  dark?: boolean;
}

export function VideoEmbed({
  vimeoId,
  youtubeId,
  contentId,
  courseLessonId,
  title,
  dark = false,
}: VideoEmbedProps) {
  const registryId = useId();
  const [expanded, setExpanded] = useState(false);

  // Resume position — null = still loading from DB
  const [resumeAt, setResumeAt] = useState<number | null>(() => {
    return contentId || courseLessonId ? null : 0;
  });
  // Chosen start: undefined = haven't chosen yet (overlay showing)
  const [chosenStart, setChosenStart] = useState<number | undefined>(undefined);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const vimeoPlayerRef = useRef<Player | null>(null);
  const reportedMilestonesRef = useRef<Set<number>>(new Set());

  const audioCtx = useMemberAudio();

  // ── Stable refs for context functions ──────────────────────────────────
  // The audio context re-renders on every timeupdate. Store functions in
  // refs so the Vimeo player effect doesn't re-run and destroy the player.
  const pauseRef = useRef(audioCtx.pause);
  const pauseAllVideosRef = useRef(audioCtx.pauseAllVideos);
  const registerVideoPauserRef = useRef(audioCtx.registerVideoPauser);
  const unregisterVideoPauserRef = useRef(audioCtx.unregisterVideoPauser);
  useEffect(() => {
    pauseRef.current = audioCtx.pause;
    pauseAllVideosRef.current = audioCtx.pauseAllVideos;
    registerVideoPauserRef.current = audioCtx.registerVideoPauser;
    unregisterVideoPauserRef.current = audioCtx.unregisterVideoPauser;
  });

  const resolvedVimeoId = vimeoId ? extractVimeoId(vimeoId) : null;
  const isVimeo = !!resolvedVimeoId;
  // Tracking key: need at least one of contentId or courseLessonId
  const hasTracking = !!contentId || !!courseLessonId;

  // ── Fetch resume position on mount ─────────────────────────────────────
  useEffect(() => {
    if (!hasTracking) return;
    getVideoResumePosition({ contentId, courseLessonId }).then((seconds) => {
      setResumeAt(seconds);
    });
  }, [hasTracking, contentId, courseLessonId]);

  // ── Cleanup registry on unmount ────────────────────────────────────────
  useEffect(() => {
    return () => {
      unregisterVideoPauserRef.current(registryId);
    };
  }, [registryId]);

  // ── Vimeo: SDK-based coordination, resume, milestone tracking ──────────
  useEffect(() => {
    if (!expanded || !isVimeo || !iframeRef.current) return;
    // chosenStart is the user's explicit choice: resume position or 0 (start over)
    const seekTo = chosenStart ?? resumeAt ?? 0;

    let cancelled = false;
    let player: Player | null = null;

    // Throttle: save position to DB at most once per 10s
    let lastSaveTime = 0;
    let latestSeconds = 0;
    let latestDuration = 0;

    const savePosition = (force = false) => {
      const now = Date.now();
      if (!force && now - lastSaveTime < 10_000) return;
      if (!latestDuration) return;
      lastSaveTime = now;
      const pct = (latestSeconds / latestDuration) * 100;
      void recordVideoProgress({
        contentId,
        courseLessonId,
        watchPercent: pct,
        resumeAtSeconds: latestSeconds,
      });
    };

    // Save on tab close / navigate away
    const handleBeforeUnload = () => savePosition(true);
    const handleVisChange = () => {
      if (document.visibilityState === "hidden") savePosition(true);
    };

    const tryInit = (attempts = 0) => {
      if (cancelled || !iframeRef.current) return;
      player = new Player(iframeRef.current);
      vimeoPlayerRef.current = player;

      player.ready().then(async () => {
        if (cancelled) { player?.destroy(); return; }

        // Seek to resume position
        if (seekTo > 0) {
          player!.setCurrentTime(seekTo).catch(() => {});
        }

        // Register pauser in the global registry
        registerVideoPauserRef.current(registryId, () => {
          player?.pause().catch(() => {});
        });

        // On play: pause audio + all other videos
        player!.on("play", () => {
          pauseAllVideosRef.current(registryId);
          pauseRef.current();
        });

        // On seeked: save position immediately when user scrubs/skips
        player!.on("seeked", async () => {
          try {
            const [currentTime, duration] = await Promise.all([
              player!.getCurrentTime(),
              player!.getDuration(),
            ]);
            latestSeconds = currentTime;
            latestDuration = duration;
            savePosition(true);
          } catch { /* player may be destroyed */ }
        });

        // On pause: save position immediately
        player!.on("pause", async () => {
          try {
            const [currentTime, duration] = await Promise.all([
              player!.getCurrentTime(),
              player!.getDuration(),
            ]);
            latestSeconds = currentTime;
            latestDuration = duration;
            savePosition(true);
          } catch { /* player may be destroyed */ }
        });

        // On ended: save 100%
        player!.on("ended", () => {
          void recordVideoProgress({
            contentId,
            courseLessonId,
            watchPercent: 100,
            resumeAtSeconds: 0,
          });
        });

        // Continuous tracking: save position + milestone flags
        player!.on("timeupdate", ({ seconds, duration }: { seconds: number; duration: number }) => {
          if (!duration) return;
          latestSeconds = seconds;
          latestDuration = duration;

          // Throttled save (every ~10s)
          savePosition(false);

          // Milestone tracking (25, 50, 75, 95)
          const pct = (seconds / duration) * 100;
          for (const milestone of MILESTONES) {
            if (pct >= milestone && !reportedMilestonesRef.current.has(milestone)) {
              reportedMilestonesRef.current.add(milestone);
              savePosition(true);
            }
          }
        });

        // Register global save handlers
        window.addEventListener("beforeunload", handleBeforeUnload);
        document.addEventListener("visibilitychange", handleVisChange);

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
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisChange);
      // Save final position on cleanup
      savePosition(true);
      unregisterVideoPauserRef.current(registryId);
      vimeoPlayerRef.current?.destroy().catch(() => {});
      vimeoPlayerRef.current = null;
    };
  }, [
    expanded,
    isVimeo,
    resumeAt,
    chosenStart,
    registryId,
    contentId,
    courseLessonId,
  ]);

  if (!resolvedVimeoId && !youtubeId) return null;

  // ── Vimeo ────────────────────────────────────────────────────────────────
  if (isVimeo) {
    const isLoading = resumeAt === null;
    const showResumeOverlay =
      !isLoading &&
      resumeAt > RESUME_THRESHOLD &&
      chosenStart === undefined;

    // Branded Vimeo embed URL:
    // color=2EC4B6 → accent color, title/byline/portrait=0 → clean UI, dnt=1 → no tracking
    const vimeoSrc = `https://player.vimeo.com/video/${resolvedVimeoId}?autoplay=1&title=0&byline=0&portrait=0&dnt=1&color=2EC4B6&controls=1&pip=1&transparent=0`;

    return (
      <div
        className="relative w-full overflow-hidden rounded-lg"
        style={{
          aspectRatio: "16/9",
          background: "var(--color-surface-dark, #111118)",
        }}
      >
        {/* Loading skeleton while fetching resume position */}
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

        {/* Thumbnail / play button — shown before user clicks play */}
        {!isLoading && !expanded && (
          <button
            type="button"
            onClick={() => {
              pauseAllVideosRef.current(registryId);
              pauseRef.current();
              setExpanded(true);
            }}
            className="group absolute inset-0 w-full h-full flex flex-col items-center justify-center focus:outline-none"
            aria-label={`Play: ${title}`}
          >
            {/* Vimeo blue glow */}
            <div
              aria-hidden="true"
              className="absolute inset-0 opacity-20"
              style={{
                background: "radial-gradient(ellipse at 40% 50%, #1AB7EA 0%, transparent 65%)",
              }}
            />
            <div aria-hidden="true" className="absolute inset-0 bg-black/40" />

            <div className="relative z-10 flex flex-col items-center gap-2.5">
              {/* Play button */}
              <div className="w-16 h-16 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center group-hover:bg-white/25 group-hover:scale-105 transition-all duration-200">
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
              <span className={`text-xs font-medium ${dark ? "text-white/60" : "text-white/70"}`}>
                {title}
              </span>
            </div>
          </button>
        )}

        {/* Vimeo iframe — only rendered once resume position is known + user clicked play */}
        {!isLoading && expanded && (
          <iframe
            ref={iframeRef}
            src={vimeoSrc}
            title={title}
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full border-0"
          />
        )}

        {/* ── Resume / Start Over overlay ─────────────────────────────────── */}
        {!isLoading && !expanded && showResumeOverlay && (
          <div
            className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4"
            style={{
              background: "linear-gradient(180deg, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.88) 100%)",
              backdropFilter: "blur(4px)",
            }}
          >
            <p className="text-white/60 text-xs font-medium uppercase tracking-wider">
              You left off at {formatResumeTime(resumeAt)}
            </p>

            <div className="flex items-center gap-3">
              {/* Resume */}
              <button
                type="button"
                onClick={() => {
                  setChosenStart(resumeAt);
                  pauseAllVideosRef.current(registryId);
                  pauseRef.current();
                  setExpanded(true);
                }}
                className="group flex items-center gap-2.5 rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-200 hover:scale-[1.03] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                style={{
                  background: "var(--color-primary, #2EC4B6)",
                  color: "#ffffff",
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

              {/* Start Over */}
              <button
                type="button"
                onClick={() => {
                  setChosenStart(0);
                  pauseAllVideosRef.current(registryId);
                  pauseRef.current();
                  setExpanded(true);
                }}
                className="rounded-full px-4 py-2.5 text-sm font-medium text-white/70 transition-all duration-200 hover:text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                style={{ border: "1px solid rgba(255,255,255,0.2)" }}
              >
                Start over
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── YouTube ───────────────────────────────────────────────────────────────
  const youtubeSrc = `https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1`;
  const youtubeThumbnail = `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;

  function handleYouTubePlay() {
    pauseAllVideosRef.current(registryId);
    pauseRef.current();
    setExpanded(true);
  }

  return (
    <div
      className="relative w-full overflow-hidden rounded-lg bg-surface-dark"
      style={{ aspectRatio: "16/9" }}
    >
      {expanded ? (
        <iframe
          src={youtubeSrc}
          title={title}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full border-0"
          loading="lazy"
        />
      ) : (
        <button
          type="button"
          onClick={handleYouTubePlay}
          className="group absolute inset-0 w-full h-full flex flex-col items-center justify-center focus:outline-none"
          aria-label={`Play: ${title} on YouTube`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={youtubeThumbnail}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-55 group-hover:opacity-70 transition-opacity duration-200"
          />
          <div aria-hidden="true" className="absolute inset-0 bg-black/30" />

          <div className="relative z-10 flex flex-col items-center gap-2.5">
            <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm border border-white/20 flex items-center justify-center group-hover:bg-white/30 group-hover:scale-105 transition-all duration-200">
              <svg
                width="20" height="20" viewBox="0 0 24 24"
                fill="currentColor" className="text-white ml-1" aria-hidden="true"
              >
                <polygon points="5,3 19,12 5,21" />
              </svg>
            </div>
            <span className={`text-xs font-medium ${dark ? "text-white/60" : "text-white/70"}`}>
              YouTube
            </span>
          </div>
        </button>
      )}
    </div>
  );
}
