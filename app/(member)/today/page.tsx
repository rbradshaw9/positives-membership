import { createClient } from "@/lib/supabase/server";
import { getTodayContent } from "@/lib/queries/get-today-content";
import { getWeeklyContent } from "@/lib/queries/get-weekly-content";
import { getMonthlyContent } from "@/lib/queries/get-monthly-content";
import { resolveAudioUrl } from "@/lib/media/resolve-audio-url";
import { getMemberNoteCounts } from "@/lib/queries/get-library-content";
import { getEffectiveDate } from "@/lib/dates/effective-date";
import { getGreeting } from "@/lib/greeting";
import { requireActiveMember } from "@/lib/auth/require-active-member";
import { isStreakActive } from "@/lib/streak/compute-streak";
import { DailyPracticeCard } from "@/components/today/DailyPracticeCard";
import { WeeklyPrincipleCard } from "@/components/today/WeeklyPrincipleCard";
import { MonthlyThemeCard } from "@/components/today/MonthlyThemeCard";
import { StreakBadge } from "@/components/today/StreakBadge";
import { TodayArchiveSection } from "@/components/today/TodayArchiveSection";
import Link from "next/link";

/**
 * app/(member)/today/page.tsx
 *
 * Layout:
 *   1. Slim contextual bar  — date, greeting, streak
 *   2. Today's daily audio  — DailyPracticeCard, dominant
 *   3. Rhythm overview — how daily, weekly, and monthly fit together
 *   4. This week + this month — weekly practice, monthly context
 *   5. Weekly reflections archive — past weeks this month (accordion)
 *   6. Daily practice playlist — inline playback, no /library navigation
 */

export const metadata = {
  title: "Today's Practice — Positives",
  description: "Your daily grounding practice from Dr. Paul.",
};

function RhythmStep({
  detail,
  label,
  status,
  title,
  tone,
}: {
  detail: string;
  label: string;
  status: string;
  title: string;
  tone: "primary" | "secondary" | "accent";
}) {
  const color =
    tone === "primary"
      ? "var(--color-primary)"
      : tone === "secondary"
        ? "var(--color-secondary)"
        : "var(--color-accent)";

  return (
    <div className="flex min-w-0 gap-3 py-3 md:px-4 md:py-0">
      <span
        aria-hidden="true"
        className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
        style={{
          background: `color-mix(in srgb, ${color} 12%, transparent)`,
          border: `1px solid color-mix(in srgb, ${color} 22%, transparent)`,
          color,
        }}
      >
        {label.slice(0, 1)}
      </span>
      <span className="min-w-0">
        <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </span>
        <span className="mt-1 block font-heading text-base font-semibold leading-tight text-foreground">
          {title}
        </span>
        <span className="mt-1 block text-sm leading-body text-muted-foreground">
          {detail}
        </span>
        <span
          className="mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold"
          style={{
            background: `color-mix(in srgb, ${color} 9%, transparent)`,
            color,
          }}
        >
          {status}
        </span>
      </span>
    </div>
  );
}

