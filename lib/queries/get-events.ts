import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";
import { addDays, formatDateOnly, parseDateOnly } from "@/lib/dates/admin-calendar";
import { calendarGridDays, eventDateKey, monthRange } from "@/lib/events/dates";
import type {
  EventAccessLevel,
  EventTicketingMode,
  EventTicketTypeStatus,
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
  zoom_connection?: ZoomConnectionOption | null;
};

export type EventHostAssignmentRow = {
  id: string;
  event_id: string;
  host_id: string;
  role: "host" | "organizer" | "speaker" | "instructor" | "partner";
  sort_order: number;
  is_primary: boolean;
  event_host?: EventHostOption | null;
};

export type EventTicketTypeAccessRow = {
  subscription_tier: EventAccessLevel;
};

export type EventTicketTypeRow = {
  id: string;
  event_id: string;
  name: string;
  description: string | null;
  price_cents: number;
  currency: string;
  capacity: number | null;
  max_per_order: number;
  status: EventTicketTypeStatus;
  sale_starts_at: string | null;
  sale_ends_at: string | null;
  sort_order: number;
  event_ticket_type_access_level?: EventTicketTypeAccessRow[];
  sold_count?: number;
  held_count?: number;
};

export type EventRow = {
  id: string;
  series_id: string | null;
  type_id: string | null;
  host_id: string | null;
  venue_id: string | null;
  venue_room_name: string | null;
  venue_notes: string | null;
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
  ticketing_mode: EventTicketingMode;
  manual_join_url: string | null;
  replay_url: string | null;
  replay_content_id: string | null;
  image_url: string | null;
  is_featured: boolean;
  event_type?: EventTypeOption | null;
  event_host?: EventHostOption | null;
  event_venue?: EventVenueOption | null;
  event_host_assignment?: EventHostAssignmentRow[];
  member_event_access_level?: EventAccessRow[];
  event_zoom_meeting?: EventZoomRow | null;
  event_ticket_type?: EventTicketTypeRow[];
  member_ticket_access?: boolean;
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
  phone: string | null;
  website_url: string | null;
  is_active: boolean;
  upcoming_count?: number;
};

export type EventVenueSettingsRow = EventVenueOption & {
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
  upcoming_count?: number;
};

export type EventSettingRow = {
  key: string;
  value: unknown;
  description: string | null;
};

export type EventAdminDefaults = {
  timezone: string;
  accessLevels: EventAccessLevel[];
  defaultMaxPerOrder: number;
};

function settingValue<T>(settings: EventSettingRow[], key: string, fallback: T): T {
  const row = settings.find((setting) => setting.key === key);
  return (row?.value ?? fallback) as T;
}

function normalizeDefaults(settings: EventSettingRow[]): EventAdminDefaults {
  const accessValue = settingValue<unknown[]>(settings, "default_access_levels", ["level_2"]);
  const accessLevels = accessValue
    .map((value) => String(value))
    .filter((value): value is EventAccessLevel =>
      ["level_1", "level_2", "level_3", "level_4"].includes(value)
    );
  const maxPerOrder = Number(settingValue(settings, "default_max_per_order", 4));
  return {
    timezone: String(settingValue(settings, "default_timezone", "America/New_York")),
    accessLevels: accessLevels.length > 0 ? accessLevels : ["level_2"],
    defaultMaxPerOrder: Number.isFinite(maxPerOrder) && maxPerOrder > 0 ? Math.round(maxPerOrder) : 4,
  };
}

const EVENT_HOST_SELECT =
  "id, slug, name, type, bio, image_url, email, phone, website_url, social_links, contact_visibility, status, brand_logo_url, support_email";

const EVENT_VENUE_SELECT =
  "id, slug, name, description, featured_image_url, address_line1, address_line2, city, region, postal_code, country, email, phone, website_url, map_url, show_map, show_map_link, accessibility_notes, parking_notes, is_virtual, status";

