"use server";

import { randomUUID } from "node:crypto";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";
import { EVENT_ACCESS_LEVELS, normalizeRegistrationFields, parseAccessLevels } from "@/lib/events/types";
import type { EventHostOption, EventRegistrationField, EventRegistrationPlacement, EventTypeOption, EventVenueOption } from "@/lib/events/types";
import { expandOccurrences, MAX_GENERATED_OCCURRENCES } from "@/lib/events/recurrence";
import { zoomApi } from "@/lib/zoom/client";
import { encryptSecret } from "@/lib/zoom/crypto";
import { sanitizeEventHtml } from "@/lib/content/sanitize-event-html";
import {
  ensureLiveKitEventRoom,
  getLiveKitEventHealth,
  liveKitEventRoomName,
} from "@/lib/livekit/events";

type EventInput = {
  id?: string;
  intent: "draft" | "publish" | "save" | "unpublish";
  title: string;
  excerpt: string;
  body: string;
  imageUrl: string;
  currentStatus: string;
  typeId: string;
  hostId: string;
  hostName: string;
  hostAssignments: EventHostAssignmentInput[];
  venueId: string;
  venueName: string;
  venueAddress1: string;
  venueCity: string;
  venueRegion: string;
  venuePostalCode: string;
  venueCountry: string;
  venueMapUrl: string;
  venueRoomName: string;
  venueNotes: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  allDay: boolean;
  virtualMode: string;
  ticketingMode: "included" | "ticket_required";
  eventCapacity: number | null;
  registrationPlacement: EventRegistrationPlacement;
  ticketTypes: EventTicketInput[];
  rsvpEnabled: boolean;
  rsvpTypes: EventRsvpInput[];
  manualJoinUrl: string;
  replayUrl: string;
  zoomMode: string;
  zoomConnectionId: string;
  zoomObjectType: "meeting" | "webinar";
  zoomObjectId: string;
  zoomJoinUrl: string;
  recurrenceFrequency: "none" | "daily" | "weekly" | "monthly";
  recurrenceEndMode: "count" | "date" | "never";
  recurrenceCount: number;
  recurrenceUntil: string;
  accessLevels: string[];
};

type EventHostAssignmentInput = {
  hostId: string;
  role: "host" | "organizer" | "speaker" | "instructor" | "partner";
  isPrimary: boolean;
};

type EventTicketInput = {
  id?: string;
  name: string;
  description: string;
  priceCents: number;
  currency: string;
  capacity: number | null;
  saleStartsAt: string;
  saleEndsAt: string;
  maxPerOrder: number;
  status: "active" | "disabled" | "archived";
  accessLevels: string[];
};

type EventRsvpInput = {
  id?: string;
  name: string;
  description: string;
  capacity: number | null;
  startAt: string;
  endAt: string;
  collectAttendeeInfo: boolean;
  registrationFields: EventRegistrationField[];
  status: "active" | "disabled" | "archived";
};

type ZoomMeetingPayload = {
  id: number | string;
  topic?: string;
  join_url?: string;
  start_url?: string;
  host_email?: string;
  status?: string;
  occurrences?: Array<{ occurrence_id?: string | number; start_time?: string; duration?: number; status?: string }>;
};

const MEDIA_ASSET_SRC_RE =
  /\/api\/media\/assets\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi;

function value(formData: FormData, key: string) {
  return formData.get(key)?.toString().trim() ?? "";
}

function centsFromDollars(value: unknown) {
  const raw = String(value ?? "").replace(/[^0-9.]/g, "");
  if (!raw) return 0;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.round(parsed * 100);
}

function intOrNull(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : null;
}

function intOrDefault(value: unknown, fallback: number) {
  const parsed = intOrNull(value);
  return parsed && parsed > 0 ? parsed : fallback;
}

function intent(formData: FormData): EventInput["intent"] {
  const raw = value(formData, "intent");
  if (raw === "publish" || raw === "save" || raw === "unpublish") return raw;
  return "draft";
}

