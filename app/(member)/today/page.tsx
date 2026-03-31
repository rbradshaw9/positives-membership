import { getTodayContent } from "@/lib/queries/get-today-content";
import { resolveAudioUrl } from "@/lib/media/resolve-audio-url";
import { DailyPracticeCard } from "@/components/today/DailyPracticeCard";
import { WeeklyPrincipleCard } from "@/components/today/WeeklyPrincipleCard";
import { MonthlyThemeCard } from "@/components/today/MonthlyThemeCard";

/**
 * app/(member)/today/page.tsx
 * The primary daily practice page — Milestone 05.
 *
 * Server Component: fetches latest active daily_audio from Supabase.
 * Resolves audio URL server-side via lib/media/resolve-audio-url.ts.
 * DailyPracticeCard handles all 3 states (no content / no audio / playable).
 */
export const metadata = {
  title: "Today's Practice — Positives",
  description: "Your daily grounding practice from Dr. Paul.",
};

export default async function TodayPage() {
  const todayContent = await getTodayContent();

  // Resolve audio URL server-side so DailyPracticeCard stays a simple
  // presentational component (no async work inside it).
  const audioUrl = todayContent
    ? await resolveAudioUrl(
        todayContent.castos_episode_url,
        todayContent.s3_audio_key
      )
    : null;

  return (
    <div className="px-5 py-8 max-w-lg mx-auto flex flex-col gap-5">
      <header className="mb-2">
        <h1 className="font-heading font-bold text-2xl text-foreground tracking-[-0.03em]">
          Today
        </h1>
      </header>

      {/* Daily practice — always visually dominant, real data or graceful empty */}
      <DailyPracticeCard content={todayContent} audioUrl={audioUrl} />

      {/* Secondary rhythm context — placeholders until content pipeline wired */}
      <WeeklyPrincipleCard />
      <MonthlyThemeCard />
    </div>
  );
}