const EVENT_SELECT = `
  id, series_id, type_id, host_id, venue_id, venue_room_name, venue_notes, title, excerpt, description, body, status,
  starts_at, ends_at, timezone, all_day, visibility, virtual_mode, ticketing_mode, manual_join_url, replay_url,
  replay_content_id, image_url, is_featured,
  event_type:event_type(id, slug, name, description, color),
  event_host:event_host(id, slug, name, type, bio, image_url, email, phone, website_url, social_links, contact_visibility, status, brand_logo_url, support_email),
  event_venue:event_venue(id, slug, name, description, featured_image_url, address_line1, address_line2, city, region, postal_code, country, email, phone, website_url, map_url, show_map, show_map_link, accessibility_notes, parking_notes, is_virtual, status),
  event_host_assignment(
    id, event_id, host_id, role, sort_order, is_primary,
    event_host:event_host(id, slug, name, type, bio, image_url, email, phone, website_url, social_links, contact_visibility, status, brand_logo_url, support_email)
  ),
  member_event_access_level(subscription_tier),
  event_ticket_type(
    id, event_id, name, description, price_cents, currency, capacity, max_per_order, status, sale_starts_at, sale_ends_at, sort_order,
    event_ticket_type_access_level(subscription_tier)
  ),
  event_zoom_meeting(
    id, zoom_connection_id, zoom_object_type, zoom_object_id, join_url, host_email, provider_status,
    zoom_connection:zoom_connection_id(id, label, owner_kind, zoom_user_email, status)
  )
`;

