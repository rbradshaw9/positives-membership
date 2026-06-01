"use client";

import { useState } from "react";
import type { MonthlyContent } from "@/lib/queries/get-monthly-content";
import { ContentThumbnail } from "@/components/today/ContentThumbnail";
import { MonthlyThemeCard } from "@/components/today/MonthlyThemeCard";

type MonthlyThemeFeatureCardProps = {
  content: MonthlyContent | null;
  initialNoteCount?: number;
  monthLabel: string;
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

export function MonthlyThemeFeatureCard({
  content,
  initialNoteCount = 0,
  monthLabel,
}: MonthlyThemeFeatureCardProps) {
  const [open, setOpen] = useState(false);
  const imageUrl = content?.thumbnail_image_url ?? content?.featured_image_url ?? null;
  const hasVideo = Boolean(content?.vimeo_video_id || content?.youtube_video_id);

  if (!content) return null;

  return (
    <>
      <section aria-labelledby="monthly-theme-feature-heading" className="space-y-3">
        <h2 id="monthly-theme-feature-heading" className="ui-section-eyebrow text-[11px]">
          Monthly Theme
        </h2>

        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`Open ${monthLabel}'s theme`}
          className="group grid min-h-[13rem] w-full overflow-hidden rounded-[1.35rem] border border-border bg-card text-left shadow-soft transition-all hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-medium md:grid-cols-[18rem_1fr]"
        >
          <span className="relative block min-h-[12rem] overflow-hidden bg-muted md:min-h-full">
            <ContentThumbnail
              accent="accent"
              imageUrl={imageUrl}
              sizes="(max-width: 768px) 100vw, 18rem"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
            <span className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent" />
            <span className="absolute left-3 top-3 rounded-full bg-black/50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-white shadow-soft backdrop-blur-md">
              {monthLabel}
            </span>
            <span className="absolute bottom-3 left-3 rounded-full bg-white/92 px-2.5 py-1 text-[10px] font-semibold text-foreground shadow-soft">
              {hasVideo ? "Watch" : "Open"}
            </span>
          </span>

          <span className="flex min-w-0 flex-col justify-between p-5 md:p-6">
            <span>
              <span className="block font-heading text-2xl font-semibold leading-heading tracking-[-0.03em] text-foreground">
                {content.title}
              </span>
              {(content.excerpt ?? content.description) ? (
                <span className="mt-2 block max-w-2xl text-sm leading-6 text-muted-foreground">
                  {content.excerpt ?? content.description}
                </span>
              ) : null}
            </span>
            <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary transition-colors group-hover:text-primary-hover">
              {hasVideo ? "Watch" : "Open"}
              <ArrowIcon />
            </span>
          </span>
        </button>
      </section>

      {open ? (
        <div
          className="fixed inset-0 z-[75] flex items-end justify-center bg-foreground/45 p-3 backdrop-blur-sm md:items-center md:p-6"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label={`${monthLabel}'s theme`}
            className="flex max-h-[88dvh] w-full max-w-4xl flex-col overflow-hidden rounded-[1.5rem] border border-border bg-background shadow-large"
          >
            <div className="flex items-center justify-between gap-4 border-b border-border bg-card px-5 py-4">
              <div>
                <p className="ui-section-eyebrow">Monthly Theme</p>
                <h2 className="mt-1 font-heading text-xl font-semibold tracking-[-0.025em] text-foreground">
                  {content.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Close"
              >
                <CloseIcon />
              </button>
            </div>
            <div className="overflow-y-auto p-4 md:p-5">
              <MonthlyThemeCard
                content={content}
                initialNoteCount={initialNoteCount}
                monthLabel={monthLabel}
              />
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
