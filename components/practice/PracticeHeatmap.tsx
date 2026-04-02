/**
 * components/practice/PracticeHeatmap.tsx
 *
 * 3-state heatmap for the /practice page:
 *   - "none"     → Gray: no listening activity on this date
 *   - "on_time"  → Full Teal: listened to that day's audio ON that specific day (streak-building)
 *   - "catch_up" → Light Teal: listened to a past audio on this date (caught up later)
 *
 * "on_time" builds the streak counter.
 * "catch_up" shows engagement but does not increment the streak.
 */

type HeatmapState = "none" | "on_time" | "catch_up";

interface PracticeHeatmapProps {
  values: Array<{ date: string; state: HeatmapState }>;
}

const STATE_STYLES: Record<HeatmapState, { background: string; opacity: number }> = {
  none: {
    background: "color-mix(in srgb, var(--color-muted) 85%, white)",
    opacity: 0.95,
  },
  on_time: {
    background: "var(--color-accent)",
    opacity: 1,
  },
  catch_up: {
    background: "color-mix(in srgb, var(--color-accent) 35%, var(--color-muted))",
    opacity: 1,
  },
};

export function PracticeHeatmap({ values }: PracticeHeatmapProps) {
  return (
    <div>
      <div className="grid grid-cols-10 gap-2 sm:grid-cols-14">
        {values.map((cell) => {
          const style = STATE_STYLES[cell.state];
          return (
            <div
              key={cell.date}
              className="aspect-square rounded-[4px]"
              style={{
                background: style.background,
                opacity: style.opacity,
              }}
              title={cell.state === "none"
                ? cell.date
                : cell.state === "on_time"
                  ? `${cell.date} — Practiced on time ✓`
                  : `${cell.date} — Caught up later`}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <span
            className="inline-block h-2.5 w-2.5 rounded-[3px]"
            style={{ background: STATE_STYLES.none.background }}
          />
          No practice
        </span>
        <span className="inline-flex items-center gap-2">
          <span
            className="inline-block h-2.5 w-2.5 rounded-[3px]"
            style={{ background: STATE_STYLES.on_time.background }}
          />
          Practiced on time
        </span>
        <span className="inline-flex items-center gap-2">
          <span
            className="inline-block h-2.5 w-2.5 rounded-[3px]"
            style={{ background: STATE_STYLES.catch_up.background }}
          />
          Caught up later
        </span>
      </div>
    </div>
  );
}
