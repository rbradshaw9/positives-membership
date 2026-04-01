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
            "radial-gradient(ellipse at 60% 0%, rgba(47,111,237,0.07) 0%, transparent 65%), var(--color-card)",
        }}
      >
        <div className="member-container py-10 md:py-14">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground/70 mb-3">
            {todayLabel}
          </p>
          <h1 className="font-heading font-bold text-3xl md:text-4xl text-foreground tracking-[-0.035em] leading-tight mb-2">
            {greeting}
          </h1>
          <p className="text-base text-muted-foreground leading-body">
            {todayContent
              ? "Here's your practice for today."
              : "Your practice will be here soon — come back a little later."}
          </p>

          {/* Streak display — visible in hero on mobile (nav chip is desktop-only) */}
          {streak > 0 && (
            <div className="mt-5 inline-flex items-center gap-1.5 md:hidden">
              <span
                className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
                style={{
                  color: streak >= 7 ? "var(--color-secondary)" : "var(--color-muted-fg)",
                  background: streak >= 7
                    ? "color-mix(in srgb, var(--color-secondary) 10%, transparent)"
                    : "var(--color-muted)",
                }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2z" />
                </svg>
                Day {streak}
              </span>
            </div>
          )}
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
