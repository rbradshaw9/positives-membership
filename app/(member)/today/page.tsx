import { createClient } from "@/lib/supabase/server";
import { getTodayContent } from "@/lib/queries/get-today-content";
import { getWeeklyContent } from "@/lib/queries/get-weekly-content";
import { getMonthlyContent } from "@/lib/queries/get-monthly-content";
import { resolveAudioUrl } from "@/lib/media/resolve-audio-url";
import { getMemberNoteContentIds } from "@/lib/queries/get-library-content";
import { getMemberListeningInsights } from "@/lib/queries/get-member-listening-insights";
import { getEffectiveDate } from "@/lib/dates/effective-date";
import { getGreeting } from "@/lib/greeting";
import { requireActiveMember } from "@/lib/auth/require-active-member";
import { DailyPracticeCard } from "@/components/today/DailyPracticeCard";
import { WeeklyPrincipleCard } from "@/components/today/WeeklyPrincipleCard";
import { MonthlyThemeCard } from "@/components/today/MonthlyThemeCard";
import { ContinueListeningCard } from "@/components/today/ContinueListeningCard";
import { TypeBadge } from "@/components/member/TypeBadge";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

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

  const listeningInsights = await getMemberListeningInsights(
    member.id,
    member.subscription_tier,
    todayContent?.id
  );

  const [dailyAudioUrl, weeklyAudioUrl, continueAudioUrl] = await Promise.all([
    todayContent
      ? resolveAudioUrl(todayContent.castos_episode_url, todayContent.s3_audio_key)
      : Promise.resolve(null),
    weeklyContent
      ? resolveAudioUrl(weeklyContent.castos_episode_url, weeklyContent.s3_audio_key)
      : Promise.resolve(null),
    listeningInsights.continueListening
      ? resolveAudioUrl(
          listeningInsights.continueListening.castos_episode_url,
          listeningInsights.continueListening.s3_audio_key
        )
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
  const suggestedNext = listenedToday ? listeningInsights.suggestedNext : null;

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
        {listeningInsights.continueListening && (
          <ContinueListeningCard
            contentId={listeningInsights.continueListening.id}
            contentType={listeningInsights.continueListening.type}
            title={listeningInsights.continueListening.title}
            description={
              listeningInsights.continueListening.excerpt ??
              listeningInsights.continueListening.description
            }
            audioUrl={continueAudioUrl}
            durationLabel={
              listeningInsights.continueListening.duration_seconds
                ? `${Math.floor(listeningInsights.continueListening.duration_seconds / 60)}:${String(
                    listeningInsights.continueListening.duration_seconds % 60
                  ).padStart(2, "0")}`
                : "—"
            }
          />
        )}

        {/* Daily card */}
        <DailyPracticeCard
          content={todayContent}
          audioUrl={dailyAudioUrl}
          todayLabel={todayLabel}
          hasListened={listenedToday}
          initialHasNote={todayContent ? noteContentIds.has(todayContent.id) : false}
        />

        {(listeningInsights.recentlyCompleted.length > 0 || suggestedNext) && (
          <section className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            {listeningInsights.recentlyCompleted.length > 0 && (
              <article className="surface-card p-5 md:p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="ui-section-eyebrow mb-2">Recently Completed</p>
                    <h2 className="heading-balance font-heading text-xl font-semibold tracking-[-0.02em] text-foreground">
                      Practices you&apos;ve finished lately
                    </h2>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  {listeningInsights.recentlyCompleted.map((item) => (
                    <Link
                      key={item.id}
                      href={`/library/${item.id}`}
                      className="group flex items-center justify-between gap-3 rounded-2xl border border-border bg-background px-4 py-3 transition-colors hover:border-primary/25 hover:bg-primary/5"
                    >
                      <div className="min-w-0">
                        <div className="mb-2 flex items-center gap-2">
                          <TypeBadge type={item.type} size="xs" />
                          {item.listenedAt ? (
                            <span className="text-xs text-muted-foreground">
                              {new Intl.DateTimeFormat("en-US", {
                                month: "short",
                                day: "numeric",
                              }).format(new Date(item.listenedAt))}
                            </span>
                          ) : null}
                        </div>
                        <p className="truncate text-sm font-semibold text-foreground">
                          {item.title}
                        </p>
                        {(item.excerpt ?? item.description) && (
                          <p className="mt-1 line-clamp-2 text-sm leading-body text-muted-foreground">
                            {item.excerpt ?? item.description}
                          </p>
                        )}
                      </div>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                        className="flex-shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
                      >
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </Link>
                  ))}
                </div>
              </article>
            )}

            {suggestedNext && (
              <article className="surface-card surface-card--tint p-5 md:p-6">
                <p className="ui-section-eyebrow mb-2">Next Recommended Practice</p>
                <h2 className="heading-balance font-heading text-xl font-semibold tracking-[-0.02em] text-foreground">
                  {suggestedNext.title}
                </h2>
                {(suggestedNext.excerpt ?? suggestedNext.description) && (
                  <p className="mt-2 text-sm leading-body text-muted-foreground">
                    {suggestedNext.excerpt ?? suggestedNext.description}
                  </p>
                )}

                <div className="mt-4 flex items-center gap-2">
                  <TypeBadge type={suggestedNext.type} size="xs" />
                  {suggestedNext.duration_seconds ? (
                    <span className="text-xs text-muted-foreground">
                      {Math.max(1, Math.round(suggestedNext.duration_seconds / 60))} min
                    </span>
                  ) : null}
                </div>

                <Button href={`/library/${suggestedNext.id}`} className="mt-5">
                  Explore next practice
                </Button>
              </article>
            )}
          </section>
        )}

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
