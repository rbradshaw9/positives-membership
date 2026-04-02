"use client";

import { useState } from "react";

/**
 * components/practice/PracticeHeatmap.tsx
 *
 * 3-state heatmap for the /practice page:
 *   - "none"     → Gray: no listening activity on this date
 *   - "on_time"  → Full Teal: listened to that day's audio ON that specific day
 *   - "catch_up" → Light Teal: listened to a past audio on this date
 *
 * Hover tooltip: shows the formatted date + a plain-language label for the state.
 * Legend labels use explicit white/alpha so they're legible on both light and dark surfaces.
 */

type HeatmapState = "none" | "on_time" | "catch_up";

interface HeatmapCell {
  date: string;
  state: HeatmapState;
}

interface PracticeHeatmapProps {
  values: HeatmapCell[];
}

const STATE_CONFIG: Record<
  HeatmapState,
  { background: string; label: string; tooltipLabel: string }
> = {
  none: {
    background: "color-mix(in srgb, var(--color-muted, #2a2a2a) 85%, white)",
    label: "No practice",
    tooltipLabel: "No activity",
  },
  on_time: {
    background: "var(--color-accent, #2EC4B6)",
    label: "Practiced on time",
    tooltipLabel: "Practiced on time",
  },
  catch_up: {
    background: "color-mix(in srgb, var(--color-accent, #2EC4B6) 35%, var(--color-muted, #2a2a2a))",
    label: "Caught up later",
    tooltipLabel: "Caught up later",
  },
};

function formatTooltipDate(dateStr: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(dateStr + "T12:00:00"));
}

export function PracticeHeatmap({ values }: PracticeHeatmapProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <div>
      {/* Grid */}
      <div className="grid grid-cols-10 gap-2 sm:grid-cols-14">
        {values.map((cell, index) => {
          const config = STATE_CONFIG[cell.state];
          const isHovered = hoveredIndex === index;

          return (
            <div
              key={cell.date}
              className="relative"
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              /* Touch fallback: show tooltip on touch, clear on touchend */
              onTouchStart={() => setHoveredIndex(index)}
              onTouchEnd={() => setTimeout(() => setHoveredIndex(null), 1200)}
            >
              {/* Cell */}
              <div
                className="aspect-square rounded-[4px] transition-transform duration-100"
                style={{
                  background: config.background,
                  transform: isHovered ? "scale(1.25)" : "scale(1)",
                  boxShadow: isHovered
                    ? `0 0 0 2px color-mix(in srgb, ${config.background} 40%, transparent)`
                    : "none",
                }}
                aria-label={`${formatTooltipDate(cell.date)}: ${config.tooltipLabel}`}
              />

              {/* Tooltip — floats above the cell, centered */}
              {isHovered && (
                <div
                  role="tooltip"
                  className="pointer-events-none absolute z-50 bottom-full left-1/2 mb-2"
                  style={{ transform: "translateX(-50%)" }}
                >
                  <div
                    className="whitespace-nowrap rounded-md px-2.5 py-1.5 text-center shadow-lg"
                    style={{
                      background: "rgba(10,14,20,0.92)",
                      backdropFilter: "blur(6px)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <p
                      className="text-[11px] font-semibold"
                      style={{ color: "rgba(255,255,255,0.9)", lineHeight: 1.3 }}
                    >
                      {formatTooltipDate(cell.date)}
                    </p>
                    <p
                      className="text-[10px] mt-0.5"
                      style={{
                        color:
                          cell.state === "on_time"
                            ? "var(--color-accent, #2EC4B6)"
                            : cell.state === "catch_up"
                            ? "color-mix(in srgb, var(--color-accent, #2EC4B6) 65%, white)"
                            : "rgba(255,255,255,0.45)",
                        lineHeight: 1.3,
                      }}
                    >
                      {config.tooltipLabel}
                    </p>
                  </div>
                  {/* Arrow */}
                  <div
                    className="absolute left-1/2 top-full"
                    style={{
                      transform: "translateX(-50%)",
                      width: 0,
                      height: 0,
                      borderLeft: "5px solid transparent",
                      borderRight: "5px solid transparent",
                      borderTop: "5px solid rgba(10,14,20,0.92)",
                    }}
                    aria-hidden="true"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend — uses explicit rgba so it's legible on any surface (dark card, light page) */}
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
        {(Object.entries(STATE_CONFIG) as [HeatmapState, typeof STATE_CONFIG[HeatmapState]][]).map(
          ([state, config]) => (
            <span key={state} className="inline-flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 rounded-[3px] shrink-0"
                style={{ background: config.background }}
              />
              <span
                className="text-xs"
                style={{ color: "var(--color-muted-fg, #52525B)" }}
              >
                {config.label}
              </span>
            </span>
          )
        )}
      </div>
    </div>
  );
}
