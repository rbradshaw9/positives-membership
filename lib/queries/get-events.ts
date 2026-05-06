import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";
import { calendarGridDays, eventDateKey, monthRange } from "@/lib/events/dates";
import type {
  EventAccessLevel,
  EventHostOption,
  EventTypeOption,
  EventVenueOption,
  ZoomConnectionOption,
} from "@/lib/events/types";

export type EventAccessRow = {
  subscription_tier: EventAccessLevel;
};

export type EventZoomRow = {
  id: string;
  zoom_connection_id: string | null;
  zoom_object_type: "meeting" | "webinar";
  zoom_object_id: string | null;
  join_url: string | null;
  host_email: string | null;
  provider_status: string | null;
};

export type EventRow = {
  id: string;
  series_id: string | null;
  type_id: string | null;
  host_id: string | null;
  venue_id: string | null;
  title: string;
  excerpt: string | null;
  description: string | null;
  body: string | null;
  status: string;
  starts_at: string;
  ends_at: string;
  timezone: string;
  all_day: boolean;
  visibility: "member" | "hidden";
  virtual_mode: "none" | "manual" | "zoom";
  manual_join_url: string | null;
  replay_url: string | null;
  replay_content_id: string | null;
  image_url: string | null;
  is_featured: boolean;
  event_type?: EventTypeOption | null;
  event_host?: EventHostOption | null;
  event_venue?: EventVenueOption | null;
  member_event_access_level?: EventAccessRow[];
  event_zoom_meeting?: EventZoomRow | null;
};

export type EventCalendarDay = {
  date: string;
  inMonth: boolean;
  events: EventRow[];
};

export type EventTypeSettingsRow = EventTypeOption & {
  sort_order: number;
  is_active: boolean;
};

export type EventHostSettingsRow = EventHostOption & {
  website_url: string | null;
  is_active: boolean;
};

export type EventVenueSettingsRow = EventVenueOption & {
  phone: string | null;
  website_url: string | null;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
};

const EVENT_SELECT = `
  id, series_id, type_id, host_id, venue_id, title, excerpt, description, body, status,
  starts_at, ends_at, timezone, all_day, visibility, virtual_mode, manual_join_url, replay_url,
  replay_content_id, image_url, is_featured,
  event_type:event_type(id, slug, name, description, color),
  event_host:event_host(id, name, bio, image_url, email),
  event_venue:event_venue(id, name, description, address_line1, address_line2, city, region, postal_code, country, map_url, is_virtual),
  member_event_access_level(subscription_tier),
  event_zoom_meeting(id, zoom_connection_id, zoom_object_type, zoom_object_id, join_url, host_email, provider_status)
`;

export async function getEventAdminOptions() {
  const supabase = asLooseSupabaseClient(getAdminClient());
  const [typesResult, hostsResult, venuesResult, zoomResult] = await Promise.all([
    supabase
      .from("event_type")
      .select<EventTypeOption>("id, slug, name, description, color")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("event_host")
      .select<EventHostOption>("id, name, bio, image_url, email")
      .eq("is_active", true)
      .order("name", { ascending: true }),
    supabase
      .from("event_venue")
      .select<EventVenueOption>("id, name, description, address_line1, address_line2, city, region, postal_code, country, map_url, is_virtual")
      .eq("is_active", true)
      .order("name", { ascending: true }),
    supabase
      .from("zoom_connection")
      .select<ZoomConnectionOption>("id, label, owner_kind, zoom_user_email, status")
      .neq("status", "disabled")
      .order("created_at", { ascending: false }),
  ]);

  return {
    types: (typesResult.data ?? []) as unknown as EventTypeOption[],
    hosts: (hostsResult.data ?? []) as unknown as EventHostOption[],
    venues: (venuesResult.data ?? []) as unknown as EventVenueOption[],
    zoomConnections: (zoomResult.data ?? []) as unknown as ZoomConnectionOption[],
  };
}