function parseInput(formData: FormData): EventInput {
  const ticketConfig = parseTicketConfig(value(formData, "ticket_config"), formData.getAll("access_levels"));
  const rsvpConfig = parseRsvpConfig(value(formData, "rsvp_config"));
  const hostAssignments = parseHostAssignments(value(formData, "host_assignments"));
  const legacyHostId = value(formData, "host_id");
  const rawRecurrenceEndMode = value(formData, "recurrence_end_mode");
  const recurrenceEndMode =
    rawRecurrenceEndMode === "date" || rawRecurrenceEndMode === "never" ? rawRecurrenceEndMode : "count";
  const rawRecurrenceCount = value(formData, "recurrence_count");
  const recurrenceCount = Math.min(Math.max(Number(rawRecurrenceCount || 0), 0), 50);
  const recurrenceUntil = recurrenceEndMode === "date" ? value(formData, "recurrence_until") : "";
  return {
    id: value(formData, "id") || undefined,
    intent: intent(formData),
    title: value(formData, "title"),
    excerpt: value(formData, "excerpt"),
    body: value(formData, "body"),
    imageUrl: value(formData, "image_url"),
    currentStatus: value(formData, "current_status") || "draft",
    typeId: value(formData, "type_id"),
    hostId: legacyHostId,
    hostName: value(formData, "host_name"),
    hostAssignments,
    venueId: value(formData, "venue_id"),
    venueName: value(formData, "venue_name"),
    venueAddress1: value(formData, "venue_address_line1"),
    venueCity: value(formData, "venue_city"),
    venueRegion: value(formData, "venue_region"),
    venuePostalCode: value(formData, "venue_postal_code"),
    venueCountry: value(formData, "venue_country") || "US",
    venueMapUrl: value(formData, "venue_map_url"),
    venueRoomName: value(formData, "venue_room_name"),
    venueNotes: value(formData, "venue_notes"),
    startsAt: value(formData, "starts_at"),
    endsAt: value(formData, "ends_at"),
    timezone: value(formData, "timezone") || "America/New_York",
    allDay: formData.get("all_day") === "on",
    virtualMode: ["manual", "zoom", "livekit"].includes(value(formData, "virtual_mode"))
      ? value(formData, "virtual_mode")
      : "none",
    ticketingMode: ticketConfig.mode,
    eventCapacity: intOrNull(value(formData, "event_capacity")),
    registrationPlacement: ["below_hero", "sidebar"].includes(value(formData, "registration_placement"))
      ? (value(formData, "registration_placement") as EventRegistrationPlacement)
      : "after_description",
    ticketTypes: ticketConfig.ticketTypes,
    rsvpEnabled: rsvpConfig.enabled,
    rsvpTypes: rsvpConfig.rsvpTypes,
    manualJoinUrl: value(formData, "manual_join_url"),
    replayUrl: value(formData, "replay_url"),
    zoomMode: value(formData, "zoom_mode") || "none",
    zoomConnectionId: value(formData, "zoom_connection_id"),
    zoomObjectType: value(formData, "zoom_object_type") === "webinar" ? "webinar" : "meeting",
    zoomObjectId: value(formData, "zoom_object_id"),
    zoomJoinUrl: value(formData, "zoom_join_url"),
    recurrenceFrequency: ["daily", "weekly", "monthly"].includes(value(formData, "recurrence_frequency"))
      ? (value(formData, "recurrence_frequency") as "daily" | "weekly" | "monthly")
      : "none",
    recurrenceEndMode,
    recurrenceCount: recurrenceEndMode === "never" || rawRecurrenceCount === "0" ? 0 : recurrenceCount || 1,
    recurrenceUntil,
    accessLevels: parseAccessLevels(formData.getAll("access_levels")),
  };
}

function parseRsvpConfig(raw: string): {
  enabled: boolean;
  rsvpTypes: EventRsvpInput[];
} {
  try {
    const parsed = JSON.parse(raw || "{}") as {
      enabled?: boolean;
      rsvpTypes?: Array<Record<string, unknown>>;
    };
    const enabled = parsed.enabled === true;
    const rsvpTypes = (Array.isArray(parsed.rsvpTypes) ? parsed.rsvpTypes : [])
      .map((rsvp): EventRsvpInput => {
        const status = rsvp.status === "disabled" || rsvp.status === "archived" ? rsvp.status : "active";
        return {
          id: typeof rsvp.id === "string" && rsvp.id ? rsvp.id : undefined,
          name: String(rsvp.name ?? "RSVP").trim() || "RSVP",
          description: String(rsvp.description ?? "").trim(),
          capacity: intOrNull(rsvp.capacity),
          startAt: String(rsvp.startAt ?? rsvp.start_at ?? "").trim(),
          endAt: String(rsvp.endAt ?? rsvp.end_at ?? "").trim(),
          collectAttendeeInfo: rsvp.collectAttendeeInfo === true || rsvp.collect_attendee_info === true,
          registrationFields: normalizeRegistrationFields(rsvp.registrationFields ?? rsvp.registration_fields),
          status,
        };
      })
      .filter((rsvp) => rsvp.name);

    return { enabled, rsvpTypes };
  } catch {
    return { enabled: false, rsvpTypes: [] };
  }
}

function parseHostAssignments(raw: string): EventHostAssignmentInput[] {
  try {
    const parsed = JSON.parse(raw || "[]") as Array<Record<string, unknown>>;
    const allowedRoles = new Set(["host", "organizer", "speaker", "instructor", "partner"]);
    const seen = new Set<string>();
    const rows = parsed
      .map((item): EventHostAssignmentInput | null => {
        const hostId = String(item.hostId ?? item.host_id ?? "").trim();
        if (!hostId || seen.has(hostId)) return null;
        seen.add(hostId);
        const role = String(item.role ?? "host").trim();
        return {
          hostId,
          role: allowedRoles.has(role) ? (role as EventHostAssignmentInput["role"]) : "host",
          isPrimary: item.isPrimary === true || item.is_primary === true,
        };
      })
      .filter((item): item is EventHostAssignmentInput => Boolean(item));

    if (rows.length > 0 && !rows.some((row) => row.isPrimary)) {
      rows[0].isPrimary = true;
    }
    if (rows.filter((row) => row.isPrimary).length > 1) {
      let primarySeen = false;
      return rows.map((row) => {
        if (!row.isPrimary) return row;
        if (!primarySeen) {
          primarySeen = true;
          return row;
        }
        return { ...row, isPrimary: false };
      });
    }
    return rows;
  } catch {
    return [];
  }
}

