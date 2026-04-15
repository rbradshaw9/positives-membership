import { getAdminClient } from "@/lib/supabase/admin";
import { checkTierAccess } from "@/lib/auth/check-tier-access";
import { hasActiveMemberAccess } from "@/lib/subscription/access";
import { shouldHideFromMembers } from "@/lib/content/member-content-visibility";
import { syncReminderContext } from "@/lib/activecampaign/sync";
import type { Enums, Tables } from "@/types/supabase";

type SubscriptionTier = Enums<"subscription_tier">;

type ActiveMember = Pick<
  Tables<"member">,
  "id" | "email" | "subscription_status" | "subscription_tier" | "timezone"
>;

type ReminderContentRow = Pick<
  Tables<"content">,
  | "id"
  | "title"
  | "excerpt"
  | "description"
  | "tags"
  | "publish_date"
  | "week_start"
  | "month_year"
  | "starts_at"
  | "join_url"
  | "vimeo_video_id"
  | "youtube_video_id"
  | "tier_min"
  | "send_reminders"
  | "send_replay_email"
>;

type ReminderKind =
  | "event_24h"
  | "event_1h"
  | "event_replay"
  | "coaching_24h"
  | "coaching_1h"
  | "coaching_replay";

type SessionKind = "event" | "coaching";

const REMINDER_WINDOW_MS = 15 * 60 * 1000;
const DAY_24_MS = 24 * 60 * 60 * 1000;
const HOUR_1_MS = 60 * 60 * 1000;
const REPLAY_LOOKBACK_MS = 30 * 24 * 60 * 60 * 1000;

function getSessionKind(tier: SubscriptionTier | null): SessionKind | null {
  if (tier === "level_2") return "event";
  if (tier === "level_3" || tier === "level_4") return "coaching";
  return null;
}

function getTriggerTag(kind: ReminderKind) {
  switch (kind) {
    case "event_24h":
      return "event_reminder_24h";
    case "event_1h":
      return "event_reminder_1h";
    case "event_replay":
      return "event_replay_ready";
    case "coaching_24h":
      return "coaching_reminder_24h";
    case "coaching_1h":
      return "coaching_reminder_1h";
    case "coaching_replay":
      return "coaching_replay_ready";
  }
}

function formatStartsAt(value: string, timezone: string | null | undefined) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: timezone || "UTC",
      timeZoneName: "short",
    }).format(new Date(value));
  } catch {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(new Date(value));
  }
}

function hasReplayMedia(content: ReminderContentRow) {
  return Boolean(content.vimeo_video_id || content.youtube_video_id);
}

function getUpcomingReminderKind(content: ReminderContentRow, now: number): ReminderKind | null {
  if (!content.starts_at || !content.send_reminders) return null;

  const startsAt = new Date(content.starts_at).getTime();
  const diff = startsAt - now;
  const sessionKind = getSessionKind(content.tier_min);

  if (!sessionKind) return null;

  if (diff <= DAY_24_MS && diff > DAY_24_MS - REMINDER_WINDOW_MS) {
    return sessionKind === "event" ? "event_24h" : "coaching_24h";
  }

  if (diff <= HOUR_1_MS && diff > HOUR_1_MS - REMINDER_WINDOW_MS) {
    return sessionKind === "event" ? "event_1h" : "coaching_1h";
  }

  return null;
}

async function reserveDispatch(params: {
  memberId: string;
  contentId: string;
  reminderKind: ReminderKind;
  activecampaignTag: string;
}) {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("email_reminder_dispatch")
    .upsert(
      {
        member_id: params.memberId,
        content_id: params.contentId,
        reminder_kind: params.reminderKind,
        activecampaign_tag: params.activecampaignTag,
      },
      {
        onConflict: "member_id,content_id,reminder_kind",
        ignoreDuplicates: true,
      }
    )
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(`[reminders] failed to reserve dispatch: ${error.message}`);
  }

  return data?.id ?? null;
}

async function markDispatchSent(id: string) {
  const supabase = getAdminClient();
  const { error } = await supabase
    .from("email_reminder_dispatch")
    .update({ dispatched_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    throw new Error(`[reminders] failed to mark dispatch sent: ${error.message}`);
  }
}

async function releaseDispatch(id: string) {
  const supabase = getAdminClient();
  await supabase.from("email_reminder_dispatch").delete().eq("id", id);
}

async function fetchEligibleMembers() {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("member")
    .select("id, email, subscription_status, subscription_tier, timezone")
    .in("subscription_status", ["active", "trialing"])
    .in("subscription_tier", ["level_2", "level_3", "level_4"])
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`[reminders] failed to fetch members: ${error.message}`);
  }

  return (data ?? []).filter((member) => hasActiveMemberAccess(member.subscription_status));
}

