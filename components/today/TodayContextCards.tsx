"use client";

import { useState } from "react";
import type { MonthlyContent } from "@/lib/queries/get-monthly-content";
import type { WeeklyContent } from "@/lib/queries/get-weekly-content";
import { MonthlyThemeCard } from "@/components/today/MonthlyThemeCard";
import { WeeklyPrincipleCard } from "@/components/today/WeeklyPrincipleCard";
import { ContentThumbnail } from "@/components/today/ContentThumbnail";

type TodayContextCardsProps = {
  weeklyContent: WeeklyContent | null;
  monthlyContent: MonthlyContent | null;
  weeklyAudioUrl: string | null;
  weeklyNoteCount: number;
  monthlyNoteCount: number;
  weekLabel: string;
  monthLabel: string;
};

type ActiveContext = "weekly" | "monthly" | null;

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

function ArrowIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function ContextButton({
  accent,
  eyebrow,
  title,
  detail,
  imageUrl,
  actionLabel,
  onClick,
  ariaLabel,
}: {
  accent: "secondary" | "accent";
  eyebrow: string;
  title: string;
  detail: string;
  imageUrl: string | null;
  actionLabel: string;
  onClick: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="group grid min-h-[10.5rem] w-full overflow-hidden rounded-[1.35rem] border border-border bg-card text-left shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-medium sm:grid-cols-[9.75rem_1fr]"
    >
      <span className="relative block min-h-[8.5rem] overflow-hidden bg-muted sm:min-h-full">
        <ContentThumbnail
          accent={accent}
          imageUrl={imageUrl}
          sizes="(max-width: 640px) 100vw, 10rem"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
        <span className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/5 to-transparent" />
        <span className="absolute left-3 top-3 rounded-full bg-black/50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-white shadow-soft backdrop-blur-md">
          {eyebrow}
        </span>
      </span>
      <span className="flex min-w-0 flex-col justify-between p-4 sm:p-5">
        <span>
          <span className="block font-heading text-lg font-semibold leading-heading tracking-[-0.025em] text-foreground md:text-xl">
            {title}
          </span>
          <span className="mt-2 block text-sm leading-6 text-muted-foreground line-clamp-2">
            {detail}
          </span>
        </span>
        <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary transition-colors group-hover:text-primary-hover">
          {actionLabel}
          <ArrowIcon />
        </span>
      </span>
    </button>
  );
}

export function TodayContextCards({
  weeklyContent,
  monthlyContent,
  weeklyAudioUrl,
  weeklyNoteCount,
  monthlyNoteCount,
  weekLabel,
  monthLabel,
}: TodayContextCardsProps) {
  const [activeContext, setActiveContext] = useState<ActiveContext>(null);
  const activeTitle =
    activeContext === "weekly"
      ? "This Week"
      : activeContext === "monthly"
        ? "This Month"
      : "";
  const weeklyImageUrl =
    weeklyContent?.thumbnail_image_url ?? weeklyContent?.featured_image_url ?? null;
  const monthlyImageUrl =
    monthlyContent?.thumbnail_image_url ?? monthlyContent?.featured_image_url ?? null;
  const weeklyAction =
    weeklyContent?.vimeo_video_id || weeklyContent?.youtube_video_id
      ? "Watch"
      : weeklyAudioUrl
        ? "Listen"
        : "Open";
  const monthlyAction =
    monthlyContent?.vimeo_video_id || monthlyContent?.youtube_video_id ? "Watch" : "Open";

  return (
    <>
      <section aria-labelledby="today-context-heading" className="space-y-3">
        <h2
          id="today-context-heading"
          className="ui-section-eyebrow text-[11px]"
        >
          This Week &amp; Month
        </h2>
        <div className="grid gap-4 lg:grid-cols-[1.08fr_0.92fr]">
          <div data-tour-target="today-weekly-principle">
            <ContextButton
              accent="secondary"
              eyebrow={weekLabel}
              title={weeklyContent?.title ?? "This week's principle"}
              detail={weeklyContent?.excerpt ?? "A simple principle to carry into the next few practices."}
              imageUrl={weeklyImageUrl}
              actionLabel={weeklyAction}
              onClick={() => setActiveContext("weekly")}
              ariaLabel="Open this week's principle"
            />
          </div>
          <div data-tour-target="today-monthly-theme">
            <ContextButton
              accent="accent"
              eyebrow={monthLabel}
              title={monthlyContent?.title ?? `${monthLabel}'s theme`}
              detail={monthlyContent?.excerpt ?? "The larger frame behind this month's practice."}
              imageUrl={monthlyImageUrl}
              actionLabel={monthlyAction}
              onClick={() => setActiveContext("monthly")}
              ariaLabel="Open this month's theme"
            />
          </div>
        </div>
      </section>

      {activeContext ? (
        <div
          className="fixed inset-0 z-[75] flex items-end justify-center bg-foreground/45 p-3 backdrop-blur-sm md:items-center md:p-6"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setActiveContext(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label={activeTitle}
            className="flex max-h-[88dvh] w-full max-w-4xl flex-col overflow-hidden rounded-[1.5rem] border border-border bg-background shadow-large"
          >
            <div className="flex items-center justify-between gap-4 border-b border-border bg-card px-5 py-4">
              <div>
                <p className="ui-section-eyebrow">{activeTitle}</p>
                <h2 className="mt-1 font-heading text-xl font-semibold tracking-[-0.025em] text-foreground">
                  {activeContext === "weekly"
                    ? weeklyContent?.title ?? "This week's principle"
                    : monthlyContent?.title ?? `${monthLabel}'s theme`}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveContext(null)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Close"
              >
                <CloseIcon />
              </button>
            </div>
            <div className="overflow-y-auto p-4 md:p-5">
              {activeContext === "weekly" ? (
                <WeeklyPrincipleCard
                  content={weeklyContent}
                  audioUrl={weeklyAudioUrl}
                  initialNoteCount={weeklyNoteCount}
                />
              ) : (
                <MonthlyThemeCard
                  content={monthlyContent}
                  initialNoteCount={monthlyNoteCount}
                  monthLabel={monthLabel}
                />
              )}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