export default async function TodayPage() {
  const member = await requireActiveMember();
  const supabase = await createClient();

  const effectiveDateStr = getEffectiveDate();

  const [todayContent, weeklyContent, monthlyContent] =
    await Promise.all([
      getTodayContent(),
      getWeeklyContent(),
      getMonthlyContent(),
    ]);

  const [dailyAudioUrl, weeklyAudioUrl] = await Promise.all([
    todayContent
      ? resolveAudioUrl(todayContent.castos_episode_url, todayContent.s3_audio_key)
      : Promise.resolve(null),
    weeklyContent
      ? resolveAudioUrl(weeklyContent.castos_episode_url, weeklyContent.s3_audio_key)
      : Promise.resolve(null),
  ]);

  const contentIds = [todayContent?.id, weeklyContent?.id, monthlyContent?.id].filter(
    Boolean
  ) as string[];

  const listenedTodayPromise =
    todayContent?.id
      ? supabase
          .from("activity_event")
          .select("content_id")
          .eq("member_id", member.id)
          .eq("event_type", "daily_listened")
          .eq("content_id", todayContent.id)
          .maybeSingle()
          .then(({ data }) => Boolean(data?.content_id))
      : Promise.resolve(false);

  const [noteCounts, listenedToday] = await Promise.all([
    contentIds.length > 0
      ? getMemberNoteCounts(member.id, contentIds)
      : Promise.resolve<Record<string, number>>({}),
    listenedTodayPromise,
  ]);

  // Only show a non-zero streak if the member practiced today or yesterday.
  // If they missed a day the DB value is stale — display 0 until they listen again.
  const streak = isStreakActive(member.last_practiced_at, effectiveDateStr)
    ? (member.practice_streak ?? 0)
    : 0;

  const effectiveDate = new Date(effectiveDateStr + "T12:00:00");
  const todayLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(effectiveDate);

  const currentMonthName = new Intl.DateTimeFormat("en-US", {
    month: "long",
  }).format(effectiveDate);

  const dayOfMonth = effectiveDate.getDate();
  const weekOfMonth = Math.ceil(dayOfMonth / 7);

  const greeting = getGreeting(member.name);

  return (
    <div>
      {/* ── Slim contextual bar ──────────────────────────────────────── */}
      <section
        data-tour-target="today-overview"
        className="border-b border-border"
        style={{
          background:
            "radial-gradient(ellipse at 10% 0%, rgba(46,196,182,0.12) 0%, transparent 55%), var(--color-card)",
        }}
      >
        <div className="member-container py-5 md:py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p
                className="text-[11px] font-bold uppercase tracking-[0.16em] mb-1.5"
                style={{ color: "var(--color-accent)" }}
              >
                {todayLabel}
              </p>
              <h1 className="font-heading font-bold text-2xl md:text-3xl text-foreground tracking-[-0.03em] leading-tight">
                {greeting}
              </h1>
              {monthlyContent && (
                <p className="text-sm text-muted-foreground mt-1">
                  {currentMonthName}&apos;s theme:{" "}
                  <span className="text-foreground/70 font-medium">
                    {monthlyContent.title}
                  </span>
                </p>
              )}
              <p className="mt-3 max-w-2xl text-sm leading-body text-muted-foreground">
                Start with today&apos;s audio. Use this week&apos;s principle and this month&apos;s theme when you want more context.
              </p>
            </div>

            <StreakBadge initialStreak={streak} />
          </div>
        </div>
      </section>

      {/* ── Content ───────────────────────────────────────────────────── */}
      <div className="member-container py-6 flex flex-col gap-8">

        {/* ── Zone 1: Today's audio ─────────────────────────────────── */}
        <DailyPracticeCard
          content={todayContent}
          audioUrl={dailyAudioUrl}
          todayLabel={todayLabel}
          hasListened={listenedToday}
          initialNoteCount={todayContent ? (noteCounts[todayContent.id] ?? 0) : 0}
        />

        <section
          aria-label="Your practice rhythm"
          className="rounded-[1.5rem] border border-border/70 bg-card px-4 py-3 shadow-soft md:px-5 md:py-4"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="ui-section-eyebrow mb-1.5">Your Rhythm</p>
              <h2
                className="heading-balance font-heading text-lg font-semibold tracking-[-0.02em] text-foreground"
                style={{ textWrap: "balance" }}
              >
                One daily practice, supported by this week and this month.
              </h2>
            </div>
            <Link
              href="/practice"
              className="btn-outline shrink-0 justify-center text-center text-sm"
            >
              Open My Practice
            </Link>
          </div>
          <div className="mt-3 grid divide-y divide-border/70 md:grid-cols-3 md:divide-x md:divide-y-0">
            <RhythmStep
              label="Today"
              title="Daily audio"
              detail="Listen first. This is the simple habit that anchors the day."
              status={listenedToday ? "Complete today" : todayContent ? "Ready now" : "Coming soon"}
              tone="primary"
            />
            <RhythmStep
              label="This Week"
              title="Weekly principle"
              detail="A focus to carry into the next few practices and reflections."
              status={weeklyContent ? `Week ${weekOfMonth} available` : "Arrives Monday"}
              tone="secondary"
            />
            <RhythmStep
              label="This Month"
              title="Monthly theme"
              detail="The larger frame behind the daily and weekly practice."
              status={monthlyContent ? `${currentMonthName} theme` : "Arrives monthly"}
              tone="accent"
            />
          </div>
        </section>

        {/* ── Zone 2: Weekly practice + Monthly context ─────────────── */}
        <section aria-labelledby="today-context-heading" className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="ui-section-eyebrow mb-1.5">Go Deeper</p>
              <h2
                id="today-context-heading"
                className="heading-balance font-heading text-xl font-semibold tracking-[-0.02em] text-foreground md:text-2xl"
                style={{ textWrap: "balance" }}
              >
                This week and this month
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-body text-muted-foreground">
                The weekly principle is the next layer of practice. The monthly theme gives everything a steady frame.
              </p>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1.08fr_0.92fr]">
            {/* Weekly reflection — current principle and action */}
            <div className="flex flex-col gap-2" data-tour-target="today-weekly-principle">
              <span
                className="text-[10px] font-bold uppercase tracking-[0.14em]"
                style={{ color: "var(--color-secondary)" }}
              >
                Week {weekOfMonth} Practice
              </span>
              <WeeklyPrincipleCard
                content={weeklyContent}
                audioUrl={weeklyAudioUrl}
                initialNoteCount={weeklyContent ? (noteCounts[weeklyContent.id] ?? 0) : 0}
              />
            </div>

            {/* Monthly theme — grounding context */}
            <div className="flex flex-col gap-2" data-tour-target="today-monthly-theme">
              <span
                className="text-[10px] font-bold uppercase tracking-[0.14em]"
                style={{ color: "var(--color-accent)" }}
              >
                {currentMonthName}&apos;s Theme
              </span>
              <MonthlyThemeCard
                content={monthlyContent}
                initialNoteCount={monthlyContent ? (noteCounts[monthlyContent.id] ?? 0) : 0}
                monthLabel={currentMonthName}
              />
            </div>
          </div>
        </section>

        {/* ── Zone 3: Weekly archive + monthly practice playlist ───── */}
        <TodayArchiveSection
          currentMonthName={currentMonthName}
          currentWeekStart={weeklyContent?.week_start ?? null}
        />
      </div>
    </div>
  );
}
