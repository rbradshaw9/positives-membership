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
 * Sprint 3 update:
 *
 * 1. Fetches practice_streak alongside content — all in a single Promise.all.
 * 2. Batch-fetches note existence for all three content items so cards
 *    immediately show "View note" vs "Reflect" without a loading state.
 * 3. Passes streak count to header for the subtle "Day X" treatment.
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

  // All queries run in parallel — no waterfall
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

  // Resolve audio URL (may be null — DailyPracticeCard handles gracefully)
  const audioUrl = todayContent
    ? await resolveAudioUrl(
        todayContent.castos_episode_url,
        todayContent.s3_audio_key
      )
    : null;

  // Batch-fetch note IDs for all content that exists
  const contentIds = [todayContent?.id, weeklyContent?.id, monthlyContent?.id].filter(
    Boolean
  ) as string[];

  const noteContentIds =
    user && contentIds.length > 0
      ? await getMemberNoteContentIds(user.id)
      : new Set<string>();

  const streak = memberRow?.practice_streak ?? 0;

  // Compute canonical Eastern date label server-side — prevents client TZ drift
  const effectiveDateStr = getEffectiveDate(); // e.g. "2026-04-01"
  const todayLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date(effectiveDateStr + "T12:00:00")); // noon to avoid TZ shift in Intl

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
        audioUrl={audioUrl}
        todayLabel={todayLabel}
        initialHasNote={todayContent ? noteContentIds.has(todayContent.id) : false}
      />

      <WeeklyPrincipleCard
        content={weeklyContent}
        initialHasNote={weeklyContent ? noteContentIds.has(weeklyContent.id) : false}
      />

      <MonthlyThemeCard
        content={monthlyContent}
        initialHasNote={monthlyContent ? noteContentIds.has(monthlyContent.id) : false}
      />
    </div>
  );
}
