"use client";

import { useEffect, useState } from "react";
import { MonthlyAudioArchive } from "@/components/today/MonthlyAudioArchive";
import { WeeklyArchive } from "@/components/today/WeeklyArchive";
import type { MonthGroup } from "@/lib/queries/get-monthly-daily-audios";
import type { MonthWeeklyContent } from "@/lib/queries/get-month-weekly-content";
import { SurfaceCard } from "@/components/ui/SurfaceCard";

type TodayArchivePayload = {
  monthGroups: MonthGroup[];
  monthWeekly: MonthWeeklyContent[];
  listenedContentIds: string[];
};

export function TodayArchiveSection({
  currentMonthName,
  currentWeekStart,
}: {
  currentMonthName: string;
  currentWeekStart: string | null;
}) {
  const [payload, setPayload] = useState<TodayArchivePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadArchives() {
      try {
        const response = await fetch("/api/today/archive", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("We couldn't load the archive yet.");
        }

        const nextPayload = (await response.json()) as TodayArchivePayload;
        if (!cancelled) {
          setPayload(nextPayload);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "We couldn't load the archive yet."
          );
        }
      }
    }

    void loadArchives();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const syncArchiveState = () => setArchiveOpen(media.matches);

    syncArchiveState();
    media.addEventListener("change", syncArchiveState);
    return () => media.removeEventListener("change", syncArchiveState);
  }, []);

  if (error) {
    return (
      <SurfaceCard tone="tint">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
          Archive unavailable
        </p>
        <h2 className="mt-3 text-xl font-semibold tracking-[-0.03em] text-slate-950">
          We couldn&apos;t load this month&apos;s archive just yet
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">{error}</p>
      </SurfaceCard>
    );
  }

  if (!payload) {
    return (
      <SurfaceCard tone="tint">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
          Loading archive
        </p>
        <h2 className="mt-3 text-xl font-semibold tracking-[-0.03em] text-slate-950">
          Pulling this month&apos;s past practices
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          We load the archive after today&apos;s practice so the page gets you into the
          main experience faster.
        </p>
      </SurfaceCard>
    );
  }

  const hasArchive = payload.monthWeekly.length > 0 || payload.monthGroups.length > 0;
  if (!hasArchive) return null;

  return (
    <section aria-labelledby="today-archive-heading" className="rounded-[1.5rem] border border-border/70 bg-card p-4 shadow-soft md:p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="ui-section-eyebrow mb-1.5">Explore Past Practices</p>
          <h2
            id="today-archive-heading"
            className="heading-balance font-heading text-lg font-semibold tracking-[-0.02em] text-foreground"
            style={{ textWrap: "balance" }}
          >
            Revisit this month when it feels helpful.
          </h2>
          <p className="mt-1.5 text-sm leading-body text-muted-foreground">
            Past weekly reflections and daily practices are here when you want them.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setArchiveOpen((open) => !open)}
          className="btn-outline shrink-0 justify-center text-center text-sm"
          aria-expanded={archiveOpen}
          aria-controls="today-archive-content"
        >
          {archiveOpen ? "Hide past practices" : "Explore past practices"}
        </button>
      </div>

      {archiveOpen && (
        <div id="today-archive-content" className="mt-5 flex flex-col gap-8">
          <WeeklyArchive
            weeks={payload.monthWeekly}
            currentWeekStart={currentWeekStart}
          />

          {payload.monthGroups.length > 0 ? (
            <MonthlyAudioArchive
              monthGroups={payload.monthGroups}
              currentMonthName={currentMonthName}
              listenedContentIds={payload.listenedContentIds}
            />
          ) : null}
        </div>
      )}
    </section>
  );
}
