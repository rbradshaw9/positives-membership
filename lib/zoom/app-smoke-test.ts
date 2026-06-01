import { formatInTimeZone } from "date-fns-tz";
import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";
import { encryptSecret } from "@/lib/zoom/crypto";
import { zoomApi } from "@/lib/zoom/client";
import {
  createCoachingZoomMeeting,
  deleteCoachingZoomMeeting,
  updateCoachingZoomMeeting,
} from "@/lib/zoom/coaching";

type ZoomCreatedSession = {
  id?: string | number;
  topic?: string;
  join_url?: string;
  start_url?: string;
  host_email?: string;
  status?: string;
};

type SmokeCheck = {
  ok: boolean;
  detail?: string;
  id?: string;
};

export type ZoomAppSmokeTestResult = {
  ok: boolean;
  connectionId: string | null;
  checks: Record<string, SmokeCheck>;
};

function checkError(error: unknown): SmokeCheck {
  const message = error instanceof Error ? error.message : "Unknown app smoke test error";
  return { ok: false, detail: message.slice(0, 500) };
}

function startTime(minutesFromNow: number) {
  return new Date(Date.now() + minutesFromNow * 60 * 1000);
}

function zoomStartTime(date: Date, timezone: string) {
  return formatInTimeZone(date, timezone, "yyyy-MM-dd'T'HH:mm:ss");
}

