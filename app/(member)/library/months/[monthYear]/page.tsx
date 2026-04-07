import { notFound } from "next/navigation";
import { getMonthDetail } from "@/lib/queries/get-monthly-archive";
import { getArchiveDailyAudios } from "@/lib/queries/get-monthly-daily-audios";
import { getMonthWeeklyContent } from "@/lib/queries/get-month-weekly-content";
import { getMemberNoteContentIds } from "@/lib/queries/get-library-content";
import { requireActiveMember } from "@/lib/auth/require-active-member";
import { MonthlyThemeCard } from "@/components/today/MonthlyThemeCard";
import { WeeklyArchive } from "@/components/today/WeeklyArchive";
import { MonthlyAudioArchive } from "@/components/today/MonthlyAudioArchive";
import Link from "next/link";
import type { Metadata } from "next";

/**
 * app/(member)/library/months/[monthYear]/page.tsx
 *
 * Month archive page — mirrors the /today layout but for a past month.
 * Shows: header, monthly theme, weekly reflections, daily practice playlist.
 */

interface Props {
  params: Promise<{ monthYear: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { monthYear } = await params;
  const label = monthYearToLabel(monthYear);
  return {
    title: `${label} — Positives Library`,
    description: `Explore the ${label} monthly practice archive.`,
  };
}

/** "2026-04" → "April 2026" */
function monthYearToLabel(monthYear: string): string {
  const [year, month] = monthYear.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(
    new Date(year, month - 1, 1)
  );
}

/** "2026-04" → "April" */
function monthName(monthYear: string): string {
  const [year, month] = monthYear.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { month: "long" }).format(
    new Date(year, month - 1, 1)
  );
}

export default async function MonthDetailPage({ params }: Props) {
  const { monthYear } = await params;
  const member = await requireActiveMember();

  const detail = await getMonthDetail(monthYear);
  if (!detail) notFound();

  const { practice, theme, daily_count } = detail;

  // Fetch the rich data needed by the /today-style components
  const [monthWeekly, archiveDailyGroup, noteContentIds] = await Promise.all([
    getMonthWeeklyContent(monthYear),
    getArchiveDailyAudios(monthYear),
    theme ? getMemberNoteContentIds(member.id) : Promise.resolve(new Set<string>()),
  ]);

  const currentMonth = monthName(monthYear);
  const label = practice.label;

  return (
    <div>
      {/* ── Header bar — mirrors /today contextual bar ──────────────── */}
      <section
        className="border-b border-border"
        style={{
          background:
            "radial-gradient(ellipse at 10% 0%, rgba(46,196,182,0.12) 0%, transparent 55%), var(--color-card)",
        }}
      >
        <div className="member-container py-5 md:py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Link
                href="/library"
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                Library
              </Link>
              <p
                className="text-[11px] font-bold uppercase tracking-[0.16em] mb-1.5"
                style={{ color: "var(--color-accent)" }}
              >
                Monthly Archive
              </p>
              <h1 className="heading-balance font-heading font-bold text-2xl md:text-3xl text-foreground tracking-[-0.03em] leading-tight">
                {label}
              </h1>
              {practice.description && (
                <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                  {practice.description}
                </p>
              )}
            </div>

            {/* Stats badge */}
            <span
              className="shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold mt-1"
              style={{
                background: "color-mix(in srgb, var(--color-primary) 12%, transparent)",
                color: "var(--color-primary)",
                border: "1px solid color-mix(in srgb, var(--color-primary) 22%, transparent)",
              }}
            >
              {daily_count > 0 && `${daily_count} daily`}
              {daily_count > 0 && monthWeekly.length > 0 && " · "}
              {monthWeekly.length > 0 && `${monthWeekly.length} weekly`}
              {(daily_count > 0 || monthWeekly.length > 0) && theme && " · "}
              {theme && "Theme"}
            </span>
          </div>
        </div>
      </section>

      {/* ── Content — same layout as /today ─────────────────────────── */}
      <div className="member-container py-6 flex flex-col gap-8">

        {/* ── Zone 1: Monthly theme + first weekly side-by-side ──────── */}
        {(theme || monthWeekly.length > 0) && (
          <section aria-label="This month and weekly content" className="flex flex-col gap-3">
            <div className="grid gap-5 lg:grid-cols-2">
              {/* Monthly theme — left on desktop */}
              {theme && (
                <div className="flex flex-col gap-2">
                  <span
                    className="text-[10px] font-bold uppercase tracking-[0.14em]"
                    style={{ color: "var(--color-accent)" }}
                  >
                    {currentMonth}&apos;s Theme
                  </span>
                  <MonthlyThemeCard
                    content={theme as import("@/lib/queries/get-monthly-content").MonthlyContent}
                    initialHasNote={theme ? noteContentIds.has(theme.id) : false}
                    viewerUserId={member.id}
                  />
                </div>
              )}

              {/* First weekly — right on desktop (if theme exists), or full width */}
              {monthWeekly.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span
                    className="text-[10px] font-bold uppercase tracking-[0.14em]"
                    style={{ color: "var(--color-secondary)" }}
                  >
                    Week 1 Reflection
                  </span>
                  <div
                    className="surface-card rounded-2xl border border-border p-5 flex flex-col gap-3"
                  >
                    <h3 className="font-heading font-bold text-lg text-foreground">
                      {monthWeekly[monthWeekly.length - 1].title}
                    </h3>
                    {monthWeekly[monthWeekly.length - 1].excerpt && (
                      <p className="text-sm text-foreground/70 leading-relaxed">
                        {monthWeekly[monthWeekly.length - 1].excerpt}
                      </p>
                    )}
                    <Link
                      href={`/library/${monthWeekly[monthWeekly.length - 1].id}`}
                      className="btn-primary self-start inline-flex items-center gap-2 text-sm"
                    >
                      View reflection
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── Zone 2: Weekly reflections archive ─────────────────────── */}
        {monthWeekly.length > 1 && (
          <WeeklyArchive
            weeks={monthWeekly}
            currentWeekStart={null}
          />
        )}

        {/* ── Zone 3: Daily practice playlist ───────────────────────── */}
        {archiveDailyGroup && archiveDailyGroup.audios.length > 0 && (
          <MonthlyAudioArchive
            monthGroups={[archiveDailyGroup]}
            currentMonthName={currentMonth}
          />
        )}
      </div>
    </div>
  );
}
