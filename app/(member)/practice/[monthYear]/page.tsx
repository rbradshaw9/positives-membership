import { notFound, permanentRedirect, redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireActiveMember } from "@/lib/auth/require-active-member";
import { getEffectiveMonthYear } from "@/lib/dates/effective-date";

/**
 * app/(member)/practice/[monthYear]/page.tsx
 *
 * Legacy month archive route.
 *
 * Closed-month archives now live at /library/months/[monthYear].
 * We keep this route only to redirect existing links and bookmarks.
 */

interface Props {
  params: Promise<{ monthYear: string }>;
}

/** "2026-03" → "March 2026" */
function monthYearToLabel(monthYear: string): string {
  const [year, month] = monthYear.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(
    new Date(year, month - 1, 1)
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { monthYear } = await params;
  const label = /^\d{4}-\d{2}$/.test(monthYear) ? monthYearToLabel(monthYear) : "Practice Archive";
  return {
    title: `${label} Practice — Positives`,
    description: `Legacy month archive route for ${label}.`,
  };
}

export default async function PracticeArchivePage({ params }: Props) {
  await requireActiveMember();

  const { monthYear } = await params;

  if (!/^\d{4}-\d{2}$/.test(monthYear)) {
    notFound();
  }

  const currentMonthYear = getEffectiveMonthYear();
  if (monthYear === currentMonthYear) {
    redirect("/today");
  }

  permanentRedirect(`/library/months/${monthYear}`);
}
