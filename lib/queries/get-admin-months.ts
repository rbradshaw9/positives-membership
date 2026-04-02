import { createClient } from "@supabase/supabase-js";

/**
 * lib/queries/get-admin-months.ts
 * Fetches all monthly_practice rows with content counts and inline stats
 * for the admin month list page.
 *
 * Uses service-role client (admin only — RLS bypass).
 */

export type AdminMonth = {
  id: string;
  month_year: string;
  label: string;
  status: string;
  description: string | null;
  admin_notes: string | null;
  created_at: string;
  // Content counts
  daily_count: number;
  daily_published: number;
  daily_total: number; // total calendar days in the month
  weekly_count: number;
  monthly_theme_count: number;
  // Inline analytics
  unique_listeners: number;
  total_listens: number;
  total_notes: number;
};

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

/** Get the number of calendar days in a YYYY-MM month string */
function daysInMonth(monthYear: string): number {
  const [year, month] = monthYear.split("-").map(Number);
  return new Date(year, month, 0).getDate();
}

export async function getAdminMonths(): Promise<AdminMonth[]> {
  const supabase = adminClient();

  // 1. Fetch all monthly_practice rows
  const { data: months, error } = await supabase
    .from("monthly_practice")
    .select("*")
    .order("month_year", { ascending: false });

  if (error) {
    console.error("[getAdminMonths] Error fetching months:", error.message);
    return [];
  }

  if (!months || months.length === 0) return [];

  const monthIds = months.map((m) => m.id);

  // 2. Content counts per month (grouped by type + status)
  const { data: contentRows } = await supabase
    .from("content")
    .select("id, monthly_practice_id, type, status")
    .in("monthly_practice_id", monthIds);

  // 3. Activity stats: listens per month's content
  const contentIds = (contentRows ?? []).map((c) => c.id);

  const { data: activityRows } = contentIds.length > 0
    ? await supabase
        .from("activity_event")
        .select("content_id, member_id, event_type")
        .in("content_id", contentIds)
        .in("event_type", ["daily_listened", "daily_started", "weekly_viewed", "monthly_viewed"])
    : { data: [] };

  // 4. Journal entries per month's content
  const { data: journalRows } = contentIds.length > 0
    ? await supabase
        .from("journal")
        .select("content_id")
        .in("content_id", contentIds)
    : { data: [] };

  // Build lookup maps
  const contentByMonth = new Map<string, typeof contentRows>();
  const contentIdToMonth = new Map<string, string>();

  for (const row of contentRows ?? []) {
    const mpId = row.monthly_practice_id as string;
    if (!contentByMonth.has(mpId)) contentByMonth.set(mpId, []);
    contentByMonth.get(mpId)!.push(row);
    contentIdToMonth.set(row.id, mpId);
  }

  // Aggregate activity stats per month
  const listensByMonth = new Map<string, { unique: Set<string>; total: number }>();
  for (const row of activityRows ?? []) {
    const mpId = contentIdToMonth.get(row.content_id);
    if (!mpId) continue;
    if (!listensByMonth.has(mpId)) {
      listensByMonth.set(mpId, { unique: new Set(), total: 0 });
    }
    const bucket = listensByMonth.get(mpId)!;
    bucket.unique.add(row.member_id);
    bucket.total += 1;
  }

  // Aggregate journal notes per month
  const notesByMonth = new Map<string, number>();
  for (const row of journalRows ?? []) {
    const mpId = contentIdToMonth.get(row.content_id);
    if (!mpId) continue;
    notesByMonth.set(mpId, (notesByMonth.get(mpId) ?? 0) + 1);
  }

  // 5. Assemble results
  return months.map((m) => {
    const content = contentByMonth.get(m.id) ?? [];

    const dailyContent = content.filter((c) => c.type === "daily_audio");
    const weeklyContent = content.filter((c) => c.type === "weekly_principle");
    const themeContent = content.filter((c) => c.type === "monthly_theme");

    const listens = listensByMonth.get(m.id);

    return {
      id: m.id,
      month_year: m.month_year,
      label: m.label,
      status: m.status,
      description: m.description,
      admin_notes: m.admin_notes,
      created_at: m.created_at,
      daily_count: dailyContent.length,
      daily_published: dailyContent.filter((c) => c.status === "published").length,
      daily_total: daysInMonth(m.month_year),
      weekly_count: weeklyContent.length,
      monthly_theme_count: themeContent.length,
      unique_listeners: listens?.unique.size ?? 0,
      total_listens: listens?.total ?? 0,
      total_notes: notesByMonth.get(m.id) ?? 0,
    };
  });
}
