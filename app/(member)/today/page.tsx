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
import { SectionLabel } from "@/components/member/SectionLabel";

/**
 * app/(member)/today/page.tsx
 * Homepage redesign: super-simple, focused layout.
 *
 *   1. Hero — greeting + date + monthly theme context + inline streak
 *   2. Today's Practice — dominant card (daily audio)
 *   3. This Week + This Month — side-by-side compact cards
 *
 * Removed from homepage (moved to My Practice):
 *   - Continue Listening
 *   - Recently Completed
 *   - Suggested Next
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

  // Determine which week of the month this is (for the "Week X of Month" label)
  const effectiveDate = new Date(effectiveDateStr + "T12:00:00");
  const currentMonthName = new Intl.DateTimeFormat("en-US", { month: "long" }).format(
    effectiveDate
  );
  const dayOfMonth = effectiveDate.getDate();
  const weekOfMonth = Math.ceil(dayOfMonth / 7);

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
          <p className="ui-section-eyebrow mb-3">{todayLabel}</p>
          <h1 className="heading-balance font-heading font-bold text-3xl md:text-4xl text-foreground tracking-[-0.035em] leading-tight mb-2">
            {greeting}
          </h1>

          {/* Monthly context — anchors the hero */}
          {monthlyContent ? (
            <p className="max-w-2xl text-base text-muted-foreground leading-body">
              <span className="font-semibold text-accent">
                {currentMonthName}: {monthlyContent.title}
              </span>
              {" — "}
              {todayContent
                ? "your daily practice is ready."
                : "your practice will be here soon."}
            </p>
          ) : (
            <p className="max-w-2xl text-base text-muted-foreground leading-body">
              {todayContent
                ? "Your daily practice is ready. Start here, then carry the rhythm into the rest of your week."
                : "Your practice will be here soon — come back a little later."}
            </p>
          )}

          {/* Inline streak */}
          <div className="mt-4 flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
              style={{
                background:
                  streak > 0
                    ? "color-mix(in srgb, var(--color-accent) 12%, transparent)"
                    : "var(--color-muted)",
                color: streak > 0 ? "var(--color-accent)" : "var(--color-muted-fg)",
                border:
                  streak > 0
                    ? "1px solid color-mix(in srgb, var(--color-accent) 22%, transparent)"
                    : "1px solid var(--color-border)",
              }}
            >
              🔥 {streak}-day streak
              {streak > 0 && (
                <span className="text-[10px] font-normal opacity-70">
                  and counting
                </span>
              )}
            </span>
          </div>
        </div>
      </section>

      {/* ── Content stream ───────────────────────────────────────────── */}
      <div className="member-container py-8 flex flex-col gap-6">
        {/* Today's Practice — dominant card, always first */}
        <section aria-labelledby="today-practice" className="flex flex-col gap-3">
          <div>
            <SectionLabel id="today-practice">Today&apos;s Practice</SectionLabel>
            <p className="max-w-2xl text-sm leading-body text-muted-foreground">
              Start here — your daily grounding for today.
            </p>
          </div>

          <DailyPracticeCard
            content={todayContent}
            audioUrl={dailyAudioUrl}
            todayLabel={todayLabel}
            hasListened={listenedToday}
            initialHasNote={todayContent ? noteContentIds.has(todayContent.id) : false}
          />
        </section>

        {/* Weekly + Monthly — side-by-side on desktop, stacked on mobile */}
        <section className="grid gap-5 lg:grid-cols-2">
          <div className="flex flex-col gap-3">
            <div>
              <SectionLabel>This Week</SectionLabel>
              <p className="text-xs text-muted-foreground">
                Week {weekOfMonth} of {currentMonthName}
              </p>
            </div>
            <WeeklyPrincipleCard
              content={weeklyContent}
              audioUrl={weeklyAudioUrl}
              initialHasNote={weeklyContent ? noteContentIds.has(weeklyContent.id) : false}
            />
          </div>

          <div className="flex flex-col gap-3">
            <div>
              <SectionLabel>This Month</SectionLabel>
              <p className="text-xs text-muted-foreground">
                {currentMonthName}&apos;s guiding theme
              </p>
            </div>
            <MonthlyThemeCard
              content={monthlyContent}
              initialHasNote={monthlyContent ? noteContentIds.has(monthlyContent.id) : false}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
