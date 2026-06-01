"use client";

import { useState } from "react";
import type { MonthlyContent } from "@/lib/queries/get-monthly-content";
import type { WeeklyContent } from "@/lib/queries/get-weekly-content";
import { MonthlyThemeCard } from "@/components/today/MonthlyThemeCard";
import { WeeklyPrincipleCard } from "@/components/today/WeeklyPrincipleCard";

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
  body,
  emptyBody,
  onClick,
  ariaLabel,
}: {
  accent: "secondary" | "accent";
  eyebrow: string;
  title: string;
  body: string | null | undefined;
  emptyBody: string;
  onClick: () => void;
  ariaLabel: string;
}) {
  const color = accent === "secondary" ? "var(--color-secondary)" : "var(--color-accent)";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="group flex min-h-[9.5rem] w-full flex-col justify-between rounded-[1.35rem] border border-border bg-card p-5 text-left shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-medium"
    >
      <span>
        <span
          className="text-[10px] font-bold uppercase tracking-[0.16em]"
          style={{ color }}
        >
          {eyebrow}
        </span>
        <span className="mt-2 block font-heading text-xl font-semibold leading-heading tracking-[-0.025em] text-foreground">
          {title}
        </span>
        <span className="mt-2 block text-sm leading-6 text-muted-foreground">
          {body || emptyBody}
        </span>
      </span>
      <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary transition-colors group-hover:text-primary-hover">
        Open
        <ArrowIcon />
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

  return (
    <>
      <section aria-label="This week and this month" className="grid gap-4 md:grid-cols-2">
        <div data-tour-target="today-weekly-principle">
          <ContextButton
            accent="secondary"
            eyebrow={weekLabel}
            title={weeklyContent?.title ?? "This week's principle"}
            body={weeklyContent?.excerpt}
            emptyBody="A simple principle to carry with you this week."
            onClick={() => setActiveContext("weekly")}
            ariaLabel="Open this week's principle"
          />
        </div>
        <div data-tour-target="today-monthly-theme">
          <ContextButton
            accent="accent"
            eyebrow={monthLabel}
            title={monthlyContent?.title ?? `${monthLabel}'s theme`}
            body={monthlyContent?.excerpt}
            emptyBody="A steady frame for the month."
            onClick={() => setActiveContext("monthly")}
            ariaLabel="Open this month's theme"
          />
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
