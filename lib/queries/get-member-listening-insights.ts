import { checkTierAccess } from "@/lib/auth/check-tier-access";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/supabase";

type InsightContentItem = Pick<
  Tables<"content">,
  | "id"
  | "type"
  | "title"
  | "excerpt"
  | "description"
  | "castos_episode_url"
  | "s3_audio_key"
  | "vimeo_video_id"
  | "youtube_video_id"
  | "duration_seconds"
  | "publish_date"
  | "week_start"
  | "month_year"
  | "tier_min"
  | "status"
>;

export type MemberListeningInsightItem = Omit<InsightContentItem, "tier_min" | "status"> & {
  listenedAt?: string;
};

export type MemberListeningInsights = {
  continueListening: MemberListeningInsightItem | null;
  recentlyCompleted: MemberListeningInsightItem[];
  suggestedNext: MemberListeningInsightItem | null;
};

const INSIGHT_CONTENT_SELECT =
  "id, type, title, excerpt, description, castos_episode_url, s3_audio_key, vimeo_video_id, youtube_video_id, duration_seconds, publish_date, week_start, month_year, tier_min, status";

const NEXT_TYPE_BY_RECENT: Record<string, Tables<"content">["type"]> = {
  daily_audio: "weekly_principle",
  weekly_principle: "monthly_theme",
  monthly_theme: "daily_audio",
  coaching_call: "daily_audio",
  library: "daily_audio",
  workshop: "daily_audio",
};

function toInsightItem(
  item: InsightContentItem,
  listenedAt?: string
): MemberListeningInsightItem {
  return {
    id: item.id,
    type: item.type,
    title: item.title,
    excerpt: item.excerpt,
    description: item.description,
    castos_episode_url: item.castos_episode_url,
    s3_audio_key: item.s3_audio_key,
    vimeo_video_id: item.vimeo_video_id,
    youtube_video_id: item.youtube_video_id,
    duration_seconds: item.duration_seconds,
    publish_date: item.publish_date,
    week_start: item.week_start,
    month_year: item.month_year,
    listenedAt,
  };
}

function dedupeByContentId(
  rows: Array<{ content_id: string; listened_at: string }>
): Array<{ content_id: string; listened_at: string }> {
  const seen = new Set<string>();
  const deduped: Array<{ content_id: string; listened_at: string }> = [];

  for (const row of rows) {
    if (seen.has(row.content_id)) continue;
    seen.add(row.content_id);
    deduped.push(row);
  }

  return deduped;
}

export async function getMemberListeningInsights(
  memberId: string,
  memberTier: string | null,
  todayContentId?: string | null
): Promise<MemberListeningInsights> {
  const supabase = await createClient();

  const [incompleteRowsResult, completedRowsResult] = await Promise.all([
    supabase
      .from("progress")
      .select("content_id, listened_at")
      .eq("member_id", memberId)
      .eq("completed", false)
      .order("listened_at", { ascending: false })
      .limit(8),
    supabase
      .from("progress")
      .select("content_id, listened_at")
      .eq("member_id", memberId)
      .eq("completed", true)
      .order("listened_at", { ascending: false })
      .limit(12),
  ]);

  const incompleteRows = (incompleteRowsResult.data ?? []).filter(
    (row): row is { content_id: string; listened_at: string } => !!row.content_id
  );
  const completedRows = dedupeByContentId(
    (completedRowsResult.data ?? []).filter(
      (row): row is { content_id: string; listened_at: string } => !!row.content_id
    )
  );

  const allKnownIds = Array.from(
    new Set(
      [...incompleteRows, ...completedRows]
        .map((row) => row.content_id)
        .filter(Boolean)
    )
  );

  const contentById = new Map<string, InsightContentItem>();

  if (allKnownIds.length > 0) {
    const { data: knownContent } = await supabase
      .from("content")
      .select(INSIGHT_CONTENT_SELECT)
      .in("id", allKnownIds)
      .eq("status", "published");

    for (const item of knownContent ?? []) {
      if (!checkTierAccess(memberTier, item.tier_min)) continue;
      contentById.set(item.id, item);
    }
  }

  const continueListening =
    incompleteRows
      .map((row) => {
        const content = contentById.get(row.content_id);
        if (!content) return null;
        return toInsightItem(content, row.listened_at ?? undefined);
      })
      .find(Boolean) ?? null;

  const recentlyCompleted = completedRows
    .map((row) => {
      const content = contentById.get(row.content_id);
      if (!content) return null;
      return toInsightItem(content, row.listened_at ?? undefined);
    })
    .filter((item): item is MemberListeningInsightItem => !!item)
    .slice(0, 3);

  const mostRecentType = recentlyCompleted[0]?.type ?? "daily_audio";
  const rotatedType = NEXT_TYPE_BY_RECENT[mostRecentType] ?? "daily_audio";
  const excludedIds = new Set<string>(
    [todayContentId ?? null, ...recentlyCompleted.map((item) => item.id)].filter(Boolean) as string[]
  );

  const suggestionTypeOrder = [
    rotatedType,
    "daily_audio",
    "weekly_principle",
    "monthly_theme",
  ].filter(
    (type, index, allTypes): type is Tables<"content">["type"] =>
      allTypes.indexOf(type) === index
  );

  let suggestedNext: MemberListeningInsightItem | null = null;

  for (const type of suggestionTypeOrder) {
    const { data } = await supabase
      .from("content")
      .select(INSIGHT_CONTENT_SELECT)
      .eq("type", type)
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(12);

    const match = (data ?? []).find((item) => {
      if (excludedIds.has(item.id)) return false;
      return checkTierAccess(memberTier, item.tier_min);
    });

    if (match) {
      suggestedNext = toInsightItem(match);
      break;
    }
  }

  return {
    continueListening,
    recentlyCompleted,
    suggestedNext,
  };
}
