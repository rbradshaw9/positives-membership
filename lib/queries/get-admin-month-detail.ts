import { createClient } from "@supabase/supabase-js";
import { hasPlaceholderSignals } from "@/lib/content/member-content-visibility";

/**
 * lib/queries/get-admin-month-detail.ts
 * Fetches a single monthly_practice with all child content (grouped by type),
 * daily slot grid, and per-item inline stats for the Month Workspace page.
 *
 * Uses service-role client (admin only — RLS bypass).
 */

export type ContentItem = {
  id: string;
  title: string;
  status: string;
  type: string;
  publish_date: string | null;
  week_start: string | null;
  excerpt: string | null;
  // Inline stats
  listens: number;
  views: number;
  notes: number;
};

export type DailySlot = {
  date: string; // "2026-04-01"
  dayOfMonth: number;
  weekday: string; // "Tue"
  content: ContentItem | null;
};

export type MonthDetail = {
  id: string;
  month_year: string;
  label: string;
  status: string;
  description: string | null;
  admin_notes: string | null;
  // Content sections
  theme: ContentItem | null;
  weeklyReflections: ContentItem[];
  dailySlots: DailySlot[];
  // Aggregate stats
  stats: {
    unique_listeners: number;
    total_listens: number;
    total_notes: number;
    active_members: number;
  };
};

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Generate all calendar dates for a YYYY-MM month */
function generateDailySlots(monthYear: string): Omit<DailySlot, "content">[] {
  const [year, month] = monthYear.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const slots: Omit<DailySlot, "content">[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d);
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    slots.push({
      date: dateStr,
      dayOfMonth: d,
      weekday: WEEKDAYS[date.getDay()],
    });
  }

  return slots;
}

export async function getAdminMonthDetail(
  monthId: string
): Promise<MonthDetail | null> {
  const supabase = adminClient();

  // 1. Fetch the monthly_practice row
  const { data: month, error } = await supabase
    .from("monthly_practice")
    .select("*")
    .eq("id", monthId)
    .single();

  if (error || !month) {
    console.error("[getAdminMonthDetail] Error:", error?.message);
    return null;
  }

  // 2. Fetch all child content
  const { data: contentRows } = await supabase
    .from("content")
    .select("id, title, status, type, publish_date, week_start, excerpt, description, tags")
    .eq("monthly_practice_id", monthId)
    .order("publish_date", { ascending: true });

  const content = (contentRows ?? []).filter((row) => !hasPlaceholderSignals(row));
  const contentIds = content.map((c) => c.id);

  // 3. Per-item activity stats (listen + view events)
  const listenMap = new Map<string, { listens: number; views: number; members: Set<string> }>();

  if (contentIds.length > 0) {
    const { data: actRows } = await supabase
      .from("activity_event")
      .select("content_id, member_id, event_type")
      .in("content_id", contentIds)
      .in("event_type", [
        "daily_listened",
        "daily_started",
        "weekly_viewed",
        "monthly_viewed",
      ]);

    for (const row of actRows ?? []) {
      if (!listenMap.has(row.content_id)) {
        listenMap.set(row.content_id, { listens: 0, views: 0, members: new Set() });
      }
      const bucket = listenMap.get(row.content_id)!;
      bucket.members.add(row.member_id);

      if (
        row.event_type === "daily_listened" ||
        row.event_type === "daily_started"
      ) {
        bucket.listens += 1;
      } else {
        bucket.views += 1;
      }
    }
  }

  // 4. Per-item journal notes
  const noteMap = new Map<string, number>();
  if (contentIds.length > 0) {
    const { data: journalRows } = await supabase
      .from("journal")
      .select("content_id")
      .in("content_id", contentIds);

    for (const row of journalRows ?? []) {
      noteMap.set(row.content_id, (noteMap.get(row.content_id) ?? 0) + 1);
    }
  }

  // 5. Map content to enriched items
  function toContentItem(row: (typeof content)[number]): ContentItem {
    const stats = listenMap.get(row.id);
    return {
      id: row.id,
      title: row.title,
      status: row.status,
      type: row.type,
      publish_date: row.publish_date,
      week_start: row.week_start,
      excerpt: row.excerpt,
      listens: stats?.listens ?? 0,
      views: stats?.views ?? 0,
      notes: noteMap.get(row.id) ?? 0,
    };
  }

  // Group by type
  const themes = content.filter((c) => c.type === "monthly_theme").map(toContentItem);
  const weeklies = content
    .filter((c) => c.type === "weekly_principle")
    .map(toContentItem)
    .sort((a, b) => (a.week_start ?? "").localeCompare(b.week_start ?? ""));
  const dailies = content.filter((c) => c.type === "daily_audio").map(toContentItem);

  // 6. Build daily slot grid
  const dailyByDate = new Map<string, ContentItem>();
  for (const d of dailies) {
    if (d.publish_date) {
      dailyByDate.set(d.publish_date, d);
    }
  }

  const slots = generateDailySlots(month.month_year);
  const dailySlots: DailySlot[] = slots.map((s) => ({
    ...s,
    content: dailyByDate.get(s.date) ?? null,
  }));

  // 7. Aggregate stats
  const allMembers = new Set<string>();
  let totalListens = 0;
  let totalNotes = 0;

  for (const [, bucket] of listenMap) {
    totalListens += bucket.listens;
    for (const m of bucket.members) allMembers.add(m);
  }
  for (const [, count] of noteMap) totalNotes += count;

  return {
    id: month.id,
    month_year: month.month_year,
    label: month.label,
    status: month.status,
    description: month.description,
    admin_notes: month.admin_notes,
    theme: themes[0] ?? null,
    weeklyReflections: weeklies,
    dailySlots,
    stats: {
      unique_listeners: allMembers.size,
      total_listens: totalListens,
      total_notes: totalNotes,
      active_members: allMembers.size,
    },
  };
}

/**
 * Fetches unassigned daily_audio content rows — those without a
 * publish_date or monthly_practice_id. Used by the assign picker.
 */
export async function getUnassignedDailyAudios(): Promise<
  { id: string; title: string; created_at: string }[]
> {
  const supabase = adminClient();

  const { data, error } = await supabase
    .from("content")
    .select("id, title, created_at, excerpt, description, tags")
    .eq("type", "daily_audio")
    .is("monthly_practice_id", null)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("[getUnassignedDailyAudios] Error:", error.message);
    return [];
  }

  return (data ?? [])
    .filter((row) => !hasPlaceholderSignals(row))
    .map(({ id, title, created_at }) => ({ id, title, created_at }));
}
