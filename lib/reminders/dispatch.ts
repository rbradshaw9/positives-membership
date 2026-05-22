import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";
import { checkTierAccess } from "@/lib/auth/check-tier-access";
import { hasActiveMemberAccess } from "@/lib/subscription/access";
import { shouldHideFromMembers } from "@/lib/content/member-content-visibility";
import { syncReminderContext } from "@/lib/activecampaign/sync";
import { config } from "@/lib/config";
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

type MemberEventReminderRow = {
  id: string;
  title: string;
  excerpt: string | null;
  description: string | null;
  status: string;
  starts_at: string;
  ends_at: string;
  timezone: string;
  visibility: "member" | "hidden";
  virtual_mode: "none" | "manual" | "zoom" | "livekit";
  ticketing_mode: "included" | "ticket_required";
  manual_join_url: string | null;
  replay_url: string | null;
  replay_asset_id: string | null;
  member_event_access_level?: Array<{ subscription_tier: SubscriptionTier }>;
};

type EventReminderAccess = {
  ticketMembers: Map<string, Set<string>>;
  rsvpMembers: Map<string, Set<string>>;
};

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

function getContentSessionKind(tier: SubscriptionTier | null): SessionKind | null {
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
  const sessionKind = getContentSessionKind(content.tier_min);

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

async function reserveEventDispatch(params: {
  memberId: string;
  eventId: string;
  reminderKind: Extract<ReminderKind, "event_24h" | "event_1h" | "event_replay">;
  activecampaignTag: string;
}) {
  const supabase = asLooseSupabaseClient(getAdminClient());
  const { data, error } = await supabase
    .from("member_event_reminder_dispatch")
    .upsert(
      {
        member_id: params.memberId,
        event_id: params.eventId,
        reminder_kind: params.reminderKind,
        activecampaign_tag: params.activecampaignTag,
      },
      {
        onConflict: "member_id,event_id,reminder_kind",
        ignoreDuplicates: true,
      }
    )
    .select<{ id: string }>("id")
    .maybeSingle();

  if (error) {
    throw new Error(`[reminders] failed to reserve event dispatch: ${error.message}`);
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

async function markEventDispatchSent(id: string) {
  const supabase = asLooseSupabaseClient(getAdminClient());
  const { error } = await supabase
    .from("member_event_reminder_dispatch")
    .update({ dispatched_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    throw new Error(`[reminders] failed to mark event dispatch sent: ${error.message}`);
  }
}

async function releaseDispatch(id: string) {
  const supabase = getAdminClient();
  await supabase.from("email_reminder_dispatch").delete().eq("id", id);
}

async function releaseEventDispatch(id: string) {
  const supabase = asLooseSupabaseClient(getAdminClient());
  await supabase.from("member_event_reminder_dispatch").delete().eq("id", id);
}

async function fetchEligibleMembers() {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("member")
    .select("id, email, subscription_status, subscription_tier, timezone")
    .in("subscription_status", ["active", "trialing"])
    .in("subscription_tier", ["level_1", "level_2", "level_3", "level_4"])
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`[reminders] failed to fetch members: ${error.message}`);
  }

  return (data ?? []).filter((member) => hasActiveMemberAccess(member.subscription_status));
}

async function fetchReminderEvents(now: number) {
  const supabase = asLooseSupabaseClient(getAdminClient());
  const startsAfter = new Date(now - REPLAY_LOOKBACK_MS).toISOString();
  const startsBefore = new Date(now + DAY_24_MS).toISOString();
  const { data, error } = await supabase
    .from("member_event")
    .select<Array<MemberEventReminderRow>>(
      "id, title, excerpt, description, status, starts_at, ends_at, timezone, visibility, virtual_mode, ticketing_mode, manual_join_url, replay_url, replay_asset_id, member_event_access_level(subscription_tier)"
    )
    .eq("status", "published")
    .neq("visibility", "hidden")
    .gte("starts_at", startsAfter)
    .lte("starts_at", startsBefore)
    .order("starts_at", { ascending: true });

  if (error) {
    throw new Error(`[reminders] failed to fetch member events: ${error.message}`);
  }

  return (data ?? []) as unknown as MemberEventReminderRow[];
}

async function fetchEventReminderAccess(eventIds: string[]): Promise<EventReminderAccess> {
  if (eventIds.length === 0) {
    return { ticketMembers: new Map(), rsvpMembers: new Map() };
  }

  const supabase = asLooseSupabaseClient(getAdminClient());
  const [ticketsResult, attendeesResult] = await Promise.all([
    supabase
      .from("event_ticket")
      .select<Array<{ event_id: string; member_id: string | null }>>("event_id, member_id")
      .in("event_id", eventIds)
      .in("status", ["active", "comp"]),
    supabase
      .from("event_attendee")
      .select<Array<{ event_id: string; member_id: string | null }>>("event_id, member_id")
      .in("event_id", eventIds)
      .in("status", ["registered", "checked_in"]),
  ]);

  if (ticketsResult.error) {
    throw new Error(`[reminders] failed to fetch event tickets: ${ticketsResult.error.message}`);
  }
  if (attendeesResult.error) {
    throw new Error(`[reminders] failed to fetch event attendees: ${attendeesResult.error.message}`);
  }

  const ticketMembers = new Map<string, Set<string>>();
  for (const ticket of ticketsResult.data ?? []) {
    if (!ticket.member_id) continue;
    const members = ticketMembers.get(ticket.event_id) ?? new Set<string>();
    members.add(ticket.member_id);
    ticketMembers.set(ticket.event_id, members);
  }

  const rsvpMembers = new Map<string, Set<string>>();
  for (const attendee of attendeesResult.data ?? []) {
    if (!attendee.member_id) continue;
    const members = rsvpMembers.get(attendee.event_id) ?? new Set<string>();
    members.add(attendee.member_id);
    rsvpMembers.set(attendee.event_id, members);
  }

  return { ticketMembers, rsvpMembers };
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
    if (getContentSessionKind(content.tier_min) !== "coaching") return false;
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
      if (getContentSessionKind(content.tier_min) !== "coaching") return false;
      if (!checkTierAccess(member.subscription_tier, content.tier_min)) return false;
      const startsAt = new Date(content.starts_at).getTime();
      return startsAt <= now && startsAt >= now - REPLAY_LOOKBACK_MS;
    })
    .sort((a, b) => new Date(b.starts_at!).getTime() - new Date(a.starts_at!).getTime());

  return candidates[0] ?? null;
}

