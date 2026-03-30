import type { TodayContent } from "@/lib/queries/get-today-content";

/**
 * components/today/DailyPracticeCard.tsx
 * The primary card on the Today page — always visually dominant.
 *
 * Props:
 * - content: real content row from Supabase, or null
 *
 * Renders real data when available.
 * Renders a graceful no-content state inline when content is null.
 * Both states maintain the same dark card design so Today's Practice
 * remains visually primary regardless of content availability.
 */

interface DailyPracticeCardProps {
  content: TodayContent | null;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function DailyPracticeCard({ content }: DailyPracticeCardProps) {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const hasContent = content !== null;
  const duration = hasContent ? formatDuration(content.duration_seconds) : null;

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

        {hasContent ? (
          /* ── Real content state ── */
          <>
            <h2 className="font-heading font-bold text-2xl leading-heading tracking-[-0.03em] mb-2">
              {content.title}
            </h2>
            {content.description && (
              <p className="text-white/70 text-sm leading-body mb-6">
                {content.description}
              </p>
            )}

            {/* Audio player — placeholder controls; wired to URL in Milestone 03 */}
            <div className="flex items-center gap-4">
              <button
                type="button"
                aria-label={`Play ${content.title}`}
                className="w-12 h-12 rounded-pill bg-primary flex items-center justify-center hover:bg-primary-hover transition-colors shadow-focus flex-shrink-0"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <polygon points="5,3 19,12 5,21" />
                </svg>
              </button>
              <div className="flex-1">
                {/* Waveform placeholder */}
                <div className="flex items-center gap-0.5 h-8">
                  {Array.from({ length: 28 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-pill bg-white/20"
                      style={{
                        height: `${Math.max(20, Math.min(100, 40 + Math.sin(i * 0.8) * 30 + Math.cos(i * 1.3) * 20))}%`,
                      }}
                    />
                  ))}
                </div>
              </div>
              <span className="text-xs text-white/50 tabular-nums flex-shrink-0">
                {duration ?? "—"}
              </span>
            </div>
          </>
        ) : (
          /* ── No-content state — calm, not alarming ── */
          <>
            <h2 className="font-heading font-bold text-2xl leading-heading tracking-[-0.03em] mb-2 text-white/60">
              Coming soon
            </h2>
            <p className="text-white/50 text-sm leading-body">
              Today&apos;s practice is being prepared. Check back shortly.
            </p>
          </>
        )}
      </div>
    </article>
  );
}
