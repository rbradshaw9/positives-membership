import { unstable_cache } from "next/cache";
import { formatInTimeZone } from "date-fns-tz";
import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";
import { addDays, formatDateOnly, parseDateOnly } from "@/lib/dates/admin-calendar";
import { calendarGridDays, eventDateKey, monthRange } from "@/lib/events/dates";
import type {
  EventAccessLevel,
  EventRegistrationPlacement,
  EventRegistrationField,
  EventTicketingMode,
  EventTicketTypeStatus,
  EventHostOption,
  EventTypeOption,
  EventVenueOption,
  ZoomConnectionOption,
} from "@/lib/events/types";

const EVENT_DEFAULT_TIMEZONE = "America/New_York";

function currentEventMonthKey() {
  return formatInTimeZone(new Date(), EVENT_DEFAULT_TIMEZONE, "yyyy-MM");
}

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

export type EventLiveKitRoomRow = {
  id: string;
  event_id: string;
  room_name: string;
  mode: "webinar";
  recording_policy: "auto" | "manual" | "none";
  room_status: "provisioned" | "started" | "finished" | "failed";
  egress_id: string | null;
  egress_status: "pending" | "starting" | "active" | "complete" | "failed" | "aborted" | "limit_reached" | null;
  replay_asset_id: string | null;
  last_error: string | null;
  room_started_at: string | null;
  room_finished_at: string | null;
  egress_started_at: string | null;
  egress_ended_at: string | null;
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

export type EventRsvpTypeRow = {
  id: string;
  event_id: string;
  name: string;
  description: string | null;
  capacity: number | null;
  start_at: string | null;
  end_at: string | null;
  collect_attendee_info: boolean;
  registration_fields: EventRegistrationField[];
  sort_order: number;
  status: "active" | "disabled" | "archived";
  confirmed_count?: number;
};

export type EventAttendeeRow = {
  id: string;
  event_id: string;
  rsvp_type_id: string | null;
  member_id: string | null;
  attendee_number: string;
  security_code: string;
  name: string | null;
  email: string | null;
  status: "registered" | "checked_in" | "canceled" | "refunded" | "chargeback" | "no_show";
  source: "rsvp" | "manual" | "paid" | "comp";
  custom_field_values?: Record<string, unknown>;
  created_at: string;
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
  virtual_mode: "none" | "manual" | "zoom" | "livekit";
  ticketing_mode: EventTicketingMode;
  event_capacity: number | null;
  registration_placement: EventRegistrationPlacement;
  manual_join_url: string | null;
  replay_url: string | null;
  replay_content_id: string | null;
  replay_asset_id: string | null;
  image_url: string | null;
  is_featured: boolean;
  event_type?: EventTypeOption | null;
  event_host?: EventHostOption | null;
  event_venue?: EventVenueOption | null;
  event_host_assignment?: EventHostAssignmentRow[];
  member_event_access_level?: EventAccessRow[];
  event_zoom_meeting?: EventZoomRow | null;
  event_livekit_room?: EventLiveKitRoomRow | null;
  event_ticket_type?: EventTicketTypeRow[];
  event_rsvp_type?: EventRsvpTypeRow[];
  member_rsvp_attendee?: EventAttendeeRow | null;
  member_ticket_access?: boolean;
};

export type EventCalendarDay = {
  date: string;
  inMonth: boolean;
  events: EventRow[];
};

export type MemberEventFilterOptions = {
  types: EventTypeOption[];
  venues: EventVenueOption[];
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
  starts_at, ends_at, timezone, all_day, visibility, virtual_mode, ticketing_mode, event_capacity, registration_placement, manual_join_url, replay_url,
  replay_content_id, replay_asset_id, image_url, is_featured,
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
  event_rsvp_type(id, event_id, name, description, capacity, start_at, end_at, collect_attendee_info, registration_fields, sort_order, status),
  event_zoom_meeting(
    id, zoom_connection_id, zoom_object_type, zoom_object_id, join_url, host_email, provider_status,
    zoom_connection:zoom_connection_id(id, label, owner_kind, zoom_user_email, status)
  ),
  event_livekit_room(
    id, event_id, room_name, mode, recording_policy, room_status, egress_id, egress_status, replay_asset_id,
    last_error, room_started_at, room_finished_at, egress_started_at, egress_ended_at
  )
`;

const EVENT_SELECT_COMPAT = EVENT_SELECT
  .replace(", event_capacity, registration_placement", "")
  .replace(", registration_fields", "")
  .replace(", replay_asset_id", "")
  .replace(`,
  event_livekit_room(
    id, event_id, room_name, mode, recording_policy, room_status, egress_id, egress_status, replay_asset_id,
    last_error, room_started_at, room_finished_at, egress_started_at, egress_ended_at
  )`, "");

function normalizeEventRows(rows: EventRow[]) {
  return rows.map((event) => ({
    ...event,
    event_rsvp_type: (event.event_rsvp_type ?? []).map((rsvp) => ({
      ...rsvp,
      registration_fields: rsvp.registration_fields ?? [],
    })),
  }));
}

function eventSelectNeedsCompat(message?: string) {
  return Boolean(
      message?.includes("registration_fields") ||
      message?.includes("event_capacity") ||
      message?.includes("registration_placement") ||
      message?.includes("replay_asset_id") ||
      message?.includes("event_livekit_room")
  );
}

function sortEventTickets(event: EventRow) {
  const assignments = [...(event.event_host_assignment ?? [])].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1;
    if (!a.is_primary && b.is_primary) return 1;
    return a.sort_order - b.sort_order;
  });
  return {
    ...event,
    ticketing_mode: event.ticketing_mode ?? "included",
    event_capacity: event.event_capacity ?? null,
    registration_placement: event.registration_placement ?? "after_description",
    event_ticket_type: [...(event.event_ticket_type ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    event_rsvp_type: [...(event.event_rsvp_type ?? [])]
      .map((rsvp) => ({ ...rsvp, registration_fields: rsvp.registration_fields ?? [] }))
      .sort((a, b) => a.sort_order - b.sort_order),
    event_host_assignment: assignments,
    event_host: event.event_host ?? assignments[0]?.event_host ?? null,
  };
}

async function fetchEventAdminOptions() {
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

export const getEventAdminOptions = unstable_cache(
  fetchEventAdminOptions,
  ["event-admin-options"],
  { revalidate: 60 }
);

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
  const month = params.month ?? currentEventMonthKey();
  const { start, end } = monthRange(month);
  const rangeStart = formatDateOnly(addDays(parseDateOnly(start), -2));
  const rangeEnd = formatDateOnly(addDays(parseDateOnly(end), 2));
  const runQuery = (select: string) => {
    let query = supabase
      .from("member_event")
      .select<EventRow>(select)
      .gte("starts_at", `${rangeStart}T00:00:00.000Z`)
      .lte("starts_at", `${rangeEnd}T23:59:59.999Z`)
      .order("starts_at", { ascending: true });

    if (params.status === "active") {
      query = query.neq("status", "archived");
    } else if (params.status && params.status !== "all") {
      query = query.eq("status", params.status);
    }
    if (params.typeId && params.typeId !== "all") query = query.eq("type_id", params.typeId);
    return query;
  };

  let { data, error } = await runQuery(EVENT_SELECT);
  if (eventSelectNeedsCompat(error?.message)) {
    const compat = await runQuery(EVENT_SELECT_COMPAT);
    data = compat.data;
    error = compat.error;
  }
  if (error) {
    console.error("[getAdminEvents]", error.message);
    return { month, events: [], calendarDays: calendarGridDays(month).map((date) => ({ date, inMonth: date.startsWith(month), events: [] })) };
  }

  let events = normalizeEventRows((data ?? []) as unknown as EventRow[]).map(sortEventTickets);
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
  let { data, error } = await supabase
    .from("member_event")
    .select<EventRow>(EVENT_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (eventSelectNeedsCompat(error?.message)) {
    const compat = await supabase
      .from("member_event")
      .select<EventRow>(EVENT_SELECT_COMPAT)
      .eq("id", id)
      .maybeSingle();
    data = compat.data;
    error = compat.error;
  }

  if (error) {
    console.error("[getAdminEvent]", error.message);
    return null;
  }
  return data ? sortEventTickets(normalizeEventRows([data as unknown as EventRow])[0]) : null;
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

async function getEventRsvpState(event: EventRow, memberId?: string | null) {
  const supabase = asLooseSupabaseClient(getAdminClient());
  const rsvpTypes = event.event_rsvp_type ?? [];
  if (rsvpTypes.length === 0) {
    return { event_rsvp_type: rsvpTypes, member_rsvp_attendee: null };
  }

  const rsvpIds = rsvpTypes.map((rsvp) => rsvp.id);
  const [attendeesResult, memberResult] = await Promise.all([
    supabase
      .from("event_attendee")
      .select<Array<{ rsvp_type_id: string | null; status: string }>>("rsvp_type_id, status")
      .in("rsvp_type_id", rsvpIds)
      .in("status", ["registered", "checked_in"]),
    memberId
      ? supabase
          .from("event_attendee")
          .select<EventAttendeeRow>("id, event_id, rsvp_type_id, member_id, attendee_number, security_code, name, email, status, source, created_at")
          .eq("event_id", event.id)
          .eq("member_id", memberId)
          .eq("source", "rsvp")
          .in("status", ["registered", "checked_in"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  const counts = new Map<string, number>();
  if (!attendeesResult.error) {
    for (const attendee of attendeesResult.data ?? []) {
      if (!attendee.rsvp_type_id) continue;
      counts.set(attendee.rsvp_type_id, (counts.get(attendee.rsvp_type_id) ?? 0) + 1);
    }
  } else {
    console.error("[getEventRsvpState] counts", attendeesResult.error.message);
  }

  if (memberResult.error) {
    console.error("[getEventRsvpState] member", memberResult.error.message);
  }

  return {
    event_rsvp_type: rsvpTypes.map((rsvp) => ({
      ...rsvp,
      confirmed_count: counts.get(rsvp.id) ?? 0,
    })),
    member_rsvp_attendee: (memberResult.data ?? null) as EventAttendeeRow | null,
  };
}

async function withEventTicketInventory(events: EventRow[]) {
  const ticketTypeIds = events.flatMap((event) => (event.event_ticket_type ?? []).map((ticket) => ticket.id));
  if (ticketTypeIds.length === 0) return events;

  const supabase = asLooseSupabaseClient(getAdminClient());
  const { data, error } = await supabase
    .from("event_ticket")
    .select<Array<{
      ticket_type_id: string | null;
      status: string;
      event_ticket_order?: { expires_at: string | null } | null;
    }>>("ticket_type_id, status, event_ticket_order:order_id(expires_at)")
    .in("ticket_type_id", ticketTypeIds)
    .in("status", ["pending", "active", "comp"]);

  if (error) {
    console.error("[withEventTicketInventory]", error.message);
    return events;
  }

  const now = Date.now();
  const counts = new Map<string, { sold: number; held: number }>();
  for (const row of data ?? []) {
    if (!row.ticket_type_id) continue;
    const current = counts.get(row.ticket_type_id) ?? { sold: 0, held: 0 };
    if (row.status === "active" || row.status === "comp") {
      current.sold += 1;
    } else if (
      row.status === "pending" &&
      row.event_ticket_order?.expires_at &&
      new Date(row.event_ticket_order.expires_at).getTime() > now
    ) {
      current.held += 1;
    }
    counts.set(row.ticket_type_id, current);
  }

  return events.map((event) => ({
    ...event,
    event_ticket_type: (event.event_ticket_type ?? []).map((ticket) => {
      const count = counts.get(ticket.id);
      return {
        ...ticket,
        sold_count: count?.sold ?? 0,
        held_count: count?.held ?? 0,
      };
    }),
  }));
}

export async function getMemberEvents(params: {
  month?: string;
  query?: string;
  typeSlug?: string;
  venueSlug?: string;
  memberId: string;
  memberTier: string | null;
}) {
  const nowMs = Date.now();
  if (!params.memberTier) return emptyMemberEvents(params.month);

  const filterOptions = params.typeSlug || params.venueSlug
    ? await getMemberEventFilterOptions(params.memberTier)
    : null;
  const typeId = params.typeSlug
    ? filterOptions?.types.find((type) => type.slug === params.typeSlug)?.id
    : undefined;

  if (params.typeSlug && !typeId) {
    return emptyMemberEvents(params.month);
  }

  const { month, events } = await getAdminEvents({
    month: params.month,
    status: "published",
    accessLevel: params.memberTier,
    query: params.query,
    typeId,
  });

  const published = events.filter((event) => {
    if (event.status !== "published" || event.visibility === "hidden") return false;
    if (params.venueSlug && event.event_venue?.slug !== params.venueSlug) return false;
    return true;
  });
  const ticketAccess = await getMemberTicketAccess(params.memberId, published.map((event) => event.id));
  const withInventory = await withEventTicketInventory(published);
  const withTicketAccess = withInventory.map((event) => ({
    ...event,
    member_ticket_access: event.ticketing_mode !== "ticket_required" || ticketAccess.has(event.id),
  }));
  return {
    month,
    events: withTicketAccess,
    nowMs,
    calendarDays: buildMemberCalendarDays(month, withTicketAccess),
  };
}

export async function getMemberEvent(id: string, memberTier: string | null, memberId?: string | null) {
  if (!memberTier) return null;
  const event = await getAdminEvent(id);
  if (!event || event.status !== "published" || event.visibility === "hidden") return null;
  const hasAccess = (event.member_event_access_level ?? []).some((row) => row.subscription_tier === memberTier);
  if (!hasAccess) return null;
  if (!memberId) {
    const rsvpState = await getEventRsvpState(event, null);
    const [withInventory] = await withEventTicketInventory([event]);
    return {
      ...withInventory,
      ...rsvpState,
      member_ticket_access: event.ticketing_mode !== "ticket_required",
    };
  }
  const ticketAccess = await getMemberTicketAccess(memberId, [event.id]);
  const rsvpState = await getEventRsvpState(event, memberId);
  const [withInventory] = await withEventTicketInventory([event]);
  return {
    ...withInventory,
    ...rsvpState,
    member_ticket_access: event.ticketing_mode !== "ticket_required" || ticketAccess.has(event.id),
  };
}

export async function getMemberRelatedEvents(params: {
  event: EventRow;
  memberTier: string | null;
  memberId: string;
  limit?: number;
}) {
  if (!params.memberTier) return [];

  const supabase = asLooseSupabaseClient(getAdminClient());
  const { data, error } = await supabase
    .from("member_event")
    .select<EventRow>(EVENT_SELECT)
    .neq("id", params.event.id)
    .eq("status", "published")
    .neq("visibility", "hidden")
    .gte("ends_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(24);

  let relatedData = data;
  let relatedError = error;
  if (eventSelectNeedsCompat(relatedError?.message)) {
    const compat = await supabase
      .from("member_event")
      .select<EventRow>(EVENT_SELECT_COMPAT)
      .neq("id", params.event.id)
      .eq("status", "published")
      .neq("visibility", "hidden")
      .gte("ends_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(24);
    relatedData = compat.data;
    relatedError = compat.error;
  }

  if (relatedError) {
    console.error("[getMemberRelatedEvents]", relatedError.message);
    return [];
  }

  const currentHostIds = new Set(
    (params.event.event_host_assignment ?? []).map((assignment) => assignment.host_id)
  );
  if (params.event.host_id) currentHostIds.add(params.event.host_id);

  const visible = normalizeEventRows((relatedData ?? []) as unknown as EventRow[])
    .map(sortEventTickets)
    .filter((event) => memberCanSeeEvent(event, params.memberTier as string))
    .sort((a, b) => {
      const aHostMatch = (a.event_host_assignment ?? []).some((assignment) =>
        currentHostIds.has(assignment.host_id)
      ) || (a.host_id ? currentHostIds.has(a.host_id) : false);
      const bHostMatch = (b.event_host_assignment ?? []).some((assignment) =>
        currentHostIds.has(assignment.host_id)
      ) || (b.host_id ? currentHostIds.has(b.host_id) : false);
      const scoreA =
        (a.type_id && a.type_id === params.event.type_id ? 4 : 0) +
        (a.venue_id && a.venue_id === params.event.venue_id ? 3 : 0) +
        (aHostMatch ? 2 : 0);
      const scoreB =
        (b.type_id && b.type_id === params.event.type_id ? 4 : 0) +
        (b.venue_id && b.venue_id === params.event.venue_id ? 3 : 0) +
        (bHostMatch ? 2 : 0);
      if (scoreA !== scoreB) return scoreB - scoreA;
      return new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime();
    })
    .slice(0, params.limit ?? 3);

  return withMemberTicketAccess(await withEventTicketInventory(visible), params.memberId);
}

function memberCanSeeEvent(event: EventRow, memberTier: string) {
  return (
    event.status === "published" &&
    event.visibility !== "hidden" &&
    (event.member_event_access_level ?? []).some((row) => row.subscription_tier === memberTier)
  );
}

async function withMemberTicketAccess(events: EventRow[], memberId: string) {
  if (events.length === 0) return [];
  const ticketAccess = await getMemberTicketAccess(memberId, events.map((event) => event.id));
  return events.map((event) => ({
    ...event,
    member_ticket_access: event.ticketing_mode !== "ticket_required" || ticketAccess.has(event.id),
  }));
}

function buildMemberCalendarDays(month: string, events: EventRow[]): EventCalendarDay[] {
  const eventsByDate = new Map<string, EventRow[]>();
  for (const event of events) {
    const key = eventDateKey(event.starts_at, event.timezone);
    eventsByDate.set(key, [...(eventsByDate.get(key) ?? []), event]);
  }

  return calendarGridDays(month).map((date) => ({
    date,
    inMonth: date.startsWith(month),
    events: eventsByDate.get(date) ?? [],
  }));
}

function emptyMemberEvents(month?: string) {
  const resolvedMonth = month ?? currentEventMonthKey();
  return {
    month: resolvedMonth,
    events: [] as EventRow[],
    calendarDays: buildMemberCalendarDays(resolvedMonth, []),
    nowMs: Date.now(),
  };
}

export async function getMemberEventFilterOptions(
  memberTier: string | null
): Promise<MemberEventFilterOptions> {
  if (!memberTier) {
    return { types: [], venues: [] };
  }

  const options = await getEventAdminOptions();
  return {
    types: options.types,
    venues: options.venues,
  };
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

  let { data: events, error: eventsError } = await supabase
    .from("member_event")
    .select<EventRow>(EVENT_SELECT)
    .in("id", eventIds)
    .gte("ends_at", new Date().toISOString())
    .order("starts_at", { ascending: true });

  if (eventSelectNeedsCompat(eventsError?.message)) {
    const compat = await supabase
      .from("member_event")
      .select<EventRow>(EVENT_SELECT_COMPAT)
      .in("id", eventIds)
      .gte("ends_at", new Date().toISOString())
      .order("starts_at", { ascending: true });
    events = compat.data;
    eventsError = compat.error;
  }

  if (eventsError) {
    console.error("[getMemberEventHostPage] events", eventsError.message);
    return { host: host as unknown as EventHostOption, events: [] };
  }

  const visible = normalizeEventRows((events ?? []) as unknown as EventRow[])
    .map(sortEventTickets)
    .filter((event) => memberCanSeeEvent(event, memberTier));

  return {
    host: host as unknown as EventHostOption,
    events: await withMemberTicketAccess(await withEventTicketInventory(visible), memberId),
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

  let { data: events, error: eventsError } = await supabase
    .from("member_event")
    .select<EventRow>(EVENT_SELECT)
    .eq("venue_id", venue.id)
    .gte("ends_at", new Date().toISOString())
    .order("starts_at", { ascending: true });

  if (eventSelectNeedsCompat(eventsError?.message)) {
    const compat = await supabase
      .from("member_event")
      .select<EventRow>(EVENT_SELECT_COMPAT)
      .eq("venue_id", venue.id)
      .gte("ends_at", new Date().toISOString())
      .order("starts_at", { ascending: true });
    events = compat.data;
    eventsError = compat.error;
  }

  if (eventsError) {
    console.error("[getMemberEventVenuePage] events", eventsError.message);
    return { venue: venue as unknown as EventVenueOption, events: [] };
  }

  const visible = normalizeEventRows((events ?? []) as unknown as EventRow[])
    .map(sortEventTickets)
    .filter((event) => memberCanSeeEvent(event, memberTier));

  return {
    venue: venue as unknown as EventVenueOption,
    events: await withMemberTicketAccess(await withEventTicketInventory(visible), memberId),
  };
}

async function fetchZoomConnections() {
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

export const getZoomConnections = unstable_cache(
  fetchZoomConnections,
  ["admin-zoom-connections"],
  { revalidate: 30 }
);
