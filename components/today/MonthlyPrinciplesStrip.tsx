"use client";

import { useMemo, useState } from "react";
import type { MonthWeeklyContent } from "@/lib/queries/get-month-weekly-content";
import { ContentThumbnail } from "@/components/today/ContentThumbnail";
import { WeeklyPrincipleCard } from "@/components/today/WeeklyPrincipleCard";

type MonthlyPrinciplesStripProps = {
  weeks: MonthWeeklyContent[];
  currentWeekStart: string | null;
};

function CloseIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="2"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function formatWeekRangeLabel(weekStart: string | null): string {
  if (!weekStart) return "This week";
  const date = new Date(weekStart + "T12:00:00");
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function getWeekIndex(week: MonthWeeklyContent, orderedWeeks: MonthWeeklyContent[]) {
  return orderedWeeks.findIndex((item) => item.id === week.id) + 1;
}

export function MonthlyPrinciplesStrip({
  weeks,
  currentWeekStart,
}: MonthlyPrinciplesStripProps) {
  const [activeWeekId, setActiveWeekId] = useState<string | null>(null);

  const orderedWeeks = useMemo(
    () =>
      [...weeks].sort((a, b) =>
        (a.week_start ?? "").localeCompare(b.week_start ?? "")
      ),
    [weeks]
  );
  const activeWeek = orderedWeeks.find((week) => week.id === activeWeekId) ?? null;

  if (orderedWeeks.length === 0) return null;

  return (
    <>
      <section aria-labelledby="monthly-principles-heading" className="space-y-3">
        <h2
          id="monthly-principles-heading"
          className="ui-section-eyebrow text-[11px]"
        >
          This Month&apos;s Principles
        </h2>

        <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:-mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4">
          {orderedWeeks.map((week) => {
            const imageUrl = week.thumbnail_image_url ?? week.featured_image_url ?? null;
            const weekNumber = getWeekIndex(week, orderedWeeks);
            const isCurrent = Boolean(currentWeekStart && week.week_start === currentWeekStart);
            const hasVideo = Boolean(week.vimeo_video_id || week.youtube_video_id);
            const hasAudio = Boolean(week.audio_url || week.castos_episode_url);

            return (
              <button
                key={week.id}
                type="button"
                onClick={() => setActiveWeekId(week.id)}
                className="group w-[13.5rem] shrink-0 snap-start overflow-hidden rounded-[1.1rem] border border-border bg-card text-left shadow-soft transition-all hover:-translate-y-0.5 hover:border-secondary/30 hover:shadow-medium sm:w-auto"
                aria-label={`Open Week ${weekNumber}: ${week.title}`}
              >
                <span className="relative block aspect-[16/9] overflow-hidden bg-muted">
                  <ContentThumbnail
                    accent="secondary"
                    imageUrl={imageUrl}
                    sizes="(max-width: 640px) 100vw, 25vw"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                  <span className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                  <span className="absolute left-3 top-3 rounded-full bg-black/50 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-white backdrop-blur-md">
                    Week {weekNumber}
                  </span>
                  {isCurrent ? (
                    <span className="absolute right-3 top-3 rounded-full bg-white/92 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-foreground shadow-soft">
                      Current
                    </span>
                  ) : null}
                  <span className="absolute bottom-3 left-3 rounded-full bg-white/92 px-2 py-1 text-[10px] font-semibold text-foreground shadow-soft">
                    {hasVideo ? "Watch" : hasAudio ? "Listen" : "Open"}
                  </span>
                </span>
                <span className="block p-3.5">
                  <span
                    className="block text-[10px] font-bold uppercase tracking-[0.14em]"
                    style={{ color: "var(--color-secondary)" }}
                  >
                    Week of {formatWeekRangeLabel(week.week_start)}
                  </span>
                  <span className="mt-1.5 block text-sm font-semibold leading-snug text-foreground line-clamp-2">
                    {week.title}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {activeWeek ? (
        <div
          className="fixed inset-0 z-[75] flex items-end justify-center bg-foreground/45 p-3 backdrop-blur-sm md:items-center md:p-6"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setActiveWeekId(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label={`Week ${getWeekIndex(activeWeek, orderedWeeks)}`}
            className="flex max-h-[88dvh] w-full max-w-4xl flex-col overflow-hidden rounded-[1.5rem] border border-border bg-background shadow-large"
          >
            <div className="flex items-center justify-between gap-4 border-b border-border bg-card px-5 py-4">
              <div>
                <p className="ui-section-eyebrow">
                  Week {getWeekIndex(activeWeek, orderedWeeks)}
                </p>
                <h2 className="mt-1 font-heading text-xl font-semibold tracking-[-0.025em] text-foreground">
                  {activeWeek.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveWeekId(null)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Close"
              >
                <CloseIcon />
              </button>
            </div>
            <div className="overflow-y-auto p-4 md:p-5">
              <WeeklyPrincipleCard
                content={activeWeek}
                audioUrl={activeWeek.audio_url ?? null}
              />
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
