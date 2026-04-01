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
 * Sprint 9: full-width hero section with personalized greeting and
 *   "Here's your practice for…" sub-line. Wider member-container layout.
 *   Cards sit in a clean content stream beneath the hero.
 */

export const metadata = {
  title: "Today's Practice — Positives",
  description: "Your daily grounding practice from Dr. Paul.",
};

export default async function TodayPage() {
  const member = await requireActiveMember();
  const supabase = await createClient();

  const effectiveDateStr = getEffectiveDate();

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

  const streak = memberRow?.practice_streak ?? 0;

  const todayLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date(effectiveDateStr + "T12:00:00"));

  const greeting = getGreeting(member.name);

  return (
    <div>
      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden border-b border-border"
        style={{
          background:
            "radial-gradient(ellipse at 12% 0%, rgba(46,196,182,0.14) 0%, transparent 48%), radial-gradient(ellipse at 88% 18%, rgba(68,168,216,0.10) 0%, transparent 40%), var(--color-card)",
        }}
      >
        <div className="member-container py-10 md:py-14">
          <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_260px] md:items-end">
            <div>
              <p className="ui-section-eyebrow mb-3">{todayLabel}</p>
              <h1 className="heading-balance font-heading font-bold text-3xl md:text-4xl text-foreground tracking-[-0.035em] leading-tight mb-2">
                {greeting}
              </h1>
              <p className="max-w-2xl text-base text-muted-foreground leading-body">
                {todayContent
                  ? "Your daily practice is ready. Start here, then carry the rhythm into the rest of your week."
                  : "Your practice will be here soon — come back a little later."}
              </p>
            </div>

            <div className="surface-card p-5">
              <p className="ui-section-eyebrow mb-2">My Rhythm</p>
              <p className="font-heading text-3xl font-bold tracking-[-0.03em] text-foreground">
                {streak}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                day streak {streak > 0 ? "and counting" : "ready to begin"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Content stream ───────────────────────────────────────────── */}
      <div className="member-container py-8 flex flex-col gap-5">
        {/* Daily card */}
        <DailyPracticeCard
          content={todayContent}
          audioUrl={dailyAudioUrl}
          todayLabel={todayLabel}
          hasListened={listenedToday}
          initialHasNote={todayContent ? noteContentIds.has(todayContent.id) : false}
        />

        {/* Separator */}
        <div className="flex items-center gap-3 py-1">
          <div className="flex-1 h-px bg-border" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/50">
            Continue your practice
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Weekly */}
        <WeeklyPrincipleCard
          content={weeklyContent}
          audioUrl={weeklyAudioUrl}
          initialHasNote={weeklyContent ? noteContentIds.has(weeklyContent.id) : false}
        />

        {/* Monthly */}
        <MonthlyThemeCard
          content={monthlyContent}
          initialHasNote={monthlyContent ? noteContentIds.has(monthlyContent.id) : false}
        />
      </div>
    </div>
  );
}
