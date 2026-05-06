"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";
import { parseAccessLevels } from "@/lib/events/types";
import { expandOccurrences } from "@/lib/events/recurrence";
import { zoomApi } from "@/lib/zoom/client";
import { encryptSecret } from "@/lib/zoom/crypto";

type EventInput = {
  id?: string;
  title: string;
  excerpt: string;
  description: string;
  status: string;
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

function value(formData: FormData, key: string) {
  return formData.get(key)?.toString().trim() ?? "";
}

function parseInput(formData: FormData): EventInput {
  return {
    id: value(formData, "id") || undefined,
    title: value(formData, "title"),
    excerpt: value(formData, "excerpt"),
    description: value(formData, "description"),
    status: value(formData, "status") || "draft",
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
    recurrenceCount: Math.min(Math.max(Number(value(formData, "recurrence_count") || 1), 1), 60),
    recurrenceUntil: value(formData, "recurrence_until"),
    accessLevels: parseAccessLevels(formData.getAll("access_levels")),
  };
}

function toIso(value: string) {
  if (!value) return null;
  return new Date(value).toISOString();
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

function baseEventRow(input: EventInput, userId: string, hostId: string | null, venueId: string | null) {
  const startsAt = toIso(input.startsAt);
  const endsAt = toIso(input.endsAt);
  if (!startsAt || !endsAt) throw new Error("Event start and end are required.");

  return {
    type_id: input.typeId || null,
    host_id: hostId,
    venue_id: venueId,
    title: input.title,
    excerpt: input.excerpt || null,
    description: input.description || null,
    status: input.status,
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

async function createZoomMeetingForEvent(params: {
  eventId: string;
  input: EventInput;
  startsAt: string;
  endsAt: string;
}) {
  if (params.input.virtualMode !== "zoom" || params.input.zoomMode !== "create" || !params.input.zoomConnectionId) {
    return;
  }

  const durationMinutes = Math.max(
    1,
    Math.round((new Date(params.endsAt).getTime() - new Date(params.startsAt).getTime()) / 60000)
  );
  const path =
    params.input.zoomObjectType === "webinar" ? "/users/me/webinars" : "/users/me/meetings";
  const response = await zoomApi<{
    id: number | string;
    topic?: string;
    join_url?: string;
    start_url?: string;
    host_email?: string;
    status?: string;
  }>(params.input.zoomConnectionId, path, {
    method: "POST",
    body: JSON.stringify({
      topic: params.input.title,
      type: 2,
      start_time: params.startsAt,
      duration: durationMinutes,
      timezone: params.input.timezone,
      settings: {
        join_before_host: false,
        waiting_room: true,
      },
    }),
  });

  const supabase = asLooseSupabaseClient(getAdminClient());
  const { error } = await supabase.from("event_zoom_meeting").upsert(
    {
      event_id: params.eventId,
      zoom_connection_id: params.input.zoomConnectionId,
      zoom_object_type: params.input.zoomObjectType,
      zoom_object_id: String(response.id),
      topic: response.topic ?? params.input.title,
      join_url: response.join_url ?? null,
      start_url_ciphertext: encryptSecret(response.start_url),
      host_email: response.host_email ?? null,
      provider_status: response.status ?? null,
      raw_metadata: response,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "event_id" }
  );
  if (error) throw new Error(error.message);
}

async function saveSelectedZoomMeeting(eventId: string, input: EventInput) {
  if (input.virtualMode !== "zoom" || input.zoomMode !== "existing") return;
  const supabase = asLooseSupabaseClient(getAdminClient());
  const { error } = await supabase.from("event_zoom_meeting").upsert(
    {
      event_id: eventId,
      zoom_connection_id: input.zoomConnectionId || null,
      zoom_object_type: input.zoomObjectType,
      zoom_object_id: input.zoomObjectId || null,
      topic: input.title,
      join_url: input.zoomJoinUrl || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "event_id" }
  );
  if (error) throw new Error(error.message);
}

export async function saveEvent(formData: FormData) {
  const user = await requireAdmin();
  const input = parseInput(formData);
  if (!input.title) redirect("/admin/events/new?error=title_required");
  if (input.accessLevels.length === 0) redirect("/admin/events/new?error=access_required");

  const supabase = asLooseSupabaseClient(getAdminClient());
  const hostId = await maybeCreateHost(input);
  const venueId = await maybeCreateVenue(input);
  const row = baseEventRow(input, user.id, hostId, venueId);

  try {
    if (input.id) {
      const { error } = await supabase.from("member_event").update(row).eq("id", input.id);
      if (error) throw new Error(error.message);
      await saveAccessLevels(input.id, input.accessLevels);
      await saveSelectedZoomMeeting(input.id, input);
      await createZoomMeetingForEvent({
        eventId: input.id,
        input,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
      });
      revalidatePath("/events");
      revalidatePath("/admin/events");
      redirect(`/admin/events/${input.id}/edit?success=updated`);
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
        count: input.recurrenceCount,
        until: input.recurrenceUntil ? new Date(input.recurrenceUntil) : null,
      });
      const { error: seriesError } = await supabase.from("event_series").insert({
        id: seriesId,
        title: input.title,
        recurrence_frequency: input.recurrenceFrequency,
        starts_at: row.starts_at,
        ends_at: row.ends_at,
        timezone: input.timezone,
        occurrence_count: input.recurrenceCount,
        recurrence_until: input.recurrenceUntil ? toIso(input.recurrenceUntil) : null,
        created_by: user.id,
      });
      if (seriesError) throw new Error(seriesError.message);

      const rows = occurrences.map((occurrence) => ({
        ...row,
        series_id: seriesId,
        starts_at: occurrence.startsAt.toISOString(),
        ends_at: occurrence.endsAt.toISOString(),
      }));
      const { data, error } = await supabase.from("member_event").insert(rows).select<{ id: string; starts_at: string; ends_at: string }>("id, starts_at, ends_at");
      if (error) throw new Error(error.message);
      const createdEvents = (data ?? []) as unknown as Array<{ id: string; starts_at: string; ends_at: string }>;
      for (const event of createdEvents) {
        await saveAccessLevels(event.id, input.accessLevels);
      }
      const first = createdEvents[0];
      if (first) {
        await saveSelectedZoomMeeting(first.id, input);
        await createZoomMeetingForEvent({ eventId: first.id, input, startsAt: first.starts_at, endsAt: first.ends_at });
      }
      revalidatePath("/events");
      revalidatePath("/admin/events");
      redirect("/admin/events?success=created_series");
    }

    const { data, error } = await supabase
      .from("member_event")
      .insert(row)
      .select<{ id: string; starts_at: string; ends_at: string }>("id, starts_at, ends_at")
      .single();
    if (error || !data) throw new Error(error?.message ?? "Event insert failed.");
    await saveAccessLevels(data.id, input.accessLevels);
    await saveSelectedZoomMeeting(data.id, input);
    await createZoomMeetingForEvent({ eventId: data.id, input, startsAt: data.starts_at, endsAt: data.ends_at });
    revalidatePath("/events");
    revalidatePath("/admin/events");
    redirect(`/admin/events/${data.id}/edit?success=created`);
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
