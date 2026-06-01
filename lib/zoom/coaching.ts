import { formatInTimeZone } from "date-fns-tz";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";
import { getAdminClient } from "@/lib/supabase/admin";
import { encryptSecret } from "@/lib/zoom/crypto";
import { zoomApi } from "@/lib/zoom/client";

type ZoomMeetingPayload = {
  id?: number | string;
  topic?: string;
  join_url?: string;
  start_url?: string;
  host_email?: string;
  status?: string;
};

export type CoachingZoomSession = {
  connectionId: string;
  meetingId: string | null;
  joinUrl: string | null;
  startUrlCiphertext: string | null;
  hostEmail: string | null;
  providerStatus: string | null;
  rawMetadata: ZoomMeetingPayload;
};

type CoachZoomContext = {
  connectionId: string;
  coachName: string;
};

function zoomStartTime(iso: string, timezone: string) {
  return formatInTimeZone(new Date(iso), timezone, "yyyy-MM-dd'T'HH:mm:ss");
}

function meetingTopic(params: { coachName: string; memberName: string | null; memberEmail: string }) {
  const member = params.memberName || params.memberEmail;
  return `Positives coaching: ${member} with ${params.coachName}`;
}

async function getCoachZoomContext(coachId: string): Promise<CoachZoomContext | null> {
  const supabase = asLooseSupabaseClient(getAdminClient());
  const { data: coachRaw, error: coachError } = await supabase
    .from("coach_profile")
    .select("display_name, member_id, zoom_connection_id")
    .eq("id", coachId)
    .single();
  const coach = coachRaw as { display_name: string; member_id: string | null; zoom_connection_id: string | null } | null;

  if (coachError || !coach) return null;
  if (coach.zoom_connection_id) {
    const { data: assignedRaw } = await supabase
      .from("zoom_connection")
      .select("id")
      .eq("id", coach.zoom_connection_id)
      .eq("status", "active")
      .maybeSingle();
    const assigned = assignedRaw as { id: string } | null;
    if (assigned?.id) {
      return { connectionId: assigned.id, coachName: coach.display_name };
    }
  }

  if (coach.member_id) {
    const { data: coachConnectionRaw } = await supabase
      .from("zoom_connection")
      .select("id")
      .eq("owner_kind", "coach")
      .eq("owner_member_id", coach.member_id)
      .eq("status", "active")
      .order("last_connected_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const coachConnection = coachConnectionRaw as { id: string } | null;
    if (coachConnection?.id) {
      return { connectionId: coachConnection.id, coachName: coach.display_name };
    }
  }

  const { data: platformRaw } = await supabase
    .from("zoom_connection")
    .select("id")
    .eq("owner_kind", "platform")
    .eq("status", "active")
    .order("last_connected_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const platform = platformRaw as { id: string } | null;

  return platform?.id ? { connectionId: platform.id, coachName: coach.display_name } : null;
}

function normalizeZoomSession(connectionId: string, response: ZoomMeetingPayload): CoachingZoomSession {
  return {
    connectionId,
    meetingId: response.id ? String(response.id) : null,
    joinUrl: response.join_url ?? null,
    startUrlCiphertext: encryptSecret(response.start_url),
    hostEmail: response.host_email ?? null,
    providerStatus: response.status ?? null,
    rawMetadata: response,
  };
}

export async function createCoachingZoomMeeting(params: {
  coachId: string;
  memberName: string | null;
  memberEmail: string;
  scheduledAt: string;
  durationMinutes: number;
  timezone: string;
}) {
  const context = await getCoachZoomContext(params.coachId);
  if (!context) return null;

  const response = await zoomApi<ZoomMeetingPayload>(context.connectionId, "/users/me/meetings", {
    method: "POST",
    body: JSON.stringify({
      topic: meetingTopic({
        coachName: context.coachName,
        memberName: params.memberName,
        memberEmail: params.memberEmail,
      }),
      type: 2,
      start_time: zoomStartTime(params.scheduledAt, params.timezone),
      duration: params.durationMinutes,
      timezone: params.timezone,
      settings: {
        join_before_host: false,
        waiting_room: true,
        approval_type: 2,
      },
    }),
  });

  return normalizeZoomSession(context.connectionId, response);
}

export async function updateCoachingZoomMeeting(params: {
  connectionId: string | null;
  meetingId: string | null;
  scheduledAt: string;
  durationMinutes: number;
  timezone: string;
}) {
  if (!params.connectionId || !params.meetingId) return;
  await zoomApi<null>(params.connectionId, `/meetings/${encodeURIComponent(params.meetingId)}`, {
    method: "PATCH",
    body: JSON.stringify({
      start_time: zoomStartTime(params.scheduledAt, params.timezone),
      duration: params.durationMinutes,
      timezone: params.timezone,
    }),
  });
}

export async function deleteCoachingZoomMeeting(params: {
  connectionId: string | null;
  meetingId: string | null;
}) {
  if (!params.connectionId || !params.meetingId) return;
  await zoomApi<null>(params.connectionId, `/meetings/${encodeURIComponent(params.meetingId)}`, {
    method: "DELETE",
  });
}
