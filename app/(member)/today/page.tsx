import { createClient } from "@/lib/supabase/server";
import { getTodayContent } from "@/lib/queries/get-today-content";
import { getWeeklyContent } from "@/lib/queries/get-weekly-content";
import { getMonthlyContent } from "@/lib/queries/get-monthly-content";
import { resolveAudioUrl } from "@/lib/media/resolve-audio-url";
import { getMemberNoteContentIds } from "@/lib/queries/get-library-content";
import { getEffectiveDate } from "@/lib/dates/effective-date";
import { DailyPracticeCard } from "@/components/today/DailyPracticeCard";
import { WeeklyPrincipleCard } from "@/components/today/WeeklyPrincipleCard";
import { MonthlyThemeCard } from "@/components/today/MonthlyThemeCard";

/**
 * app/(member)/today/page.tsx
 * Sprint 5 update:
 *
 * 1. Passes hasListened to DailyPracticeCard for the "Listened today" chip.
 * 2. Resolves weekly audio URL and passes to WeeklyPrincipleCard.
 * 3. All queries run in parallel — no waterfall.
 */

export const metadata = {
  title: "Today's Practice — Positives",
  description: "Your daily grounding practice from Dr. Paul.",
};

export default async function TodayPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const effectiveDateStr = getEffectiveDate(); // e.g. "2026-04-01"

  // All content queries run in parallel
  const [todayContent, weeklyContent, monthlyContent, memberRow] =
    await Promise.all([
      getTodayContent(),
      getWeeklyContent(),
      getMonthlyContent(),
      user
        ? supabase
            .from("member")
            .select("practice_streak")
            .eq("id", user.id)
            .single()
            .then((r) => r.data)
        : Promise.resolve(null),
    ]);

  // Resolve audio URLs for Daily and Weekly (may be null)
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
    user && contentIds.length > 0
      ? getMemberNoteContentIds(user.id)
      : Promise.resolve(new Set<string>()),
    // Check if member has a daily_listened event for today's content
    user && todayContent
      ? supabase
          .from("activity_event")
          .select("id")
          .eq("member_id", user.id)
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

  return (
    <div className="px-5 py-8 max-w-lg mx-auto flex flex-col gap-5">
      <header className="mb-2 flex items-center justify-between">
        <h1 className="font-heading font-bold text-2xl text-foreground tracking-[-0.03em]">
          Today
        </h1>
        {streak > 0 && (
          <span className="text-xs font-medium text-muted-foreground">
            Day {streak}
          </span>
        )}
      </header>

      <DailyPracticeCard
        content={todayContent}
        audioUrl={dailyAudioUrl}
        todayLabel={todayLabel}
        hasListened={listenedToday}
        initialHasNote={todayContent ? noteContentIds.has(todayContent.id) : false}
      />

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
  );
}