function parseTicketConfig(raw: string, fallbackAccessLevels: FormDataEntryValue[]): {
  mode: EventInput["ticketingMode"];
  ticketTypes: EventTicketInput[];
} {
  const fallbackLevels = parseAccessLevels(fallbackAccessLevels);
  try {
    const parsed = JSON.parse(raw || "{}") as {
      mode?: string;
      ticketTypes?: Array<Record<string, unknown>>;
    };
    const mode = parsed.mode === "ticket_required" ? "ticket_required" : "included";
    const ticketTypes = (Array.isArray(parsed.ticketTypes) ? parsed.ticketTypes : [])
      .map((ticket): EventTicketInput => {
        const status = ticket.status === "disabled" || ticket.status === "archived" ? ticket.status : "active";
        const accessLevels = parseAccessLevels(
          Array.isArray(ticket.accessLevels) ? ticket.accessLevels.map((value) => String(value)) : fallbackLevels
        );
        return {
          id: typeof ticket.id === "string" && ticket.id ? ticket.id : undefined,
          name: String(ticket.name ?? "").trim(),
          description: String(ticket.description ?? "").trim(),
          priceCents: centsFromDollars(ticket.priceDollars ?? ticket.price ?? ticket.priceCents),
          currency: String(ticket.currency ?? "usd").trim().toLowerCase() || "usd",
          capacity: intOrNull(ticket.capacity),
          saleStartsAt: String(ticket.saleStartsAt ?? ticket.sale_starts_at ?? "").trim(),
          saleEndsAt: String(ticket.saleEndsAt ?? ticket.sale_ends_at ?? "").trim(),
          maxPerOrder: intOrDefault(ticket.maxPerOrder, 4),
          status,
          accessLevels: accessLevels.length > 0 ? accessLevels : fallbackLevels,
        };
      })
      .filter((ticket) => ticket.name);

    return { mode, ticketTypes };
  } catch {
    return { mode: "included" as const, ticketTypes: [] };
  }
}

function toIso(value: string, timezone: string) {
  if (!value) return null;
  return fromZonedTime(value, timezone).toISOString();
}

function toZoomLocalDateTime(value: string) {
  if (!value) return null;
  return value.length === 16 ? `${value}:00` : value.replace(/\.\d{3}Z$/, "").replace(/Z$/, "");
}

function endOfDateIso(value: string, timezone: string) {
  if (!value) return null;
  return fromZonedTime(`${value}T23:59:59`, timezone).toISOString();
}

function targetStatus(input: EventInput, currentStatus = "draft") {
  if (input.intent === "publish") return "published";
  if (input.intent === "unpublish" || input.intent === "draft") return "draft";
  return currentStatus === "published" ? "published" : "draft";
}

function redirectForError(input: EventInput, error: string) {
  const target = input.id ? `/admin/events/${input.id}/edit` : "/admin/events/new";
  redirect(`${target}?error=${error}`);
}

async function maybeCreateHost(input: EventInput) {
  if (input.hostId) return input.hostId;
  if (!input.hostName) return null;
  const supabase = asLooseSupabaseClient(getAdminClient());
  const slug = await uniqueResourceSlug("event_host", input.hostName);
  const { data, error } = await supabase
    .from("event_host")
    .insert({
      name: input.hostName,
      slug,
      type: "person",
      status: "published",
      is_active: true,
    })
    .select<{ id: string }>("id")
    .single();
  if (error) throw new Error(error.message);
  return data?.id ?? null;
}

async function maybeCreateVenue(input: EventInput) {
  if (input.venueId) return input.venueId;
  if (!input.venueName) return null;
  const supabase = asLooseSupabaseClient(getAdminClient());
  const slug = await uniqueResourceSlug("event_venue", input.venueName);
  const { data, error } = await supabase
    .from("event_venue")
    .insert({
      name: input.venueName,
      slug,
      address_line1: input.venueAddress1 || null,
      city: input.venueCity || null,
      region: input.venueRegion || null,
      postal_code: input.venuePostalCode || null,
      country: input.venueCountry || null,
      map_url: input.venueMapUrl || null,
      is_virtual: false,
      status: "published",
      is_active: true,
    })
    .select<{ id: string }>("id")
    .single();
  if (error) throw new Error(error.message);
  return data?.id ?? null;
}

async function saveAccessLevels(eventId: string, accessLevels: string[]) {
  const supabase = asLooseSupabaseClient(getAdminClient());
  await supabase.from("member_event_access_level").delete().eq("event_id", eventId);
  if (accessLevels.length === 0) return;
  const { error } = await supabase
    .from("member_event_access_level")
    .insert(accessLevels.map((subscription_tier) => ({ event_id: eventId, subscription_tier })));
  if (error) throw new Error(error.message);
}

async function saveHostAssignments(eventIds: string[], assignments: EventHostAssignmentInput[]) {
  const supabase = asLooseSupabaseClient(getAdminClient());
  for (const eventId of eventIds) {
    const { error: deleteError } = await supabase.from("event_host_assignment").delete().eq("event_id", eventId);
    if (deleteError) throw new Error(deleteError.message);

    if (assignments.length === 0) continue;

    const rows = assignments.map((assignment, index) => ({
      event_id: eventId,
      host_id: assignment.hostId,
      role: assignment.role,
      sort_order: (index + 1) * 10,
      is_primary: assignment.isPrimary,
    }));
    const { error } = await supabase.from("event_host_assignment").insert(rows);
    if (error) throw new Error(error.message);
  }
}

