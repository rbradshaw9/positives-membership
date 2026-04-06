import { createClient } from "@supabase/supabase-js";

/**
 * lib/queries/get-content-readiness.ts
 * Server-side query that generates admin readiness alerts.
 *
 * Checks:
 * 1. Is there a daily audio published for tomorrow?
 * 2. How many dailies remain for the rest of the current month?
 * 3. Is there a weekly reflection for the upcoming week?
 * 4. Does next month's monthly_practice exist?
 * 5. Does next month have a masterclass (monthly_theme)?
 */

export type ReadinessAlert = {
  level: "critical" | "warning" | "info";
  message: string;
  href: string;
};

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

/** Get the Monday of the week containing a given date (ISO) */
function getMondayOfWeek(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().slice(0, 10);
}

export async function getContentReadiness(): Promise<ReadinessAlert[]> {
  const supabase = adminClient();
  const alerts: ReadinessAlert[] = [];

  // Current date in Eastern
  const now = new Date();
  const eastern = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  // Parse MM/DD/YYYY → YYYY-MM-DD
  const [month, day, year] = eastern.split("/");
  const todayStr = `${year}-${month}-${day}`;
  const todayDate = new Date(`${todayStr}T12:00:00`);

  // Tomorrow
  const tomorrowDate = new Date(todayDate);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = tomorrowDate.toISOString().slice(0, 10);

  // Current month YYYY-MM
  const currentMonthYear = todayStr.slice(0, 7);

  // Next month YYYY-MM
  const nextMonthDate = new Date(todayDate);
  nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
  const nextMonthYear = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, "0")}`;

  // ── Check 1: Daily audio for tomorrow ─────────────────────────────────

  const { data: tomorrowDaily } = await supabase
    .from("content")
    .select("id")
    .eq("type", "daily_audio")
    .eq("status", "published")
    .eq("publish_date", tomorrowStr)
    .limit(1);

  if (!tomorrowDaily || tomorrowDaily.length === 0) {
    alerts.push({
      level: "critical",
      message: `No daily practice scheduled for tomorrow (${tomorrowDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })})`,
      href: `/admin/months`,
    });
  }

  // ── Check 2: Remaining dailies this month ──────────────────────────────

  const daysInMonth = new Date(
    todayDate.getFullYear(),
    todayDate.getMonth() + 1,
    0
  ).getDate();
  const remainingDays = daysInMonth - todayDate.getDate();

  if (remainingDays > 0) {
    const { count } = await supabase
      .from("content")
      .select("id", { count: "exact", head: true })
      .eq("type", "daily_audio")
      .eq("status", "published")
      .gte("publish_date", tomorrowStr)
      .lte("publish_date", `${currentMonthYear}-${String(daysInMonth).padStart(2, "0")}`);

    const filled = count ?? 0;
    const missing = remainingDays - filled;

    if (missing > 0 && missing >= remainingDays * 0.5) {
      alerts.push({
        level: "warning",
        message: `Only ${filled} of ${remainingDays} remaining daily practices scheduled for ${todayDate.toLocaleDateString("en-US", { month: "long" })}`,
        href: `/admin/months`,
      });
    }
  }

  // ── Check 3: Weekly reflection for upcoming week ───────────────────────

  const nextMonday = getMondayOfWeek(tomorrowStr);
  // Check if we're approaching next week (within 2 days of next Monday)
  const nextMondayDate = new Date(nextMonday + "T12:00:00");
  const daysUntilMonday = Math.round(
    (nextMondayDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysUntilMonday <= 2 && daysUntilMonday >= 0) {
    const { data: weeklyContent } = await supabase
      .from("content")
      .select("id")
      .eq("type", "weekly_principle")
      .eq("status", "published")
      .eq("week_start", nextMonday)
      .limit(1);

    if (!weeklyContent || weeklyContent.length === 0) {
      alerts.push({
        level: "warning",
        message: `No weekly reflection set for the week of ${nextMondayDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
        href: `/admin/months`,
      });
    }
  }

  // ── Check 4: Next month exists ─────────────────────────────────────────

  const { data: nextMonth } = await supabase
    .from("monthly_practice")
    .select("id, status")
    .eq("month_year", nextMonthYear)
    .maybeSingle();

  if (!nextMonth) {
    alerts.push({
      level: "info",
      message: `${nextMonthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })} doesn't exist yet — create it to start filling content`,
      href: `/admin/months`,
    });
  } else {
    // ── Check 5: Next month has a masterclass ────────────────────────────

    const { data: masterclass } = await supabase
      .from("content")
      .select("id")
      .eq("type", "monthly_theme")
      .eq("monthly_practice_id", nextMonth.id)
      .limit(1);

    if (!masterclass || masterclass.length === 0) {
      alerts.push({
        level: "warning",
        message: `${nextMonthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })} has no monthly masterclass`,
        href: `/admin/months/${nextMonth.id}`,
      });
    }
  }

  return alerts;
}
