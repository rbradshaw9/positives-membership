import { DailyPracticeCard } from "@/components/today/DailyPracticeCard";
import { WeeklyPrincipleCard } from "@/components/today/WeeklyPrincipleCard";
import { MonthlyThemeCard } from "@/components/today/MonthlyThemeCard";

/**
 * app/(member)/today/page.tsx
 * The primary daily practice page — Milestone 01 shell.
 *
 * Today's Practice is always visually primary.
 * Layout is calm and mobile-first.
 * Placeholder content until the content query is wired in a later milestone.
 */
export const metadata = {
  title: "Today's Practice — Positives",
  description: "Your daily grounding practice from Dr. Paul.",
};

export default function TodayPage() {
  return (
    <div className="px-5 py-8 max-w-lg mx-auto flex flex-col gap-5">
      <header className="mb-2">
        <h1 className="font-heading font-bold text-2xl text-foreground tracking-[-0.03em]">
          Today
        </h1>
      </header>

      {/* Daily practice is visually dominant */}
      <DailyPracticeCard />

      {/* Secondary rhythm sections */}
      <WeeklyPrincipleCard />
      <MonthlyThemeCard />
    </div>
  );
}