export async function getEventSettingsOptions() {
  const supabase = asLooseSupabaseClient(getAdminClient());
  const [typesResult, hostsResult, venuesResult] = await Promise.all([
    supabase
      .from("event_type")
      .select<EventTypeSettingsRow>("id, slug, name, description, color, sort_order, is_active")
      .order("sort_order", { ascending: true }),
    supabase
      .from("event_host")
      .select<EventHostSettingsRow>("id, name, bio, image_url, email, website_url, is_active")
      .order("name", { ascending: true }),
    supabase
      .from("event_venue")
      .select<EventVenueSettingsRow>(
        "id, name, description, address_line1, address_line2, city, region, postal_code, country, phone, website_url, map_url, latitude, longitude, is_virtual, is_active"
      )
      .order("name", { ascending: true }),
  ]);

  return {
    types: (typesResult.data ?? []) as unknown as EventTypeSettingsRow[],
    hosts: (hostsResult.data ?? []) as unknown as EventHostSettingsRow[],
    venues: (venuesResult.data ?? []) as unknown as EventVenueSettingsRow[],
  };
}

export async function getAdminEvents(params: {
  month?: string;
  status?: string;
  typeId?: string;
  accessLevel?: string;
}) {
  const supabase = asLooseSupabaseClient(getAdminClient());
  const month = params.month ?? new Date().toISOString().slice(0, 7);
  const { start, end } = monthRange(month);
  let query = supabase
    .from("member_event")
    .select<EventRow>(EVENT_SELECT)
    .gte("starts_at", `${start}T00:00:00.000Z`)
    .lte("starts_at", `${end}T23:59:59.999Z`)
    .order("starts_at", { ascending: true });

  if (params.status && params.status !== "all") query = query.eq("status", params.status);
  if (params.typeId && params.typeId !== "all") query = query.eq("type_id", params.typeId);

  const { data, error } = await query;
  if (error) {
    console.error("[getAdminEvents]", error.message);
    return { month, events: [], calendarDays: calendarGridDays(month).map((date) => ({ date, inMonth: date.startsWith(month), events: [] })) };
  }

  let events = (data ?? []) as unknown as EventRow[];
  if (params.accessLevel && params.accessLevel !== "all") {
    events = events.filter((event) =>
      (event.member_event_access_level ?? []).some((row) => row.subscription_tier === params.accessLevel)
    );
  }

  const eventsByDate = new Map<string, EventRow[]>();
  for (const event of events) {
    const key = eventDateKey(event.starts_at);
    eventsByDate.set(key, [...(eventsByDate.get(key) ?? []), event]);
  }

  return {
    month,
    events,
    calendarDays: calendarGridDays(month).map((date) => ({
      date,
      inMonth: date.startsWith(month),
      events: eventsByDate.get(date) ?? [],
    })),
  };
}

export async function getAdminEvent(id: string) {
  const supabase = asLooseSupabaseClient(getAdminClient());
  const { data, error } = await supabase
    .from("member_event")
    .select<EventRow>(EVENT_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[getAdminEvent]", error.message);
    return null;
  }
  return data as unknown as EventRow | null;
}

export async function getMemberEvents(params: {
  month?: string;
  memberTier: string | null;
}) {
  const nowMs = Date.now();
  if (!params.memberTier) return { month: params.month ?? new Date().toISOString().slice(0, 7), events: [], calendarDays: [], nowMs };

  const { month, events, calendarDays } = await getAdminEvents({
    month: params.month,
    status: "published",
    accessLevel: params.memberTier,
  });

  const published = events.filter((event) => event.status === "published" && event.visibility !== "hidden");
  const visibleIds = new Set(published.map((event) => event.id));
  return {
    month,
    events: published,
    nowMs,
    calendarDays: calendarDays.map((day) => ({
      ...day,
      events: day.events.filter((event) => visibleIds.has(event.id)),
    })),
  };
}

export async function getMemberEvent(id: string, memberTier: string | null) {
  if (!memberTier) return null;
  const event = await getAdminEvent(id);
  if (!event || event.status !== "published" || event.visibility === "hidden") return null;
  const hasAccess = (event.member_event_access_level ?? []).some((row) => row.subscription_tier === memberTier);
  return hasAccess ? event : null;
}

export async function getZoomConnections() {
  const supabase = asLooseSupabaseClient(getAdminClient());
  const { data, error } = await supabase
    .from("zoom_connection")
    .select<ZoomConnectionOption & { last_connected_at: string | null; last_error: string | null }>(
      "id, label, owner_kind, zoom_user_email, status, last_connected_at, last_error"
    )
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[getZoomConnections]", error.message);
    return [];
  }
  return (data ?? []) as unknown as Array<ZoomConnectionOption & { last_connected_at: string | null; last_error: string | null }>;
}