async function saveTicketTypes(eventId: string, input: EventInput) {
  const supabase = asLooseSupabaseClient(getAdminClient());

  if (input.ticketingMode !== "ticket_required") {
    const { error } = await supabase
      .from("event_ticket_type")
      .update({ status: "archived", updated_at: new Date().toISOString() })
      .eq("event_id", eventId)
      .neq("status", "archived");
    if (error) throw new Error(error.message);
    return;
  }

  const seenIds = new Set<string>();
  const fallbackAccessLevels = input.accessLevels.length > 0
    ? input.accessLevels
    : EVENT_ACCESS_LEVELS.map((level) => level.value);

  for (const [index, ticket] of input.ticketTypes.entries()) {
    const row = {
      event_id: eventId,
      name: ticket.name,
      description: ticket.description || null,
      price_cents: ticket.priceCents,
      currency: ticket.currency || "usd",
      capacity: ticket.capacity,
      sale_starts_at: toIso(ticket.saleStartsAt, input.timezone),
      sale_ends_at: toIso(ticket.saleEndsAt, input.timezone),
      max_per_order: ticket.maxPerOrder,
      status: ticket.status,
      sort_order: (index + 1) * 10,
      updated_at: new Date().toISOString(),
    };

    const result = ticket.id
      ? await supabase.from("event_ticket_type").update(row).eq("id", ticket.id).eq("event_id", eventId).select<{ id: string }>("id").single()
      : await supabase.from("event_ticket_type").insert(row).select<{ id: string }>("id").single();

    if (result.error || !result.data) throw new Error(result.error?.message ?? "Ticket type could not be saved.");
    const ticketTypeId = result.data.id;
    seenIds.add(ticketTypeId);

    await supabase.from("event_ticket_type_access_level").delete().eq("ticket_type_id", ticketTypeId);
    const accessLevels = ticket.accessLevels.length > 0 ? ticket.accessLevels : fallbackAccessLevels;
    const { error: accessError } = await supabase
      .from("event_ticket_type_access_level")
      .insert(accessLevels.map((subscription_tier) => ({ ticket_type_id: ticketTypeId, subscription_tier })));
    if (accessError) throw new Error(accessError.message);
  }

  const { data: existing, error: existingError } = await supabase
    .from("event_ticket_type")
    .select<Array<{ id: string }>>("id")
    .eq("event_id", eventId)
    .neq("status", "archived");
  if (existingError) throw new Error(existingError.message);

  const staleIds = (existing ?? []).map((row) => row.id).filter((id) => !seenIds.has(id));
  if (staleIds.length > 0) {
    const { error } = await supabase
      .from("event_ticket_type")
      .update({ status: "archived", updated_at: new Date().toISOString() })
      .in("id", staleIds);
    if (error) throw new Error(error.message);
  }
}

async function saveRsvpTypes(eventId: string, input: EventInput) {
  const supabase = asLooseSupabaseClient(getAdminClient());

  if (!input.rsvpEnabled) {
    const { error } = await supabase
      .from("event_rsvp_type")
      .update({ status: "archived", updated_at: new Date().toISOString() })
      .eq("event_id", eventId)
      .neq("status", "archived");
    if (error) throw new Error(error.message);
    return;
  }

  const seenIds = new Set<string>();
  const rsvpTypes = input.rsvpTypes.length > 0
    ? input.rsvpTypes
    : [{
        name: "RSVP",
        description: "",
        capacity: null,
        startAt: "",
        endAt: input.startsAt,
        collectAttendeeInfo: false,
        registrationFields: [],
        status: "active" as const,
      }];

  for (const [index, rsvp] of rsvpTypes.entries()) {
    const row = {
      event_id: eventId,
      name: rsvp.name || "RSVP",
      description: rsvp.description || null,
      capacity: rsvp.capacity,
      start_at: toIso(rsvp.startAt, input.timezone),
      end_at: toIso(rsvp.endAt, input.timezone),
      collect_attendee_info: rsvp.collectAttendeeInfo,
      registration_fields: normalizeRegistrationFields(rsvp.registrationFields),
      status: rsvp.status,
      sort_order: (index + 1) * 10,
      updated_at: new Date().toISOString(),
    };

    let result = rsvp.id
      ? await supabase.from("event_rsvp_type").update(row).eq("id", rsvp.id).eq("event_id", eventId).select<{ id: string }>("id").single()
      : await supabase.from("event_rsvp_type").insert(row).select<{ id: string }>("id").single();

    if (result.error?.message.includes("registration_fields")) {
      const { registration_fields: removedRegistrationFields, ...compatRow } = row;
      void removedRegistrationFields;
      result = rsvp.id
        ? await supabase.from("event_rsvp_type").update(compatRow).eq("id", rsvp.id).eq("event_id", eventId).select<{ id: string }>("id").single()
        : await supabase.from("event_rsvp_type").insert(compatRow).select<{ id: string }>("id").single();
    }

    if (result.error || !result.data) throw new Error(result.error?.message ?? "RSVP could not be saved.");
    seenIds.add(result.data.id);
  }

  const { data: existing, error: existingError } = await supabase
    .from("event_rsvp_type")
    .select<Array<{ id: string }>>("id")
    .eq("event_id", eventId)
    .neq("status", "archived");
  if (existingError) throw new Error(existingError.message);

  const staleIds = (existing ?? []).map((row) => row.id).filter((id) => !seenIds.has(id));
  if (staleIds.length > 0) {
    const { error } = await supabase
      .from("event_rsvp_type")
      .update({ status: "archived", updated_at: new Date().toISOString() })
      .in("id", staleIds);
    if (error) throw new Error(error.message);
  }
}