async function fetchReminderContent() {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("content")
    .select(
      "id, title, excerpt, description, tags, publish_date, week_start, month_year, starts_at, join_url, vimeo_video_id, youtube_video_id, tier_min, send_reminders, send_replay_email"
    )
    .eq("type", "coaching_call")
    .eq("status", "published")
    .in("tier_min", ["level_2", "level_3", "level_4"])
    .order("starts_at", { ascending: true, nullsFirst: false })
    .limit(200);

  if (error) {
    throw new Error(`[reminders] failed to fetch content: ${error.message}`);
  }

  return (data ?? []).filter((row) => !shouldHideFromMembers(row));
}

function chooseUpcomingContentForMember(
  member: ActiveMember,
  contentRows: ReminderContentRow[],
  now: number
) {
  return contentRows.find((content) => {
    if (!content.starts_at || !content.join_url) return false;
    if (!checkTierAccess(member.subscription_tier, content.tier_min)) return false;
    return new Date(content.starts_at).getTime() > now;
  }) ?? null;
}

function chooseReplayContentForMember(member: ActiveMember, contentRows: ReminderContentRow[], now: number) {
  const candidates = contentRows
    .filter((content) => {
      if (!content.send_replay_email) return false;
      if (!content.starts_at) return false;
      if (!hasReplayMedia(content)) return false;
      if (!checkTierAccess(member.subscription_tier, content.tier_min)) return false;
      const startsAt = new Date(content.starts_at).getTime();
      return startsAt <= now && startsAt >= now - REPLAY_LOOKBACK_MS;
    })
    .sort((a, b) => new Date(b.starts_at!).getTime() - new Date(a.starts_at!).getTime());

  return candidates[0] ?? null;
}

async function triggerReminder(params: {
  member: ActiveMember;
  content: ReminderContentRow;
  reminderKind: ReminderKind;
}) {
  const sessionKind = getSessionKind(params.content.tier_min);
  if (!sessionKind || !params.member.subscription_tier) return false;

  const triggerTag = getTriggerTag(params.reminderKind);
  const dispatchId = await reserveDispatch({
    memberId: params.member.id,
    contentId: params.content.id,
    reminderKind: params.reminderKind,
    activecampaignTag: triggerTag,
  });

  if (!dispatchId) {
    return false;
  }

  try {
    await syncReminderContext({
      email: params.member.email,
      triggerTag,
      title: params.content.title,
      startsAt: params.content.starts_at
        ? formatStartsAt(params.content.starts_at, params.member.timezone)
        : "",
      joinUrl: params.content.join_url ?? undefined,
      replayUrl: hasReplayMedia(params.content)
        ? params.content.vimeo_video_id
          ? `https://vimeo.com/${params.content.vimeo_video_id}`
          : `https://www.youtube.com/watch?v=${params.content.youtube_video_id}`
        : undefined,
      eventTier: params.content.tier_min ?? params.member.subscription_tier,
      eventType: sessionKind,
    });

    await markDispatchSent(dispatchId);
    return true;
  } catch (error) {
    await releaseDispatch(dispatchId);
    throw error;
  }
}

export async function dispatchReminderTriggers() {
  const now = Date.now();
  const [members, contentRows] = await Promise.all([
    fetchEligibleMembers(),
    fetchReminderContent(),
  ]);

  let triggered = 0;

  for (const member of members) {
    const upcoming = chooseUpcomingContentForMember(member, contentRows, now);
    const upcomingReminderKind = upcoming ? getUpcomingReminderKind(upcoming, now) : null;

    if (upcoming && upcomingReminderKind) {
      const sent = await triggerReminder({
        member,
        content: upcoming,
        reminderKind: upcomingReminderKind,
      });
      if (sent) triggered += 1;
      continue;
    }

    const replay = chooseReplayContentForMember(member, contentRows, now);
    if (!replay) continue;

    const sessionKind = getSessionKind(replay.tier_min);
    if (!sessionKind) continue;

    const replayKind: ReminderKind =
      sessionKind === "event" ? "event_replay" : "coaching_replay";
    const sent = await triggerReminder({
      member,
      content: replay,
      reminderKind: replayKind,
    });
    if (sent) triggered += 1;
  }

  return {
    membersChecked: members.length,
    eligibleSessionsChecked: contentRows.length,
    remindersTriggered: triggered,
  };
}
