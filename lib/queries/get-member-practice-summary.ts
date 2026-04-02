import { createClient } from "@/lib/supabase/server";

type HeatmapState = "none" | "on_time" | "catch_up";

type PracticeHeatmapCell = {
  date: string;
  state: HeatmapState;
};

export type MemberPracticeSummary = {
  practiceStreak: number;
  listenCount: number;
  journalCount: number;
  heatmap: PracticeHeatmapCell[];
};

function formatDateOnly(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export async function getMemberPracticeSummary(
  memberId: string
): Promise<MemberPracticeSummary> {
  const supabase = await createClient();

  const today = new Date();
  const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const start = addDays(todayUtc, -69);
  const startDateStr = formatDateOnly(start);

  const [memberResult, progressCountResult, journalCountResult, activityRows] =
    await Promise.all([
      supabase
        .from("member")
        .select("practice_streak")
        .eq("id", memberId)
        .single(),
      supabase
        .from("progress")
        .select("id", { count: "exact", head: true })
        .eq("member_id", memberId)
        .eq("completed", true),
      supabase
        .from("journal")
        .select("id", { count: "exact", head: true })
        .eq("member_id", memberId),
      // Fetch daily_listened events with content publish_date for 3-state heatmap.
      // We join to content via a subquery so we can compare publish_date to event date.
      supabase
        .from("activity_event")
        .select("occurred_at, content:content_id(publish_date)")
        .eq("member_id", memberId)
        .eq("event_type", "daily_listened")
        .gte("occurred_at", `${startDateStr}T00:00:00Z`)
        .order("occurred_at", { ascending: false })
        .limit(500),
    ]);

  // Build a map: date → "on_time" | "catch_up"
  // on_time:  content.publish_date === date listened (the right day!)
  // catch_up: listened on a different date than the content's publish_date
  const dateStateMap = new Map<string, HeatmapState>();

  for (const row of activityRows.data ?? []) {
    if (!row.occurred_at) continue;
    const listenedDate = row.occurred_at.slice(0, 10);
    const publishDate = (row.content as { publish_date: string | null } | null)?.publish_date ?? null;
    const isOnTime = publishDate ? listenedDate === publishDate : false;
    const newState: HeatmapState = isOnTime ? "on_time" : "catch_up";

    const existing = dateStateMap.get(listenedDate);
    // on_time takes priority over catch_up if both exist for a single date
    if (!existing || (existing === "catch_up" && newState === "on_time")) {
      dateStateMap.set(listenedDate, newState);
    }
  }

  const heatmap = Array.from({ length: 70 }, (_, index) => {
    const date = formatDateOnly(addDays(start, index));
    return {
      date,
      state: dateStateMap.get(date) ?? "none",
    };
  });

  return {
    practiceStreak: memberResult.data?.practice_streak ?? 0,
    listenCount: progressCountResult.count ?? 0,
    journalCount: journalCountResult.count ?? 0,
    heatmap,
  };
}