function extractEventBodyAssetIds(html: string | null | undefined) {
  if (!html) return [];
  const ids = new Set<string>();
  for (const match of html.matchAll(MEDIA_ASSET_SRC_RE)) {
    ids.add(match[1]);
  }
  return [...ids];
}

async function syncEventBodyMediaAssets(eventId: string, body: string | null | undefined) {
  const supabase = asLooseSupabaseClient(getAdminClient());
  await supabase
    .from("member_event_media_asset")
    .delete()
    .eq("event_id", eventId)
    .eq("usage", "body_image");

  const assetIds = extractEventBodyAssetIds(body);
  if (assetIds.length === 0) return;

  const { data, error } = await supabase
    .from("media_asset")
    .select<Array<{ id: string }>>("id")
    .in("id", assetIds)
    .eq("kind", "image")
    .eq("usage_context", "event")
    .eq("status", "active");

  if (error) throw new Error(error.message);

  const validIds = (data ?? []).map((asset) => asset.id);
  if (validIds.length === 0) return;

  const { error: insertError } = await supabase
    .from("member_event_media_asset")
    .insert(validIds.map((asset_id) => ({ event_id: eventId, asset_id, usage: "body_image" })));

  if (insertError) throw new Error(insertError.message);
}

function baseEventRow(input: EventInput, userId: string, hostId: string | null, venueId: string | null, status: string) {
  const startsAt = toIso(input.startsAt, input.timezone);
  const endsAt = toIso(input.endsAt, input.timezone);
  if (!startsAt || !endsAt) throw new Error("Event start and end are required.");

  return {
    type_id: input.typeId || null,
    host_id: hostId,
    venue_id: venueId,
    venue_room_name: input.venueRoomName || null,
    venue_notes: input.venueNotes || null,
    title: input.title,
    excerpt: input.excerpt || null,
    description: input.excerpt || null,
    body: sanitizeEventHtml(input.body),
    image_url: input.imageUrl || null,
    status,
    starts_at: startsAt,
    ends_at: endsAt,
    timezone: input.timezone,
    all_day: input.allDay,
    visibility: "member",
    virtual_mode: input.virtualMode,
    ticketing_mode: input.ticketingMode,
    event_capacity: input.eventCapacity,
    registration_placement: input.registrationPlacement,
    manual_join_url: input.virtualMode === "manual" ? input.manualJoinUrl || null : null,
    replay_url: input.replayUrl || null,
    created_by: userId,
    updated_at: new Date().toISOString(),
  };
}

function zoomWeeklyDay(date: Date, timezone: string) {
  const isoLocalDay = Number(formatInTimeZone(date, timezone, "i"));
  return String(isoLocalDay === 7 ? 1 : isoLocalDay + 1);
}

function zoomRecurrence(input: EventInput, startsAt: string) {
  if (input.recurrenceFrequency === "none") return null;
  const end = input.recurrenceUntil
    ? { end_date_time: endOfDateIso(input.recurrenceUntil, input.timezone) }
    : { end_times: input.recurrenceCount > 0 ? input.recurrenceCount : MAX_GENERATED_OCCURRENCES };
  const startDate = new Date(startsAt);
  if (input.recurrenceFrequency === "daily") {
    return { type: 1, repeat_interval: 1, ...end };
  }
  if (input.recurrenceFrequency === "weekly") {
    return { type: 2, repeat_interval: 1, weekly_days: zoomWeeklyDay(startDate, input.timezone), ...end };
  }
  return {
    type: 3,
    repeat_interval: 1,
    monthly_day: Number(formatInTimeZone(startDate, input.timezone, "d")),
    ...end,
  };
}

async function createZoomMeeting(params: {
  input: EventInput;
  startsAt: string;
  endsAt: string;
  recurring?: boolean;
}) {
  if (params.input.virtualMode !== "zoom" || params.input.zoomMode !== "create" || !params.input.zoomConnectionId) {
    return null;
  }

  const durationMinutes = Math.max(
    1,
    Math.round((new Date(params.endsAt).getTime() - new Date(params.startsAt).getTime()) / 60000)
  );
  const path =
    params.input.zoomObjectType === "webinar" ? "/users/me/webinars" : "/users/me/meetings";
  const recurrence = params.recurring ? zoomRecurrence(params.input, params.startsAt) : null;
  const startTime = toZoomLocalDateTime(params.input.startsAt);
  if (!startTime) throw new Error("Zoom start time is required.");

  return zoomApi<ZoomMeetingPayload>(params.input.zoomConnectionId, path, {
    method: "POST",
    body: JSON.stringify({
      topic: params.input.title,
      type: recurrence ? (params.input.zoomObjectType === "webinar" ? 9 : 8) : (params.input.zoomObjectType === "webinar" ? 5 : 2),
      start_time: startTime,
      duration: durationMinutes,
      timezone: params.input.timezone,
      ...(recurrence ? { recurrence } : {}),
      settings: {
        join_before_host: false,
        waiting_room: true,
        approval_type: 2,
        registration_type: 1,
      },
    }),
  });
}

