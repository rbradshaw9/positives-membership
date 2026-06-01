import { notFound, redirect } from "next/navigation";
import { getMonthDetail } from "@/lib/queries/get-monthly-archive";
import { getArchiveDailyAudios } from "@/lib/queries/get-monthly-daily-audios";
import { getMonthWeeklyContent } from "@/lib/queries/get-month-weekly-content";
import { getMemberNoteCounts } from "@/lib/queries/get-library-content";
import { requireActiveMember } from "@/lib/auth/require-active-member";
import { getEffectiveMonthYear } from "@/lib/dates/effective-date";
import type { MonthlyContent } from "@/lib/queries/get-monthly-content";
import { MonthlyAudioArchive } from "@/components/today/MonthlyAudioArchive";
import { MonthlyPrinciplesStrip } from "@/components/today/MonthlyPrinciplesStrip";
import { MonthlyThemeFeatureCard } from "@/components/today/MonthlyThemeFeatureCard";
import { resolveAudioUrl } from "@/lib/media/resolve-audio-url";
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
  const activeMonthYear = getEffectiveMonthYear();

  if (monthYear === activeMonthYear) {
    redirect("/today");
  }

  if (monthYear > activeMonthYear) {
    notFound();
  }

  const member = await requireActiveMember();

  const detail = await getMonthDetail(monthYear);
  if (!detail) notFound();

  const { practice, theme, daily_count } = detail;

  // Fetch the rich data needed by the /today-style components
  const [rawMonthWeekly, rawArchiveDailyGroup, noteCounts] = await Promise.all([
    getMonthWeeklyContent(monthYear),
    getArchiveDailyAudios(monthYear),
    theme ? getMemberNoteCounts(member.id, [theme.id]) : Promise.resolve<Record<string, number>>({}),
  ]);

  const [monthWeekly, archiveDailyGroup] = await Promise.all([
    Promise.all(
      rawMonthWeekly.map(async (week) => ({
        ...week,
        audio_url: await resolveAudioUrl(week.castos_episode_url, week.s3_audio_key),
      }))
    ),
    rawArchiveDailyGroup
      ? Promise.all(
          rawArchiveDailyGroup.audios.map(async (audio) => ({
            ...audio,
            audio_url: await resolveAudioUrl(audio.castos_episode_url, audio.s3_audio_key),
          }))
        ).then((audios) => ({ ...rawArchiveDailyGroup, audios }))
      : Promise.resolve(null),
  ]);

  const currentMonth = monthName(monthYear);
  const label = practice.label;
  const archiveDescription =
    practice.description || theme?.excerpt || "A completed month you can revisit whenever you need it.";
  const themeContent = theme as MonthlyContent | null;

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
              <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                {archiveDescription}
              </p>
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
        {themeContent && (
          <MonthlyThemeFeatureCard
            content={themeContent}
            initialNoteCount={theme ? (noteCounts[theme.id] ?? 0) : 0}
            monthLabel={currentMonth}
          />
        )}

        {monthWeekly.length > 0 && (
          <MonthlyPrinciplesStrip
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
