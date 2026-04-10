import { getAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getEffectiveMonthYear } from "@/lib/dates/effective-date";

/**
 * lib/queries/get-monthly-archive.ts
 *
 * Fetches published monthly_practice records for the Library archive.
 * Rolling 12-month window of closed months only — the active month lives on /today.
 */

export type MonthArchiveItem = {
  id: string;
  month_year: string;
  label: string;
  description: string | null;
  daily_count: number;
  weekly_count: number;
  has_theme: boolean;
};

export type MonthDetail = {
  practice: {
    id: string;
    month_year: string;
    label: string;
    description: string | null;
  };
  theme: {
    id: string;
    title: string;
    description: string | null;
    excerpt: string | null;
    body: string | null;
    vimeo_video_id: string | null;
    youtube_video_id: string | null;
    download_url: string | null;
    resource_links: unknown;
    reflection_prompt: string | null;
    month_year: string | null;
  } | null;
  weekly_content: Array<{
    id: string;
    title: string;
    excerpt: string | null;
    week_start: string | null;
  }>;
  daily_count: number;
};

// ─── Archive list (library dashboard) ────────────────────────────────────────

export async function getMonthlyArchive(months = 12): Promise<MonthArchiveItem[]> {
  const supabase = getAdminClient();
  const activeMonthYear = getEffectiveMonthYear();

  // Get last N closed months (strictly published)
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  const cutoffKey = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, "0")}`;

  const { data: practices, error } = await supabase
    .from("monthly_practice")
    .select("id, month_year, label, description")
    .eq("status", "published")
    .gte("month_year", cutoffKey)
    .lt("month_year", activeMonthYear)
    .order("month_year", { ascending: false });

  if (error || !practices || practices.length === 0) return [];

  const monthKeys = practices.map((p) => p.month_year);

  // Count content types per month
  const { data: contentCounts } = await supabase
    .from("content")
    .select("month_year, type")
    .in("month_year", monthKeys)
    .eq("status", "published");

  const dailyByMonth = new Map<string, number>();
  const weeklyByMonth = new Map<string, number>();
  const themeByMonth = new Set<string>();

  for (const row of contentCounts ?? []) {
    if (!row.month_year) continue;
    if (row.type === "daily_audio") {
      dailyByMonth.set(row.month_year, (dailyByMonth.get(row.month_year) ?? 0) + 1);
    } else if (row.type === "weekly_principle") {
      weeklyByMonth.set(row.month_year, (weeklyByMonth.get(row.month_year) ?? 0) + 1);
    } else if (row.type === "monthly_theme") {
      themeByMonth.add(row.month_year);
    }
  }

  return practices.map((p) => ({
    id: p.id,
    month_year: p.month_year,
    label: p.label,
    description: p.description,
    daily_count: dailyByMonth.get(p.month_year) ?? 0,
    weekly_count: weeklyByMonth.get(p.month_year) ?? 0,
    has_theme: themeByMonth.has(p.month_year),
  }));
}

// ─── Month detail (month detail page) ────────────────────────────────────────

export async function getMonthDetail(monthYear: string): Promise<MonthDetail | null> {
  const supabase = await createClient();

  const { data: practice, error: practiceError } = await supabase
    .from("monthly_practice")
    .select("id, month_year, label, description")
    .eq("month_year", monthYear)
    .eq("status", "published")
    .maybeSingle();

  if (practiceError || !practice) return null;

  const [themeResult, weeklyResult, dailyCountResult] = await Promise.all([
    supabase
      .from("content")
      .select("id, title, description, excerpt, body, vimeo_video_id, youtube_video_id, download_url, resource_links, reflection_prompt, month_year")
      .eq("type", "monthly_theme")
      .eq("month_year", monthYear)
      .eq("status", "published")
      .limit(1)
      .maybeSingle(),

    supabase
      .from("content")
      .select("id, title, excerpt, week_start")
      .eq("type", "weekly_principle")
      .eq("month_year", monthYear)
      .eq("status", "published")
      .order("week_start", { ascending: true }),

    supabase
      .from("content")
      .select("id", { count: "exact", head: true })
      .eq("type", "daily_audio")
      .eq("month_year", monthYear)
      .eq("status", "published"),
  ]);

  return {
    practice,
    theme: themeResult.data ?? null,
    weekly_content: weeklyResult.data ?? [],
    daily_count: dailyCountResult.count ?? 0,
  };
}
