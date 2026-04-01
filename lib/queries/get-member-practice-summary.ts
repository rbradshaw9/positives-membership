import { createClient } from "@/lib/supabase/server";

type PracticeHeatmapCell = {
  date: string;
  active: boolean;
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

  const [memberResult, progressCountResult, journalCountResult, progressRowsResult] =
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
      supabase
        .from("progress")
        .select("listened_at")
        .eq("member_id", memberId)
        .eq("completed", true)
        .order("listened_at", { ascending: false })
        .limit(240),
    ]);

  const activeDates = new Set(
    (progressRowsResult.data ?? [])
      .map((row) => row.listened_at?.slice(0, 10))
      .filter(Boolean) as string[]
  );

  const today = new Date();
  const start = addDays(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())), -69);

  const heatmap = Array.from({ length: 70 }, (_, index) => {
    const date = formatDateOnly(addDays(start, index));
    return {
      date,
      active: activeDates.has(date),
    };
  });

  return {
    practiceStreak: memberResult.data?.practice_streak ?? 0,
    listenCount: progressCountResult.count ?? 0,
    journalCount: journalCountResult.count ?? 0,
    heatmap,
  };
}
