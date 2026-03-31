import type { TodayContent } from "@/lib/queries/get-today-content";
import { AudioPlayer } from "@/components/today/AudioPlayer";

/**
 * components/today/DailyPracticeCard.tsx
 * The primary card on the Today page — always visually dominant.
 *
 * Three states:
 * 1. content === null          → no content yet ("Coming soon")
 * 2. content exists, no audio  → title + description shown, "Audio not yet available"
 * 3. content exists, has audio → title + description + real AudioPlayer
 *
 * Audio source priority:
 * - castos_episode_url  (preferred — direct Castos MP3)
 * - s3_audio_key        (future — S3 signed URL generation is Milestone 05+)
 *
 * AudioPlayer is a client component. This card is a server component wrapper
 * that resolves the audio URL before rendering.
 */

interface DailyPracticeCardProps {
  content: TodayContent | null;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Resolve the best available audio URL from the content row.
 * S3 key handling is a stub — signed URL generation comes in Milestone 05.
 */
function resolveAudioUrl(content: TodayContent): string | null {
  if (content.castos_episode_url) {
    return content.castos_episode_url;
  }
  // S3 signed URL generation goes here in Milestone 05.
  // For now, s3_audio_key alone is not a playable URL.
  return null;
}

export function DailyPracticeCard({ content }: DailyPracticeCardProps) {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const hasContent = content !== null;
  const audioUrl = hasContent ? resolveAudioUrl(content) : null;
  const duration = hasContent ? formatDuration(content.duration_seconds) : "—";

  return (
    <article className="bg-surface-dark rounded-xl p-6 shadow-large text-white relative overflow-hidden">
      {/* Subtle background glow */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-20"
        style={{
          background:
            "radial-gradient(ellipse at 30% 60%, #2F6FED 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-5">
          <span className="text-xs font-medium uppercase tracking-widest text-white/60">
            Today&apos;s Practice
          </span>
          <span className="text-xs text-white/50">{today}</span>
        </div>

        {!hasContent ? (
          /* ── State 1: No content at all ── */
          <>
            <h2 className="font-heading font-bold text-2xl leading-heading tracking-[-0.03em] mb-2 text-white/60">
              Coming soon
            </h2>
            <p className="text-white/50 text-sm leading-body">
              Today&apos;s practice is being prepared. Check back shortly.
            </p>
          </>
        ) : (
          /* ── States 2 & 3: Content exists ── */
          <>
            <h2 className="font-heading font-bold text-2xl leading-heading tracking-[-0.03em] mb-2">
              {content.title}
            </h2>
            {content.description && (
              <p className="text-white/70 text-sm leading-body mb-6">
                {content.description}
              </p>
            )}

            {audioUrl ? (
              /* ── State 3: Content + playable audio source ── */
              <AudioPlayer
                src={audioUrl}
                title={content.title}
                duration={duration}
              />
            ) : (
              /* ── State 2: Content but no playable audio yet ── */
              <div className="flex items-center gap-3 mt-2">
                <div className="w-12 h-12 rounded-pill bg-white/10 flex items-center justify-center flex-shrink-0">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    aria-hidden="true"
                    className="text-white/40"
                  >
                    <path d="M9 18V5l12-2v13" />
                    <circle cx="6" cy="18" r="3" />
                    <circle cx="18" cy="16" r="3" />
                  </svg>
                </div>
                <div>
                  <p className="text-white/50 text-sm">Audio not yet available</p>
                  {content.duration_seconds && (
                    <p className="text-white/30 text-xs mt-0.5">
                      {duration} · Coming soon
                    </p>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </article>
  );
}