function memberCanReceiveEventReminder(
  member: ActiveMember,
  event: MemberEventReminderRow,
  access: EventReminderAccess
) {
  if (!member.subscription_tier) return false;
  const accessLevelMatch = (event.member_event_access_level ?? []).some(
    (row) => row.subscription_tier === member.subscription_tier
  );
  const hasTicket = access.ticketMembers.get(event.id)?.has(member.id) ?? false;
  const hasRsvp = access.rsvpMembers.get(event.id)?.has(member.id) ?? false;

  if (event.ticketing_mode === "ticket_required") {
    return hasTicket || hasRsvp;
  }

  return accessLevelMatch || hasTicket || hasRsvp;
}

function getUpcomingEventReminderKind(event: MemberEventReminderRow, now: number) {
  const startsAt = new Date(event.starts_at).getTime();
  const diff = startsAt - now;

  if (diff <= DAY_24_MS && diff > DAY_24_MS - REMINDER_WINDOW_MS) {
    return "event_24h" as const;
  }

  if (diff <= HOUR_1_MS && diff > HOUR_1_MS - REMINDER_WINDOW_MS) {
    return "event_1h" as const;
  }

  return null;
}

function hasEventReplay(event: MemberEventReminderRow) {
  return Boolean(event.replay_asset_id || event.replay_url);
}

