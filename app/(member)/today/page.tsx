import { createClient } from "@/lib/supabase/server";
import { getTodayContent } from "@/lib/queries/get-today-content";
import { getWeeklyContent } from "@/lib/queries/get-weekly-content";
import { getMonthlyContent } from "@/lib/queries/get-monthly-content";
import { getMonthlyDailyAudios } from "@/lib/queries/get-monthly-daily-audios";
import { getMonthWeeklyContent } from "@/lib/queries/get-month-weekly-content";
import { resolveAudioUrl } from "@/lib/media/resolve-audio-url";
import { getMemberNoteContentIds } from "@/lib/queries/get-library-content";
import { getEffectiveDate, getEffectiveMonthYear } from "@/lib/dates/effective-date";
import { getGreeting } from "@/lib/greeting";
import { requireActiveMember } from "@/lib/auth/require-active-member";
import { isStreakActive } from "@/lib/streak/compute-streak";
import { DailyPracticeCard } from "@/components/today/DailyPracticeCard";
import { WeeklyPrincipleCard } from "@/components/today/WeeklyPrincipleCard";
import { MonthlyThemeCard } from "@/components/today/MonthlyThemeCard";
import { MonthlyAudioArchive } from "@/components/today/MonthlyAudioArchive";
import { WeeklyArchive } from "@/components/today/WeeklyArchive";
import { StreakBadge } from "@/components/today/StreakBadge";
import { TodayListenStatusBadge } from "@/components/today/TodayListenStatusBadge";


/**
 * app/(member)/today/page.tsx
 *
 * Layout:
 *   1. Slim contextual bar  — date, greeting, streak
 *   2. Today's daily audio  — DailyPracticeCard, dominant
 *   3. Monthly theme + Weekly reflection — side-by-side grid
 *   4. Weekly reflections archive — past weeks this month (accordion)
 *   5. Daily practice playlist — inline playback, no /library navigation
 */

export const metadata = {
  title: "Today's Practice — Positives",
  description: "Your daily grounding practice from Dr. Paul.",
};

export default async function TodayPage() {
  const member = await requireActiveMember();
  const supabase = await createClient();

  const effectiveDateStr = getEffectiveDate();
  const effectiveMonthYear = getEffectiveMonthYear();

  const [todayContent, weeklyContent, monthlyContent, monthGroups, monthWeekly, memberRow] =
    await Promise.all([
      getTodayContent(),
      getWeeklyContent(),
      getMonthlyContent(),
      getMonthlyDailyAudios(effectiveDateStr),
      getMonthWeeklyContent(effectiveMonthYear),
      supabase
        .from("member")
        .select("practice_streak, last_practiced_at")
        .eq("id", member.id)
        .single()
        .then((r) => r.data),
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

  const [noteContentIds, listenedToday] = await Promise.all([
    contentIds.length > 0
      ? getMemberNoteContentIds(member.id)
      : Promise.resolve(new Set<string>()),
    todayContent
      ? supabase
          .from("activity_event")
          .select("id")
          .eq("member_id", member.id)
          .eq("event_type", "daily_listened")
          .eq("content_id", todayContent.id)
          .limit(1)
          .maybeSingle()
          .then((r) => !!r.data)
      : Promise.resolve(false),
  ]);

  // Only show a non-zero streak if the member practiced today or yesterday.
  // If they missed a day the DB value is stale — display 0 until they listen again.
  const streak = isStreakActive(memberRow?.last_practiced_at, effectiveDateStr)
    ? (memberRow?.practice_streak ?? 0)
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
            </div>

            <div className="flex shrink-0 flex-col items-end gap-2">
              <StreakBadge initialStreak={streak} />
              <TodayListenStatusBadge
                initialHasListened={listenedToday}
                contentId={todayContent?.id ?? null}
              />
            </div>
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
          initialHasNote={todayContent ? noteContentIds.has(todayContent.id) : false}
        />

        {/* ── Zone 2: Monthly theme + Weekly reflection ─────────────── */}
        <section aria-label="This month and this week" className="flex flex-col gap-3">
          <div className="grid gap-5 lg:grid-cols-2">
            {/* Monthly video — left on desktop */}
            <div className="flex flex-col gap-2">
              <span
                className="text-[10px] font-bold uppercase tracking-[0.14em]"
                style={{ color: "var(--color-accent)" }}
              >
                {currentMonthName}&apos;s Theme
              </span>
              <MonthlyThemeCard
                content={monthlyContent}
                initialHasNote={
                  monthlyContent ? noteContentIds.has(monthlyContent.id) : false
                }
                viewerUserId={member.id}
              />
            </div>

            {/* Weekly reflection — right on desktop */}
            <div className="flex flex-col gap-2">
              <span
                className="text-[10px] font-bold uppercase tracking-[0.14em]"
                style={{ color: "var(--color-secondary)" }}
              >
                Week {weekOfMonth} Reflection
              </span>
              <WeeklyPrincipleCard
                content={weeklyContent}
                audioUrl={weeklyAudioUrl}
                initialHasNote={
                  weeklyContent ? noteContentIds.has(weeklyContent.id) : false
                }
              />
            </div>
          </div>
        </section>

        {/* ── Zone 3: Weekly reflections archive ────────────────────── */}
        <WeeklyArchive
          weeks={monthWeekly}
          currentWeekStart={weeklyContent?.week_start ?? null}
        />

        {/* ── Zone 4: Daily practice playlist (inline) ──────────────── */}
        {monthGroups.length > 0 && (
          <MonthlyAudioArchive monthGroups={monthGroups} currentMonthName={currentMonthName} />
        )}
      </div>
    </div>
  );
}
