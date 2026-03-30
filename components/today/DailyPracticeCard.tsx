/**
 * components/today/DailyPracticeCard.tsx
 * The primary card on the Today page — "Today's Practice".
 * Visually prominent. Placeholder until real audio query is wired.
 */
export function DailyPracticeCard() {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

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

        <h2 className="font-heading font-bold text-2xl leading-heading tracking-[-0.03em] mb-2">
          Morning Grounding
        </h2>
        <p className="text-white/70 text-sm leading-body mb-6">
          A short audio practice to start your day with calm and clarity.
        </p>

        {/* Placeholder audio player */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            aria-label="Play today's practice"
            className="w-12 h-12 rounded-pill bg-primary flex items-center justify-center hover:bg-primary-hover transition-colors shadow-focus"
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
          <span className="text-xs text-white/50 tabular-nums">0:00</span>
        </div>
      </div>
    </article>
  );
}