async function latestActivePlatformConnectionId() {
  const supabase = asLooseSupabaseClient(getAdminClient());
  const { data, error } = await supabase
    .from("zoom_connection")
    .select<{ id: string }>("id")
    .eq("owner_kind", "platform")
    .eq("status", "active")
    .order("last_connected_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data?.id ?? null;
}

async function deleteZoomObject(connectionId: string, kind: "meeting" | "webinar", id: string | null) {
  if (!id) return;
  const path = kind === "webinar" ? `/webinars/${encodeURIComponent(id)}` : `/meetings/${encodeURIComponent(id)}`;
  await zoomApi<null>(connectionId, path, { method: "DELETE" });
}

async function createZoomObject(connectionId: string, kind: "meeting" | "webinar", topic: string) {
  const timezone = "UTC";
  const startsAt = startTime(kind === "meeting" ? 45 : 75);
  const path = kind === "webinar" ? "/users/me/webinars" : "/users/me/meetings";
  return zoomApi<ZoomCreatedSession>(connectionId, path, {
    method: "POST",
    body: JSON.stringify({
      topic,
      type: kind === "webinar" ? 5 : 2,
      start_time: zoomStartTime(startsAt, timezone),
      duration: 15,
      timezone,
      settings: kind === "webinar"
        ? { approval_type: 2, registration_type: 1 }
        : { join_before_host: false, waiting_room: true, approval_type: 2 },
    }),
  });
}

async function runEventPath(params: {
  connectionId: string;
  kind: "meeting" | "webinar";
  checks: Record<string, SmokeCheck>;
}) {
  const supabase = asLooseSupabaseClient(getAdminClient());
  const prefix = params.kind === "webinar" ? "eventWebinar" : "eventMeeting";
  let zoomObjectId: string | null = null;
  let eventId: string | null = null;

  try {
    const topic = `Positives app smoke ${params.kind} ${new Date().toISOString()}`;
    const zoomSession = await createZoomObject(params.connectionId, params.kind, topic);
    zoomObjectId = zoomSession.id ? String(zoomSession.id) : null;
    params.checks[`${prefix}ZoomCreate`] = {
      ok: Boolean(zoomObjectId && zoomSession.join_url),
      detail: zoomObjectId ? `Created Zoom ${params.kind}` : "Zoom did not return an id",
      id: zoomObjectId ?? undefined,
    };

    const startsAt = startTime(params.kind === "meeting" ? 45 : 75);
    const endsAt = new Date(startsAt.getTime() + 15 * 60 * 1000);
    const { data: eventRaw, error: eventError } = await supabase
      .from("member_event")
      .insert({
        title: `Positives app smoke ${params.kind}`,
        excerpt: "Temporary Zoom app smoke test record.",
        description: "Temporary Zoom app smoke test record.",
        status: "draft",
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        timezone: "UTC",
        visibility: "member",
        virtual_mode: "zoom",
        ticketing_mode: "included",
      })
      .select<{ id: string }>("id")
      .single();

    if (eventError || !eventRaw?.id) throw new Error(eventError?.message ?? "Event insert failed");
    eventId = eventRaw.id;
    params.checks[`${prefix}LocalEvent`] = { ok: true, detail: "Created draft member_event", id: eventId };

    const { error: zoomRowError } = await supabase.from("event_zoom_meeting").insert({
      event_id: eventId,
      zoom_connection_id: params.connectionId,
      zoom_object_type: params.kind,
      zoom_object_id: zoomObjectId,
      topic: zoomSession.topic ?? topic,
      join_url: zoomSession.join_url ?? null,
      start_url_ciphertext: encryptSecret(zoomSession.start_url),
      host_email: zoomSession.host_email ?? null,
      provider_status: zoomSession.status ?? null,
      raw_metadata: zoomSession,
    });
    if (zoomRowError) throw new Error(zoomRowError.message);

    const { data: attachedRaw, error: attachedError } = await supabase
      .from("event_zoom_meeting")
      .select<{ id: string; join_url: string | null; zoom_object_id: string | null }>("id, join_url, zoom_object_id")
      .eq("event_id", eventId)
      .maybeSingle();
    if (attachedError || !attachedRaw?.id) throw new Error(attachedError?.message ?? "event_zoom_meeting row missing");
    params.checks[`${prefix}Attach`] = {
      ok: Boolean(attachedRaw.join_url && attachedRaw.zoom_object_id === zoomObjectId),
      detail: "Attached Zoom session to draft event",
      id: attachedRaw.id,
    };
  } catch (error) {
    params.checks[`${prefix}Path`] = checkError(error);
  } finally {
    try {
      if (eventId) await supabase.from("member_event").delete().eq("id", eventId);
      params.checks[`${prefix}LocalCleanup`] = { ok: true, detail: "Deleted temporary event record" };
    } catch (error) {
      params.checks[`${prefix}LocalCleanup`] = checkError(error);
    }
    try {
      await deleteZoomObject(params.connectionId, params.kind, zoomObjectId);
      params.checks[`${prefix}ZoomCleanup`] = { ok: true, detail: `Deleted temporary Zoom ${params.kind}`, id: zoomObjectId ?? undefined };
    } catch (error) {
      params.checks[`${prefix}ZoomCleanup`] = checkError(error);
    }
  }
}

async function testMember() {
  const supabase = asLooseSupabaseClient(getAdminClient());
  const { data: preferred } = await supabase
    .from("member")
    .select<{ id: string; email: string; name: string | null }>("id, email, name")
    .eq("email", "zoom-reviewer@positives.life")
    .maybeSingle();
  if (preferred?.id) return preferred;

  const { data, error } = await supabase
    .from("member")
    .select<{ id: string; email: string; name: string | null }>("id, email, name")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data?.id) throw new Error(error?.message ?? "No member available for coaching smoke test");
  return data;
}

async function testCoach() {
  const supabase = asLooseSupabaseClient(getAdminClient());
  const { data, error } = await supabase
    .from("coach_profile")
    .select<{ id: string; display_name: string; session_duration_minutes: number }>(
      "id, display_name, session_duration_minutes"
    )
    .eq("is_active", true)
    .eq("accepts_new", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data?.id) throw new Error(error?.message ?? "No active coach available for coaching smoke test");
  return data;
}

async function testCoachById(coachId: string) {
  const supabase = asLooseSupabaseClient(getAdminClient());
  const { data, error } = await supabase
    .from("coach_profile")
    .select<{ id: string; display_name: string; session_duration_minutes: number }>(
      "id, display_name, session_duration_minutes"
    )
    .eq("id", coachId)
    .maybeSingle();
  if (error || !data?.id) throw new Error(error?.message ?? "Requested coach not found for coaching smoke test");
  return data;
}

