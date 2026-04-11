import { notFound, redirect } from "next/navigation";
import { getMonthDetail } from "@/lib/queries/get-monthly-archive";
import { getArchiveDailyAudios } from "@/lib/queries/get-monthly-daily-audios";
import { getMonthWeeklyContent } from "@/lib/queries/get-month-weekly-content";
import { getMemberNoteContentIds } from "@/lib/queries/get-library-content";
import { requireActiveMember } from "@/lib/auth/require-active-member";
import { getEffectiveMonthYear } from "@/lib/dates/effective-date";
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

function formatArchiveRange(startDate: string, endDate: string): string {
  const start = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);

  const sameMonth =
    start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();

  const startLabel = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(start);

  const endLabel = new Intl.DateTimeFormat("en-US", {
    ...(sameMonth ? {} : { month: "short" }),
    day: "numeric",
  }).format(end);

  return `${startLabel} - ${endLabel}`;
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
  const [monthWeekly, archiveDailyGroup, noteContentIds] = await Promise.all([
    getMonthWeeklyContent(monthYear),
    getArchiveDailyAudios(monthYear),
    theme ? getMemberNoteContentIds(member.id) : Promise.resolve(new Set<string>()),
  ]);

  const currentMonth = monthName(monthYear);
  const label = practice.label;
  const themeHasVideo = Boolean(theme?.vimeo_video_id || theme?.youtube_video_id);
  const archiveRange = archiveDailyGroup?.audios.length
    ? formatArchiveRange(
        archiveDailyGroup.audios[archiveDailyGroup.audios.length - 1]?.publish_date ?? monthYear,
        archiveDailyGroup.audios[0]?.publish_date ?? monthYear
      )
    : null;
  const summaryItems = [
    `${daily_count} daily practice${daily_count === 1 ? "" : "s"}`,
    `${monthWeekly.length} weekly reflection${monthWeekly.length === 1 ? "" : "s"}`,
    theme ? "Monthly theme included" : "Theme pending",
  ];
  const archiveDescription =
    practice.description || theme?.excerpt || "A completed month you can revisit whenever you need it.";

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

        {/* ── Zone 1: Monthly theme + archive summary ─────────────────── */}
        {(theme || monthWeekly.length > 0 || daily_count > 0) && (
          <section aria-label="This month and archive summary" className="flex flex-col gap-3">
            <div className={["grid gap-5", theme && themeHasVideo ? "lg:grid-cols-2" : ""].filter(Boolean).join(" ")}>
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

              <div className="flex flex-col gap-2">
                <span
                  className="text-[10px] font-bold uppercase tracking-[0.14em]"
                  style={{ color: "var(--color-secondary)" }}
                >
                  Month at a Glance
                </span>
                <div className="surface-card rounded-2xl border border-border p-5 flex flex-col gap-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em]"
                      style={{
                        color: "var(--color-secondary)",
                        background:
                          "color-mix(in srgb, var(--color-secondary) 10%, transparent)",
                        border:
                          "1px solid color-mix(in srgb, var(--color-secondary) 18%, transparent)",
                      }}
                    >
                      Completed month
                    </span>
                    {archiveRange && (
                      <span className="text-xs text-muted-foreground">
                        {archiveRange}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <h2
                      className="font-heading font-bold text-lg text-foreground tracking-[-0.03em]"
                      style={{ textWrap: "balance" }}
                    >
                      Revisit the month without needing to catch up.
                    </h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      This archive keeps the month intact: the theme, the weekly reflections,
                      and the daily practices that shaped it.
                    </p>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-3">
                    {summaryItems.map((item) => (
                      <div
                        key={item}
                        className="rounded-2xl border px-3.5 py-3"
                        style={{
                          borderColor: "var(--color-border)",
                          background: "color-mix(in srgb, var(--color-card) 84%, white)",
                        }}
                      >
                        <p className="text-xs font-semibold text-foreground/80 leading-snug">
                          {item}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      href="/today"
                      className="btn-primary inline-flex items-center gap-2 text-sm"
                    >
                      Go to Today
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </Link>
                    <Link
                      href="/library"
                      className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors hover:bg-accent/5"
                      style={{
                        color: "var(--color-secondary)",
                        border: "1px solid color-mix(in srgb, var(--color-secondary) 18%, transparent)",
                      }}
                    >
                      Back to Library
                    </Link>
                  </div>
                </div>
              </div>
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
