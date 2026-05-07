"use server";

import { randomUUID } from "node:crypto";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";
import { parseAccessLevels } from "@/lib/events/types";
import type { EventHostOption, EventTypeOption, EventVenueOption } from "@/lib/events/types";
import { expandOccurrences } from "@/lib/events/recurrence";
import { zoomApi } from "@/lib/zoom/client";
import { encryptSecret } from "@/lib/zoom/crypto";
import { sanitizeEventHtml } from "@/lib/content/sanitize-event-html";

type EventInput = {
  id?: string;
  intent: "draft" | "publish" | "save" | "unpublish";
  title: string;
  excerpt: string;
  body: string;
  currentStatus: string;
  typeId: string;
  hostId: string;
  hostName: string;
  venueId: string;
  venueName: string;
  venueAddress1: string;
  venueCity: string;
  venueRegion: string;
  venuePostalCode: string;
  venueCountry: string;
  venueMapUrl: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  allDay: boolean;
  virtualMode: string;
  manualJoinUrl: string;
  replayUrl: string;
  zoomMode: string;
  zoomConnectionId: string;
  zoomObjectType: "meeting" | "webinar";
  zoomObjectId: string;
  zoomJoinUrl: string;
  recurrenceFrequency: "none" | "daily" | "weekly" | "monthly";
  recurrenceCount: number;
  recurrenceUntil: string;
  accessLevels: string[];
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

function intent(formData: FormData): EventInput["intent"] {
  const raw = value(formData, "intent");
  if (raw === "publish" || raw === "save" || raw === "unpublish") return raw;
  return "draft";
}

function parseInput(formData: FormData): EventInput {
  return {
    id: value(formData, "id") || undefined,
    intent: intent(formData),
    title: value(formData, "title"),
    excerpt: value(formData, "excerpt"),
    body: value(formData, "body"),
    currentStatus: value(formData, "current_status") || "draft",
    typeId: value(formData, "type_id"),
    hostId: value(formData, "host_id"),
    hostName: value(formData, "host_name"),
    venueId: value(formData, "venue_id"),
    venueName: value(formData, "venue_name"),
    venueAddress1: value(formData, "venue_address_line1"),
    venueCity: value(formData, "venue_city"),
    venueRegion: value(formData, "venue_region"),
    venuePostalCode: value(formData, "venue_postal_code"),
    venueCountry: value(formData, "venue_country") || "US",
    venueMapUrl: value(formData, "venue_map_url"),
    startsAt: value(formData, "starts_at"),
    endsAt: value(formData, "ends_at"),
    timezone: value(formData, "timezone") || "America/New_York",
    allDay: formData.get("all_day") === "on",
    virtualMode: value(formData, "virtual_mode") || "none",
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
    recurrenceCount: Math.min(Math.max(Number(value(formData, "recurrence_count") || 1), 1), 50),
    recurrenceUntil: value(formData, "recurrence_until"),
    accessLevels: parseAccessLevels(formData.getAll("access_levels")),
  };
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
  const { data, error } = await supabase
    .from("event_host")
    .insert({ name: input.hostName, is_active: true })
    .select<{ id: string }>("id")
    .single();
  if (error) throw new Error(error.message);
  return data?.id ?? null;
}

async function maybeCreateVenue(input: EventInput) {
  if (input.venueId) return input.venueId;
  if (!input.venueName) return null;
  const supabase = asLooseSupabaseClient(getAdminClient());
  const { data, error } = await supabase
    .from("event_venue")
    .insert({
      name: input.venueName,
      address_line1: input.venueAddress1 || null,
      city: input.venueCity || null,
      region: input.venueRegion || null,
      postal_code: input.venuePostalCode || null,
      country: input.venueCountry || null,
      map_url: input.venueMapUrl || null,
      is_virtual: false,
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
    title: input.title,
    excerpt: input.excerpt || null,
    description: input.excerpt || null,
    body: sanitizeEventHtml(input.body),
    status,
    starts_at: startsAt,
    ends_at: endsAt,
    timezone: input.timezone,
    all_day: input.allDay,
    visibility: "member",
    virtual_mode: input.virtualMode,
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
    : { end_times: input.recurrenceCount };
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

export async function saveEvent(formData: FormData) {
  const user = await requireAdmin();
  const input = parseInput(formData);
  if (!input.title) redirectForError(input, "title_required");
  if (input.accessLevels.length === 0) redirectForError(input, "access_required");

  const supabase = asLooseSupabaseClient(getAdminClient());
  let draftFallbackId: string | null = null;

  try {
    const hostId = await maybeCreateHost(input);
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

    const row = baseEventRow(input, user.id, hostId, venueId, desiredStatus);

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
      await syncEventBodyMediaAssets(input.id, row.body);
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
        count: input.recurrenceUntil ? 50 : input.recurrenceCount,
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
        await syncEventBodyMediaAssets(event.id, row.body);
      }
      const first = createdEvents[0];
      if (first) {
        const eventIds = createdEvents.map((event) => event.id);
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
    await syncEventBodyMediaAssets(data.id, row.body);
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
  const { data, error } = await supabase
    .from("event_host")
    .insert({
      name,
      email: input.email?.trim() || null,
      bio: input.bio?.trim() || null,
      image_url: input.image_url?.trim() || null,
      is_active: true,
    })
    .select<EventHostOption>("id, name, bio, image_url, email")
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
  const { data, error } = await supabase
    .from("event_venue")
    .insert({
      name,
      is_virtual: Boolean(input.is_virtual),
      address_line1: input.address_line1?.trim() || null,
      city: input.city?.trim() || null,
      region: input.region?.trim() || null,
      postal_code: input.postal_code?.trim() || null,
      country: input.country?.trim() || "US",
      map_url: input.map_url?.trim() || null,
      is_active: true,
    })
    .select<EventVenueOption>("id, name, description, address_line1, address_line2, city, region, postal_code, country, map_url, is_virtual")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "Could not create venue." };
  revalidatePath("/admin/events");
  return { ok: true, item: data as unknown as EventVenueOption };
}
