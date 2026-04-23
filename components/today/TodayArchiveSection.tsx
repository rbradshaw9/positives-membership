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

  return (
    <>
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
    </>
  );
}