function eventPageUrl(eventId: string) {
  return new URL(`/events/${eventId}`, config.app.url).toString();
}

function chooseUpcomingEventForMember(
  member: ActiveMember,
  events: MemberEventReminderRow[],
  access: EventReminderAccess,
  now: number
) {
  return events.find((event) => {
    if (!memberCanReceiveEventReminder(member, event, access)) return false;
    return new Date(event.starts_at).getTime() > now;
  }) ?? null;
}

function chooseReplayEventForMember(
  member: ActiveMember,
  events: MemberEventReminderRow[],
  access: EventReminderAccess,
  now: number
) {
  const candidates = events
    .filter((event) => {
      if (!hasEventReplay(event)) return false;
      if (!memberCanReceiveEventReminder(member, event, access)) return false;
      const startsAt = new Date(event.starts_at).getTime();
      return startsAt <= now && startsAt >= now - REPLAY_LOOKBACK_MS;
    })
    .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());

  return candidates[0] ?? null;
}

async function triggerEventReminder(params: {
  member: ActiveMember;
  event: MemberEventReminderRow;
  reminderKind: Extract<ReminderKind, "event_24h" | "event_1h" | "event_replay">;
}) {
  if (!params.member.subscription_tier) return false;

  const triggerTag = getTriggerTag(params.reminderKind);
  const dispatchId = await reserveEventDispatch({
    memberId: params.member.id,
    eventId: params.event.id,
    reminderKind: params.reminderKind,
    activecampaignTag: triggerTag,
  });

  if (!dispatchId) {
    return false;
  }

  try {
    const url = eventPageUrl(params.event.id);
    await syncReminderContext({
      email: params.member.email,
      triggerTag,
      title: params.event.title,
      startsAt: formatStartsAt(params.event.starts_at, params.member.timezone ?? params.event.timezone),
      joinUrl: url,
      replayUrl: params.reminderKind === "event_replay" ? url : undefined,
      eventTier:
        params.event.member_event_access_level?.[0]?.subscription_tier ??
        params.member.subscription_tier,
      eventType: "event",
    });

    await markEventDispatchSent(dispatchId);
    return true;
  } catch (error) {
    await releaseEventDispatch(dispatchId);
    throw error;
  }
}

async function triggerReminder(params: {
  member: ActiveMember;
  content: ReminderContentRow;
  reminderKind: ReminderKind;
}) {
  const sessionKind = getContentSessionKind(params.content.tier_min);
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
  const [members, contentRows, eventRows] = await Promise.all([
    fetchEligibleMembers(),
    fetchReminderContent(),
    fetchReminderEvents(now),
  ]);
  const eventAccess = await fetchEventReminderAccess(eventRows.map((event) => event.id));

  let triggered = 0;

  for (const member of members) {
    const upcomingEvent = chooseUpcomingEventForMember(member, eventRows, eventAccess, now);
    const upcomingEventReminderKind = upcomingEvent ? getUpcomingEventReminderKind(upcomingEvent, now) : null;

    if (upcomingEvent && upcomingEventReminderKind) {
      const sent = await triggerEventReminder({
        member,
        event: upcomingEvent,
        reminderKind: upcomingEventReminderKind,
      });
      if (sent) triggered += 1;
      continue;
    }

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

    const replayEvent = chooseReplayEventForMember(member, eventRows, eventAccess, now);
    if (replayEvent) {
      const sent = await triggerEventReminder({
        member,
        event: replayEvent,
        reminderKind: "event_replay",
      });
      if (sent) triggered += 1;
      continue;
    }

    const replay = chooseReplayContentForMember(member, contentRows, now);
    if (!replay) continue;

    const sessionKind = getContentSessionKind(replay.tier_min);
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
    eligibleEventsChecked: eventRows.length,
    remindersTriggered: triggered,
  };
}
