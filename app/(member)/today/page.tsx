import { getTodayContent } from "@/lib/queries/get-today-content";
import { DailyPracticeCard } from "@/components/today/DailyPracticeCard";
import { WeeklyPrincipleCard } from "@/components/today/WeeklyPrincipleCard";
import { MonthlyThemeCard } from "@/components/today/MonthlyThemeCard";

/**
 * app/(member)/today/page.tsx
 * The primary daily practice page — Milestone 02.
 *
 * Server Component: fetches latest active daily_audio from Supabase.
 * DailyPracticeCard handles both real content and no-content states.
 * Layout is calm and mobile-first; Today's Practice is always primary.
 */
export const metadata = {
  title: "Today's Practice — Positives",
  description: "Your daily grounding practice from Dr. Paul.",
};

export default async function TodayPage() {
  const todayContent = await getTodayContent();

  return (
    <div className="px-5 py-8 max-w-lg mx-auto flex flex-col gap-5">
      <header className="mb-2">
        <h1 className="font-heading font-bold text-2xl text-foreground tracking-[-0.03em]">
          Today
        </h1>
      </header>

      {/* Daily practice — always visually dominant, real data or graceful empty */}
      <DailyPracticeCard content={todayContent} />

      {/* Secondary rhythm context — placeholders until content pipeline wired */}
      <WeeklyPrincipleCard />
      <MonthlyThemeCard />
    </div>
  );
}