async function runCoachingPath(checks: Record<string, SmokeCheck>, coachId?: string | null) {
  const supabase = asLooseSupabaseClient(getAdminClient());
  let bookingId: string | null = null;
  let zoomConnectionId: string | null = null;
  let zoomMeetingId: string | null = null;

  try {
    const [coach, member] = await Promise.all([coachId ? testCoachById(coachId) : testCoach(), testMember()]);
    const scheduledAt = startTime(105).toISOString();
    const durationMinutes = coach.session_duration_minutes || 60;
    const zoomSession = await createCoachingZoomMeeting({
      coachId: coach.id,
      memberName: member.name,
      memberEmail: member.email,
      scheduledAt,
      durationMinutes,
      timezone: "UTC",
    });
    if (!zoomSession?.meetingId || !zoomSession.joinUrl) {
      throw new Error("Coaching Zoom meeting was not created");
    }
    zoomConnectionId = zoomSession.connectionId;
    zoomMeetingId = zoomSession.meetingId;
    checks.coachingZoomConnection = {
      ok: Boolean(zoomConnectionId),
      detail: "Coaching selected this Zoom connection",
      id: zoomConnectionId ?? undefined,
    };
    checks.coachingZoomCreate = { ok: true, detail: "Created coaching Zoom meeting", id: zoomMeetingId };

    const { data: bookingRaw, error: bookingError } = await supabase
      .from("coaching_booking")
      .insert({
        member_id: member.id,
        coach_id: coach.id,
        status: "confirmed",
        scheduled_at: scheduledAt,
        duration_minutes: durationMinutes,
        timezone: "UTC",
        member_intake: "Temporary Zoom app smoke test booking.",
        zoom_connection_id: zoomSession.connectionId,
        zoom_join_url: zoomSession.joinUrl,
        zoom_meeting_id: zoomSession.meetingId,
        zoom_start_url_ciphertext: zoomSession.startUrlCiphertext,
        zoom_host_email: zoomSession.hostEmail,
        zoom_provider_status: zoomSession.providerStatus,
        zoom_raw_metadata: zoomSession.rawMetadata,
      })
      .select<{ id: string }>("id")
      .single();
    if (bookingError || !bookingRaw?.id) throw new Error(bookingError?.message ?? "Coaching booking insert failed");
    bookingId = bookingRaw.id;
    checks.coachingLocalBooking = { ok: true, detail: "Stored temporary coaching booking", id: bookingId };

    const rescheduledAt = startTime(135).toISOString();
    await updateCoachingZoomMeeting({
      connectionId: zoomConnectionId,
      meetingId: zoomMeetingId,
      scheduledAt: rescheduledAt,
      durationMinutes,
      timezone: "UTC",
    });
    checks.coachingZoomUpdate = { ok: true, detail: "Updated coaching Zoom meeting", id: zoomMeetingId };
  } catch (error) {
    checks.coachingPath = checkError(error);
  } finally {
    try {
      if (zoomConnectionId && zoomMeetingId) {
        await deleteCoachingZoomMeeting({ connectionId: zoomConnectionId, meetingId: zoomMeetingId });
      }
      checks.coachingZoomCleanup = { ok: true, detail: "Deleted temporary coaching Zoom meeting", id: zoomMeetingId ?? undefined };
    } catch (error) {
      checks.coachingZoomCleanup = checkError(error);
    }
    try {
      if (bookingId) await supabase.from("coaching_booking").delete().eq("id", bookingId);
      checks.coachingLocalCleanup = { ok: true, detail: "Deleted temporary coaching booking" };
    } catch (error) {
      checks.coachingLocalCleanup = checkError(error);
    }
  }
}

export async function runZoomAppSmokeTest(params: { connectionId?: string | null; coachId?: string | null } = {}): Promise<ZoomAppSmokeTestResult> {
  const connectionId = params.connectionId ?? (await latestActivePlatformConnectionId());
  const checks: Record<string, SmokeCheck> = {};

  if (!connectionId) {
    checks.connection = { ok: false, detail: "No active platform Zoom connection found" };
    return { ok: false, connectionId: null, checks };
  }

  checks.connection = { ok: true, detail: "Active platform Zoom connection found", id: connectionId };
  await runEventPath({ connectionId, kind: "meeting", checks });
  await runEventPath({ connectionId, kind: "webinar", checks });
  await runCoachingPath(checks, params.coachId);

  return {
    ok: Object.values(checks).every((check) => check.ok),
    connectionId,
    checks,
  };
}
