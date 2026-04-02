import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { requireActiveMember } from "@/lib/auth/require-active-member";
import { getMonthlyContent } from "@/lib/queries/get-monthly-content";
import { getMonthWeeklyContent } from "@/lib/queries/get-month-weekly-content";
import { getArchiveDailyAudios } from "@/lib/queries/get-monthly-daily-audios";
import { getEffectiveMonthYear } from "@/lib/dates/effective-date";
import { MonthlyThemeCard } from "@/components/today/MonthlyThemeCard";
import { WeeklyArchive } from "@/components/today/WeeklyArchive";
import { MonthlyAudioArchive } from "@/components/today/MonthlyAudioArchive";

/**
 * app/(member)/practice/[monthYear]/page.tsx
 *
 * Archive view for a specific month's practice content.
 * URL pattern: /practice/2026-03
 *
 * Displays:
 *   - Monthly theme (video + body)
 *   - All weekly reflections for the month (accordion)
 *   - All daily audio practices (inline playlist)
 *
 * Current month redirects to /today.
 * Invalid monthYear format → 404.
 * No content found for that month → 404.
 */

interface Props {
  params: Promise<{ monthYear: string }>;
}

/** "2026-03" → "March 2026" */
function monthYearToLabel(monthYear: string): string {
  const [year, month] = monthYear.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(
    new Date(year, month - 1, 1)
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { monthYear } = await params;
  const label = /^\d{4}-\d{2}$/.test(monthYear) ? monthYearToLabel(monthYear) : "Practice Archive";
  return {
    title: `${label} Practice — Positives`,
    description: `Your ${label} daily practices, weekly reflections, and monthly theme from Dr. Paul.`,
  };
}

export default async function PracticeArchivePage({ params }: Props) {
  await requireActiveMember();

  const { monthYear } = await params;

  // ── Validate format ────────────────────────────────────────────────────────
  if (!/^\d{4}-\d{2}$/.test(monthYear)) {
    notFound();
  }

  // ── Redirect current month → /today ───────────────────────────────────────
  const currentMonthYear = getEffectiveMonthYear();
  if (monthYear === currentMonthYear) {
    redirect("/today");
  }

  // ── Fetch all archive content in parallel ──────────────────────────────────
  const [monthlyContent, weeklyContent, archiveAudiosGroup] = await Promise.all([
    getMonthlyContent(monthYear),
    getMonthWeeklyContent(monthYear),
    getArchiveDailyAudios(monthYear),
  ]);

  // ── 404 if this month has no content at all ────────────────────────────────
  if (!monthlyContent && weeklyContent.length === 0 && !archiveAudiosGroup) {
    notFound();
  }

  const monthName = monthYearToLabel(monthYear);
  const audioGroups = archiveAudiosGroup ? [archiveAudiosGroup] : [];

  return (
    <div>
      {/* ── Archive contextual bar ─────────────────────────────────────── */}
      <section
        className="border-b border-border"
        style={{
          background:
            "radial-gradient(ellipse at 10% 0%, rgba(46,196,182,0.08) 0%, transparent 55%), var(--color-card)",
        }}
      >
        <div className="member-container py-7 md:py-9">
          <div className="flex items-start justify-between gap-4">
            <div>
              {/* Back to today */}
              <Link
                href="/today"
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] mb-3 transition-opacity hover:opacity-70"
                style={{ color: "var(--color-accent)" }}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                Back to Today
              </Link>

              <p
                className="text-[11px] font-bold uppercase tracking-[0.16em] mb-1.5"
                style={{ color: "var(--color-muted-fg)" }}
              >
                Practice Archive
              </p>
              <h1 className="font-heading font-bold text-2xl md:text-3xl text-foreground tracking-[-0.03em] leading-tight">
                {monthName}
              </h1>
              {monthlyContent && (
                <p className="text-sm text-muted-foreground mt-1">
                  Theme:{" "}
                  <span className="text-foreground/70 font-medium">
                    {monthlyContent.title}
                  </span>
                </p>
              )}
            </div>

            {/* Archive badge */}
            <span
              className="shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold mt-1"
              style={{
                background: "var(--color-muted)",
                color: "var(--color-muted-fg)",
                border: "1px solid var(--color-border)",
              }}
            >
              📅 Archive
            </span>
          </div>
        </div>
      </section>

      {/* ── Archive content ─────────────────────────────────────────────── */}
      <div className="member-container py-8 flex flex-col gap-10">

        {/* ── Monthly theme ──────────────────────────────────────────────── */}
        {monthlyContent && (
          <section aria-labelledby="archive-theme-heading" className="flex flex-col gap-3">
            <div>
              <span
                className="text-[10px] font-bold uppercase tracking-[0.14em]"
                style={{ color: "var(--color-accent)" }}
              >
                {monthName}&apos;s Theme
              </span>
            </div>
            <MonthlyThemeCard
              content={monthlyContent}
              initialHasNote={false}
            />
          </section>
        )}

        {/* ── Weekly reflections (all weeks, no exclusion) ───────────────── */}
        {weeklyContent.length > 0 && (
          <WeeklyArchive weeks={weeklyContent} />
        )}

        {/* ── Daily practice playlist ────────────────────────────────────── */}
        {audioGroups.length > 0 && (
          <MonthlyAudioArchive monthGroups={audioGroups} />
        )}

        {/* ── Empty state ────────────────────────────────────────────────── */}
        {!monthlyContent && weeklyContent.length === 0 && audioGroups.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-sm">
              No content available for {monthName}.
            </p>
            <Link
              href="/today"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold transition-opacity hover:opacity-70"
              style={{ color: "var(--color-accent)" }}
            >
              ← Back to Today
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