async function saveZoomMeetingForEvents(eventIds: string[], input: EventInput, response: ZoomMeetingPayload) {
  const supabase = asLooseSupabaseClient(getAdminClient());
  const rows = eventIds.map((eventId) => ({
      event_id: eventId,
      zoom_connection_id: input.zoomConnectionId,
      zoom_object_type: input.zoomObjectType,
      zoom_object_id: String(response.id),
      topic: response.topic ?? input.title,
      join_url: response.join_url ?? null,
      start_url_ciphertext: encryptSecret(response.start_url),
      host_email: response.host_email ?? null,
      provider_status: response.status ?? null,
      raw_metadata: response,
      updated_at: new Date().toISOString(),
  }));
  const { error } = await supabase.from("event_zoom_meeting").upsert(
    rows,
    { onConflict: "event_id" }
  );
  if (error) throw new Error(error.message);
}

async function saveSelectedZoomMeeting(eventIds: string[], input: EventInput) {
  if (input.virtualMode !== "zoom" || input.zoomMode !== "existing") return;
  const supabase = asLooseSupabaseClient(getAdminClient());
  const { error } = await supabase.from("event_zoom_meeting").upsert(
    eventIds.map((eventId) => ({
      event_id: eventId,
      zoom_connection_id: input.zoomConnectionId || null,
      zoom_object_type: input.zoomObjectType,
      zoom_object_id: input.zoomObjectId || null,
      topic: input.title,
      join_url: input.zoomJoinUrl || null,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: "event_id" }
  );
  if (error) throw new Error(error.message);
}

async function assertLiveKitPublishReady(input: EventInput, desiredStatus: string) {
  if (desiredStatus !== "published" || input.virtualMode !== "livekit") return;
  const health = await getLiveKitEventHealth();
  if (health.roomService !== "ok" || health.egressService !== "ok") {
    redirectForError(input, "livekit_setup_required");
  }
}

async function saveLiveKitRooms(eventIds: string[], input: EventInput) {
  const supabase = asLooseSupabaseClient(getAdminClient());
  if (input.virtualMode !== "livekit") {
    await supabase.from("event_livekit_room").delete().in("event_id", eventIds);
    return;
  }

  for (const eventId of eventIds) {
    const roomName = liveKitEventRoomName(eventId);
    try {
      await supabase.from("event_livekit_room").upsert(
        {
          event_id: eventId,
          room_name: roomName,
          mode: "webinar",
          recording_policy: "auto",
          room_status: "provisioned",
          egress_status: "pending",
          last_error: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "event_id" }
      );
      await ensureLiveKitEventRoom({
        eventId,
        title: input.title,
      });
      await supabase.from("event_livekit_room").upsert(
        {
          event_id: eventId,
          room_name: roomName,
          mode: "webinar",
          recording_policy: "auto",
          room_status: "provisioned",
          egress_status: "pending",
          last_error: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "event_id" }
      );
    } catch (error) {
      await supabase.from("event_livekit_room").upsert(
        {
          event_id: eventId,
          room_name: roomName,
          mode: "webinar",
          recording_policy: "auto",
          room_status: "failed",
          egress_status: "pending",
          last_error: error instanceof Error ? error.message : String(error),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "event_id" }
      );
      if (targetStatus(input, input.currentStatus) === "published") {
        throw error;
      }
    }
  }
}

export async function saveEvent(formData: FormData) {
  const user = await requireAdmin();
  const input = parseInput(formData);
  if (!input.title) redirectForError(input, "title_required");
  if (input.accessLevels.length === 0) redirectForError(input, "access_required");

  const supabase = asLooseSupabaseClient(getAdminClient());
  let draftFallbackId: string | null = null;

  try {
    const hostId = await maybeCreateHost(input);
    const hostAssignments = input.hostAssignments.length > 0
      ? input.hostAssignments
      : hostId
        ? [{ hostId, role: "host" as const, isPrimary: true }]
        : [];
    const primaryHostId = hostAssignments.find((assignment) => assignment.isPrimary)?.hostId ?? hostAssignments[0]?.hostId ?? null;
    const venueId = await maybeCreateVenue(input);
    let currentStatus = input.currentStatus;

    let hasExistingZoom = false;

    if (input.id) {
      const { data: current } = await supabase
        .from("member_event")
        .select<{ status: string }>("status")
        .eq("id", input.id)
        .maybeSingle();
      currentStatus = current?.status ?? currentStatus;

      const { data: currentZoom } = await supabase
        .from("event_zoom_meeting")
        .select<{ id: string }>("id")
        .eq("event_id", input.id)
        .maybeSingle();
      hasExistingZoom = Boolean(currentZoom?.id);
    }

    const desiredStatus = targetStatus(input, currentStatus);
    await assertLiveKitPublishReady(input, desiredStatus);
    if (desiredStatus === "published" && input.virtualMode === "manual" && !input.manualJoinUrl) {
      redirectForError(input, "manual_join_url_required");
    }
    if (input.virtualMode === "zoom" && input.zoomMode === "create" && !input.zoomConnectionId) {
      redirectForError(input, "zoom_connection_required");
    }
    if (
      input.virtualMode === "zoom" &&
      input.zoomMode === "existing" &&
      (!input.zoomConnectionId || !input.zoomObjectId)
    ) {
      redirectForError(input, "zoom_session_required");
    }
    if (
      desiredStatus === "published" &&
      input.virtualMode === "zoom" &&
      input.zoomMode === "none" &&
      !hasExistingZoom
    ) {
      redirectForError(input, "zoom_setup_required");
    }
    if (
      desiredStatus === "published" &&
      input.ticketingMode === "ticket_required" &&
      input.ticketTypes.filter((ticket) => ticket.status === "active").length === 0
    ) {
      redirectForError(input, "ticket_required");
    }

    const row = baseEventRow(input, user.id, primaryHostId, venueId, desiredStatus);

    if (input.id) {
      const zoomResponse = await createZoomMeeting({
        input,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
        recurring: false,
      });
      const { error } = await supabase.from("member_event").update(row).eq("id", input.id);
      if (error) throw new Error(error.message);
      await saveAccessLevels(input.id, input.accessLevels);
      await saveHostAssignments([input.id], hostAssignments);
      await saveTicketTypes(input.id, input);
      await saveRsvpTypes(input.id, input);
      await syncEventBodyMediaAssets(input.id, row.body);
      await saveLiveKitRooms([input.id], input);
      await saveSelectedZoomMeeting([input.id], input);
      if (zoomResponse) await saveZoomMeetingForEvents([input.id], input, zoomResponse);
      revalidatePath("/events");
      revalidatePath("/admin/events");
      redirect(`/admin/events/${input.id}/edit?success=${input.intent === "publish" ? "published" : input.intent === "unpublish" ? "unpublished" : "updated"}`);
    }

    if (input.recurrenceFrequency !== "none") {
      const startsAt = new Date(row.starts_at);
      const endsAt = new Date(row.ends_at);
      const seriesId = randomUUID();
      const occurrences = expandOccurrences({
        startsAt,
        endsAt,
        frequency: input.recurrenceFrequency,
        interval: 1,
        count: input.recurrenceUntil ? 0 : input.recurrenceCount,
        until: input.recurrenceUntil ? fromZonedTime(`${input.recurrenceUntil}T23:59:59`, input.timezone) : null,
      });
      const { error: seriesError } = await supabase.from("event_series").insert({
        id: seriesId,
        title: input.title,
        recurrence_frequency: input.recurrenceFrequency,
        starts_at: row.starts_at,
        ends_at: row.ends_at,
        timezone: input.timezone,
        occurrence_count: input.recurrenceUntil ? null : input.recurrenceCount,
        recurrence_until: endOfDateIso(input.recurrenceUntil, input.timezone),
        created_by: user.id,
      });
      if (seriesError) throw new Error(seriesError.message);

      const insertStatus = input.virtualMode === "zoom" && input.zoomMode === "create" ? "draft" : desiredStatus;
      const rows = occurrences.map((occurrence) => ({
        ...row,
        series_id: seriesId,
        status: insertStatus,
        starts_at: occurrence.startsAt.toISOString(),
        ends_at: occurrence.endsAt.toISOString(),
      }));
      const { data, error } = await supabase.from("member_event").insert(rows).select<{ id: string; starts_at: string; ends_at: string }>("id, starts_at, ends_at");
      if (error) throw new Error(error.message);
      const createdEvents = (data ?? []) as unknown as Array<{ id: string; starts_at: string; ends_at: string }>;
      draftFallbackId = createdEvents[0]?.id ?? null;
      for (const event of createdEvents) {
        await saveAccessLevels(event.id, input.accessLevels);
        await saveHostAssignments([event.id], hostAssignments);
        await saveTicketTypes(event.id, input);
        await saveRsvpTypes(event.id, input);
        await syncEventBodyMediaAssets(event.id, row.body);
      }
      const first = createdEvents[0];
      if (first) {
        const eventIds = createdEvents.map((event) => event.id);
        await saveLiveKitRooms(eventIds, input);
        await saveSelectedZoomMeeting(eventIds, input);
        const zoomResponse = await createZoomMeeting({ input, startsAt: first.starts_at, endsAt: first.ends_at, recurring: true });
        if (zoomResponse) {
          await saveZoomMeetingForEvents(eventIds, input, zoomResponse);
          if (desiredStatus === "published") {
            const { error: publishError } = await supabase.from("member_event").update({ status: "published", updated_at: new Date().toISOString() }).in("id", eventIds);
            if (publishError) throw new Error(publishError.message);
          }
        }
      }
      revalidatePath("/events");
      revalidatePath("/admin/events");
      redirect(`/admin/events?success=${desiredStatus === "published" ? "published_series" : "created_series"}`);
    }

    const zoomResponse = await createZoomMeeting({
      input,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      recurring: false,
    });
    const { data, error } = await supabase
      .from("member_event")
      .insert(row)
      .select<{ id: string; starts_at: string; ends_at: string }>("id, starts_at, ends_at")
      .single();
    if (error || !data) throw new Error(error?.message ?? "Event insert failed.");
    draftFallbackId = data.id;
    await saveAccessLevels(data.id, input.accessLevels);
    await saveHostAssignments([data.id], hostAssignments);
    await saveTicketTypes(data.id, input);
    await saveRsvpTypes(data.id, input);
    await syncEventBodyMediaAssets(data.id, row.body);
    await saveLiveKitRooms([data.id], input);
    await saveSelectedZoomMeeting([data.id], input);
    if (zoomResponse) await saveZoomMeetingForEvents([data.id], input, zoomResponse);
    revalidatePath("/events");
    revalidatePath("/admin/events");
    redirect(`/admin/events/${data.id}/edit?success=${desiredStatus === "published" ? "published" : "draft_saved"}`);
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "digest" in error &&
      String((error as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    console.error("[saveEvent]", error);
    if (draftFallbackId) {
      redirect(`/admin/events/${draftFallbackId}/edit?error=zoom_create_failed`);
    }
    redirect(input.id ? `/admin/events/${input.id}/edit?error=save_failed` : "/admin/events/new?error=save_failed");
  }
}

export async function archiveEvent(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id")?.toString();
  if (!id) return;
  const supabase = asLooseSupabaseClient(getAdminClient());
  await supabase.from("member_event").update({ status: "archived" }).eq("id", id);
  revalidatePath("/events");
  revalidatePath("/admin/events");
  redirect("/admin/events?success=archived");
}

export async function detachEventZoomSession(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id")?.toString();
  if (!id) return;

  const supabase = asLooseSupabaseClient(getAdminClient());
  const { error } = await supabase.from("event_zoom_meeting").delete().eq("event_id", id);
  if (error) {
    console.error("[detachEventZoomSession]", error.message);
    redirect(`/admin/events/${id}/edit?error=zoom_detach_failed`);
  }

  revalidatePath("/events");
  revalidatePath("/admin/events");
  revalidatePath(`/admin/events/${id}/edit`);
  redirect(`/admin/events/${id}/edit?success=zoom_detached`);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function uniqueEventTypeSlug(name: string) {
  const supabase = asLooseSupabaseClient(getAdminClient());
  const base = slugify(name) || "event-type";
  const { data } = await supabase
    .from("event_type")
    .select<{ slug: string }>("slug")
    .gte("slug", base)
    .lt("slug", `${base}\uffff`);
  const rows = (data ?? []) as unknown as Array<{ slug: string }>;
  const existing = new Set(rows.map((row) => row.slug));
  if (!existing.has(base)) return base;
  let index = 2;
  while (existing.has(`${base}-${index}`)) index += 1;
  return `${base}-${index}`;
}

async function uniqueResourceSlug(table: "event_host" | "event_venue", name: string) {
  const supabase = asLooseSupabaseClient(getAdminClient());
  const base = slugify(name) || (table === "event_host" ? "host" : "venue");
  const { data } = await supabase
    .from(table)
    .select<{ slug: string }>("slug")
    .gte("slug", base)
    .lt("slug", `${base}\uffff`);
  const rows = (data ?? []) as unknown as Array<{ slug: string }>;
  const existing = new Set(rows.map((row) => row.slug));
  if (!existing.has(base)) return base;
  let index = 2;
  while (existing.has(`${base}-${index}`)) index += 1;
  return `${base}-${index}`;
}

export async function createInlineEventType(input: {
  name: string;
  description?: string;
  color?: string;
}): Promise<{ ok: true; item: EventTypeOption } | { ok: false; error: string }> {
  await requireAdmin();
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Name is required." };

  const supabase = asLooseSupabaseClient(getAdminClient());
  const slug = await uniqueEventTypeSlug(name);
  const { data, error } = await supabase
    .from("event_type")
    .insert({
      name,
      slug,
      description: input.description?.trim() || null,
      color: input.color?.trim() || "#2EC4B6",
      sort_order: 100,
      is_active: true,
    })
    .select<EventTypeOption>("id, slug, name, description, color")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "Could not create event type." };
  revalidatePath("/admin/events");
  return { ok: true, item: data as unknown as EventTypeOption };
}

export async function createInlineEventHost(input: {
  name: string;
  email?: string;
  bio?: string;
  image_url?: string;
}): Promise<{ ok: true; item: EventHostOption } | { ok: false; error: string }> {
  await requireAdmin();
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Name is required." };

  const supabase = asLooseSupabaseClient(getAdminClient());
  const slug = await uniqueResourceSlug("event_host", name);
  const { data, error } = await supabase
    .from("event_host")
    .insert({
      name,
      slug,
      type: "person",
      email: input.email?.trim() || null,
      bio: input.bio?.trim() || null,
      image_url: input.image_url?.trim() || null,
      status: "published",
      is_active: true,
    })
    .select<EventHostOption>("id, slug, name, type, bio, image_url, email, phone, website_url, social_links, contact_visibility, status, brand_logo_url, support_email")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "Could not create host." };
  revalidatePath("/admin/events");
  return { ok: true, item: data as unknown as EventHostOption };
}

export async function createInlineEventVenue(input: {
  name: string;
  is_virtual?: boolean;
  address_line1?: string;
  city?: string;
  region?: string;
  postal_code?: string;
  country?: string;
  map_url?: string;
}): Promise<{ ok: true; item: EventVenueOption } | { ok: false; error: string }> {
  await requireAdmin();
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Name is required." };

  const supabase = asLooseSupabaseClient(getAdminClient());
  const slug = await uniqueResourceSlug("event_venue", name);
  const { data, error } = await supabase
    .from("event_venue")
    .insert({
      name,
      slug,
      is_virtual: Boolean(input.is_virtual),
      address_line1: input.address_line1?.trim() || null,
      city: input.city?.trim() || null,
      region: input.region?.trim() || null,
      postal_code: input.postal_code?.trim() || null,
      country: input.country?.trim() || "US",
      map_url: input.map_url?.trim() || null,
      status: "published",
      is_active: true,
    })
    .select<EventVenueOption>("id, slug, name, description, featured_image_url, address_line1, address_line2, city, region, postal_code, country, email, phone, website_url, map_url, show_map, show_map_link, accessibility_notes, parking_notes, is_virtual, status")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "Could not create venue." };
  revalidatePath("/admin/events");
  return { ok: true, item: data as unknown as EventVenueOption };
}