function sortEventTickets(event: EventRow) {
  const assignments = [...(event.event_host_assignment ?? [])].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1;
    if (!a.is_primary && b.is_primary) return 1;
    return a.sort_order - b.sort_order;
  });
  return {
    ...event,
    ticketing_mode: event.ticketing_mode ?? "included",
    event_ticket_type: [...(event.event_ticket_type ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    event_host_assignment: assignments,
    event_host: event.event_host ?? assignments[0]?.event_host ?? null,
  };
}

export async function getEventAdminOptions() {
  const supabase = asLooseSupabaseClient(getAdminClient());
  const [typesResult, hostsResult, venuesResult, zoomResult, settingsResult] = await Promise.all([
    supabase
      .from("event_type")
      .select<EventTypeOption>("id, slug, name, description, color")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("event_host")
      .select<EventHostOption>(EVENT_HOST_SELECT)
      .neq("status", "archived")
      .order("name", { ascending: true }),
    supabase
      .from("event_venue")
      .select<EventVenueOption>(EVENT_VENUE_SELECT)
      .neq("status", "archived")
      .order("name", { ascending: true }),
    supabase
      .from("zoom_connection")
      .select<ZoomConnectionOption>("id, label, owner_kind, zoom_user_email, status")
      .neq("status", "disabled")
      .order("created_at", { ascending: false }),
    supabase
      .from("event_setting")
      .select<EventSettingRow>("key, value, description")
      .order("key", { ascending: true }),
  ]);
  const settings = (settingsResult.data ?? []) as unknown as EventSettingRow[];

  return {
    types: (typesResult.data ?? []) as unknown as EventTypeOption[],
    hosts: (hostsResult.data ?? []) as unknown as EventHostOption[],
    venues: (venuesResult.data ?? []) as unknown as EventVenueOption[],
    zoomConnections: (zoomResult.data ?? []) as unknown as ZoomConnectionOption[],
    defaults: normalizeDefaults(settings),
  };
}

export async function getEventSettingsOptions() {
  const supabase = asLooseSupabaseClient(getAdminClient());
  const [typesResult, hostsResult, venuesResult, settingsResult, zoomResult, ticketTypesResult, counts] = await Promise.all([
    supabase
      .from("event_type")
      .select<EventTypeSettingsRow>("id, slug, name, description, color, sort_order, is_active")
      .order("sort_order", { ascending: true }),
    supabase
      .from("event_host")
      .select<EventHostSettingsRow>(`${EVENT_HOST_SELECT}, is_active`)
      .order("name", { ascending: true }),
    supabase
      .from("event_venue")
      .select<EventVenueSettingsRow>(
        `${EVENT_VENUE_SELECT}, latitude, longitude, is_active`
      )
      .order("name", { ascending: true }),
    supabase
      .from("event_setting")
      .select<EventSettingRow>("key, value, description")
      .order("key", { ascending: true }),
    supabase
      .from("zoom_connection")
      .select<ZoomConnectionOption>("id, label, owner_kind, zoom_user_email, status")
      .neq("status", "disabled")
      .order("created_at", { ascending: false }),
    supabase
      .from("event_ticket_type")
      .select<EventTicketTypeRow>(
        "id, event_id, name, description, price_cents, currency, capacity, max_per_order, status, sale_starts_at, sale_ends_at, sort_order"
      )
      .neq("status", "archived")
      .order("created_at", { ascending: false })
      .limit(12),
    getEventResourceCounts(),
  ]);
  const hostCounts = counts.hostCounts;
  const venueCounts = counts.venueCounts;

  return {
    types: (typesResult.data ?? []) as unknown as EventTypeSettingsRow[],
    hosts: ((hostsResult.data ?? []) as unknown as EventHostSettingsRow[]).map((host) => ({
      ...host,
      upcoming_count: hostCounts.get(host.id) ?? 0,
    })),
    venues: ((venuesResult.data ?? []) as unknown as EventVenueSettingsRow[]).map((venue) => ({
      ...venue,
      upcoming_count: venueCounts.get(venue.id) ?? 0,
    })),
    settings: (settingsResult.data ?? []) as unknown as EventSettingRow[],
    defaults: normalizeDefaults((settingsResult.data ?? []) as unknown as EventSettingRow[]),
    zoomConnections: (zoomResult.data ?? []) as unknown as ZoomConnectionOption[],
    recentTicketTypes: (ticketTypesResult.data ?? []) as unknown as EventTicketTypeRow[],
  };
}

export async function getEventResourceCounts() {
  const supabase = asLooseSupabaseClient(getAdminClient());
  const now = new Date().toISOString();
  const { data: events, error: eventsError } = await supabase
    .from("member_event")
    .select<Array<{ id: string; venue_id: string | null }>>("id, venue_id")
    .gte("ends_at", now)
    .neq("status", "archived");

  if (eventsError) {
    console.error("[getEventResourceCounts] events", eventsError.message);
    return { hostCounts: new Map<string, number>(), venueCounts: new Map<string, number>() };
  }

  const rows = (events ?? []) as Array<{ id: string; venue_id: string | null }>;
  const eventIds = rows.map((event) => event.id);
  const venueCounts = new Map<string, number>();
  for (const event of rows) {
    if (event.venue_id) venueCounts.set(event.venue_id, (venueCounts.get(event.venue_id) ?? 0) + 1);
  }

  if (eventIds.length === 0) {
    return { hostCounts: new Map<string, number>(), venueCounts };
  }

  const { data: assignments, error: assignmentsError } = await supabase
    .from("event_host_assignment")
    .select<Array<{ host_id: string }>>("host_id")
    .in("event_id", eventIds);

  if (assignmentsError) {
    console.error("[getEventResourceCounts] assignments", assignmentsError.message);
    return { hostCounts: new Map<string, number>(), venueCounts };
  }

  const hostCounts = new Map<string, number>();
  for (const assignment of assignments ?? []) {
    hostCounts.set(assignment.host_id, (hostCounts.get(assignment.host_id) ?? 0) + 1);
  }

  return { hostCounts, venueCounts };
}

export async function getAdminEvents(params: {
  month?: string;
  status?: string;
  typeId?: string;
  accessLevel?: string;
  query?: string;
}) {
  const supabase = asLooseSupabaseClient(getAdminClient());
  const month = params.month ?? new Date().toISOString().slice(0, 7);
  const { start, end } = monthRange(month);
  const rangeStart = formatDateOnly(addDays(parseDateOnly(start), -2));
  const rangeEnd = formatDateOnly(addDays(parseDateOnly(end), 2));
  let query = supabase
    .from("member_event")
    .select<EventRow>(EVENT_SELECT)
    .gte("starts_at", `${rangeStart}T00:00:00.000Z`)
    .lte("starts_at", `${rangeEnd}T23:59:59.999Z`)
    .order("starts_at", { ascending: true });

  if (params.status && params.status !== "all") query = query.eq("status", params.status);
  if (params.typeId && params.typeId !== "all") query = query.eq("type_id", params.typeId);

  const { data, error } = await query;
  if (error) {
    console.error("[getAdminEvents]", error.message);
    return { month, events: [], calendarDays: calendarGridDays(month).map((date) => ({ date, inMonth: date.startsWith(month), events: [] })) };
  }

  let events = ((data ?? []) as unknown as EventRow[]).map(sortEventTickets);
  if (params.accessLevel && params.accessLevel !== "all") {
    events = events.filter((event) =>
      (event.member_event_access_level ?? []).some((row) => row.subscription_tier === params.accessLevel)
    );
  }
  const normalizedQuery = params.query?.trim().toLowerCase();
  if (normalizedQuery) {
    events = events.filter((event) => {
      const searchable = [
        event.title,
        event.excerpt,
        event.description,
        event.status,
        event.event_type?.name,
        event.event_host?.name,
        ...(event.event_host_assignment ?? []).map((assignment) => assignment.event_host?.name),
        event.event_venue?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return searchable.includes(normalizedQuery);
    });
  }

  const eventsByDate = new Map<string, EventRow[]>();
  for (const event of events) {
    const key = eventDateKey(event.starts_at, event.timezone);
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
  return data ? sortEventTickets(data as unknown as EventRow) : null;
}

async function getMemberTicketAccess(memberId: string, eventIds: string[]) {
  if (eventIds.length === 0) return new Set<string>();
  const supabase = asLooseSupabaseClient(getAdminClient());
  const { data, error } = await supabase
    .from("event_ticket")
    .select<Array<{ event_id: string }>>("event_id")
    .eq("member_id", memberId)
    .in("event_id", eventIds)
    .in("status", ["active", "comp"]);

  if (error) {
    console.error("[getMemberTicketAccess]", error.message);
    return new Set<string>();
  }

  return new Set((data ?? []).map((row) => row.event_id));
}

export async function getMemberEvents(params: {
  month?: string;
  memberId: string;
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
  const ticketAccess = await getMemberTicketAccess(params.memberId, published.map((event) => event.id));
  const withTicketAccess = published.map((event) => ({
    ...event,
    member_ticket_access: event.ticketing_mode !== "ticket_required" || ticketAccess.has(event.id),
  }));
  const visibleById = new Map(withTicketAccess.map((event) => [event.id, event]));
  return {
    month,
    events: withTicketAccess,
    nowMs,
    calendarDays: calendarDays.map((day) => ({
      ...day,
      events: day.events.flatMap((event) => {
        const visible = visibleById.get(event.id);
        return visible ? [visible] : [];
      }),
    })),
  };
}

export async function getMemberEvent(id: string, memberTier: string | null, memberId?: string | null) {
  if (!memberTier) return null;
  const event = await getAdminEvent(id);
  if (!event || event.status !== "published" || event.visibility === "hidden") return null;
  const hasAccess = (event.member_event_access_level ?? []).some((row) => row.subscription_tier === memberTier);
  if (!hasAccess) return null;
  if (!memberId) {
    return {
      ...event,
      member_ticket_access: event.ticketing_mode !== "ticket_required",
    };
  }
  const ticketAccess = await getMemberTicketAccess(memberId, [event.id]);
  return {
    ...event,
    member_ticket_access: event.ticketing_mode !== "ticket_required" || ticketAccess.has(event.id),
  };
}

function memberCanSeeEvent(event: EventRow, memberTier: string) {
  return (
    event.status === "published" &&
    event.visibility !== "hidden" &&
    (event.member_event_access_level ?? []).some((row) => row.subscription_tier === memberTier)
  );
}

async function withMemberTicketAccess(events: EventRow[], memberId: string) {
  const ticketAccess = await getMemberTicketAccess(memberId, events.map((event) => event.id));
  return events.map((event) => ({
    ...event,
    member_ticket_access: event.ticketing_mode !== "ticket_required" || ticketAccess.has(event.id),
  }));
}

export async function getMemberEventHostPage(slug: string, memberTier: string | null, memberId: string) {
  if (!memberTier) return null;
  const supabase = asLooseSupabaseClient(getAdminClient());
  const { data: host, error: hostError } = await supabase
    .from("event_host")
    .select<EventHostOption>(EVENT_HOST_SELECT)
    .eq("slug", slug)
    .neq("status", "archived")
    .maybeSingle();

  if (hostError) {
    console.error("[getMemberEventHostPage] host", hostError.message);
    return null;
  }
  if (!host) return null;

  const { data: assignments, error: assignmentError } = await supabase
    .from("event_host_assignment")
    .select<Array<{ event_id: string }>>("event_id")
    .eq("host_id", host.id);

  if (assignmentError) {
    console.error("[getMemberEventHostPage] assignments", assignmentError.message);
    return { host: host as unknown as EventHostOption, events: [] };
  }

  const eventIds = [...new Set((assignments ?? []).map((assignment) => assignment.event_id))];
  if (eventIds.length === 0) return { host: host as unknown as EventHostOption, events: [] };

  const { data: events, error: eventsError } = await supabase
    .from("member_event")
    .select<EventRow>(EVENT_SELECT)
    .in("id", eventIds)
    .gte("ends_at", new Date().toISOString())
    .order("starts_at", { ascending: true });

  if (eventsError) {
    console.error("[getMemberEventHostPage] events", eventsError.message);
    return { host: host as unknown as EventHostOption, events: [] };
  }

  const visible = ((events ?? []) as unknown as EventRow[])
    .map(sortEventTickets)
    .filter((event) => memberCanSeeEvent(event, memberTier));

  return {
    host: host as unknown as EventHostOption,
    events: await withMemberTicketAccess(visible, memberId),
  };
}

export async function getMemberEventVenuePage(slug: string, memberTier: string | null, memberId: string) {
  if (!memberTier) return null;
  const supabase = asLooseSupabaseClient(getAdminClient());
  const { data: venue, error: venueError } = await supabase
    .from("event_venue")
    .select<EventVenueOption>(EVENT_VENUE_SELECT)
    .eq("slug", slug)
    .neq("status", "archived")
    .maybeSingle();

  if (venueError) {
    console.error("[getMemberEventVenuePage] venue", venueError.message);
    return null;
  }
  if (!venue) return null;

  const { data: events, error: eventsError } = await supabase
    .from("member_event")
    .select<EventRow>(EVENT_SELECT)
    .eq("venue_id", venue.id)
    .gte("ends_at", new Date().toISOString())
    .order("starts_at", { ascending: true });

  if (eventsError) {
    console.error("[getMemberEventVenuePage] events", eventsError.message);
    return { venue: venue as unknown as EventVenueOption, events: [] };
  }

  const visible = ((events ?? []) as unknown as EventRow[])
    .map(sortEventTickets)
    .filter((event) => memberCanSeeEvent(event, memberTier));

  return {
    venue: venue as unknown as EventVenueOption,
    events: await withMemberTicketAccess(visible, memberId),
  };
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
