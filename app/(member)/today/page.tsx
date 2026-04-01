import { createClient } from "@/lib/supabase/server";
import { getTodayContent } from "@/lib/queries/get-today-content";
import { getWeeklyContent } from "@/lib/queries/get-weekly-content";
import { getMonthlyContent } from "@/lib/queries/get-monthly-content";
import { resolveAudioUrl } from "@/lib/media/resolve-audio-url";
import { getMemberNoteContentIds } from "@/lib/queries/get-library-content";
import { getEffectiveDate } from "@/lib/dates/effective-date";
import { getGreeting } from "@/lib/greeting";
import { requireActiveMember } from "@/lib/auth/require-active-member";
import { DailyPracticeCard } from "@/components/today/DailyPracticeCard";
import { WeeklyPrincipleCard } from "@/components/today/WeeklyPrincipleCard";
import { MonthlyThemeCard } from "@/components/today/MonthlyThemeCard";

/**
 * app/(member)/today/page.tsx
 * Sprint 7: personalized time-aware greeting, wider container, subtle
 * background glow, visual separator between Daily and Weekly/Monthly.
 */

export const metadata = {
  title: "Today's Practice — Positives",
  description: "Your daily grounding practice from Dr. Paul.",
};

export default async function TodayPage() {
  const member = await requireActiveMember();
  const supabase = await createClient();

  const effectiveDateStr = getEffectiveDate();

  // All content queries run in parallel
  const [todayContent, weeklyContent, monthlyContent, memberRow] =
    await Promise.all([
      getTodayContent(),
      getWeeklyContent(),
      getMonthlyContent(),
      supabase
        .from("member")
        .select("practice_streak")
        .eq("id", member.id)
        .single()
        .then((r) => r.data),
    ]);

  // Resolve audio URLs
  const [dailyAudioUrl, weeklyAudioUrl] = await Promise.all([
    todayContent
      ? resolveAudioUrl(todayContent.castos_episode_url, todayContent.s3_audio_key)
      : Promise.resolve(null),
    weeklyContent
      ? resolveAudioUrl(weeklyContent.castos_episode_url, weeklyContent.s3_audio_key)
      : Promise.resolve(null),
  ]);

  // Batch-fetch note existence + listened status
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

  const streak = memberRow?.practice_streak ?? 0;

  const todayLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date(effectiveDateStr + "T12:00:00"));

  const greeting = getGreeting(member.name);

  return (
    <div className="relative">
      {/* Subtle radial glow behind the daily card area */}
      <div
        aria-hidden="true"
        className="absolute top-0 left-0 right-0 h-[400px] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(47,111,237,0.05) 0%, transparent 70%)",
        }}
      />

      <div className="relative px-5 pt-10 pb-4 max-w-2xl mx-auto flex flex-col gap-5">
        {/* Personalized greeting */}
        <header className="mb-1">
          <h1 className="font-heading font-bold text-3xl text-foreground tracking-[-0.035em]">
            {greeting}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{todayLabel}</p>
        </header>

        <DailyPracticeCard
          content={todayContent}
          audioUrl={dailyAudioUrl}
          todayLabel={todayLabel}
          hasListened={listenedToday}
          initialHasNote={todayContent ? noteContentIds.has(todayContent.id) : false}
        />

        {/* Visual separator */}
        <div className="flex items-center gap-3 py-1">
          <div className="flex-1 h-px bg-border" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/60">
            Continue your practice
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <WeeklyPrincipleCard
          content={weeklyContent}
          audioUrl={weeklyAudioUrl}
          initialHasNote={weeklyContent ? noteContentIds.has(weeklyContent.id) : false}
        />

        <MonthlyThemeCard
          content={monthlyContent}
          initialHasNote={monthlyContent ? noteContentIds.has(monthlyContent.id) : false}
        />
      </div>
    </div>
  );
}
