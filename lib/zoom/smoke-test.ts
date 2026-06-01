import { formatInTimeZone } from "date-fns-tz";
import { zoomApi } from "@/lib/zoom/client";

type ZoomCreatedSession = {
  id?: string | number;
  topic?: string;
  join_url?: string;
  host_email?: string;
  status?: string;
};

type SmokeCheck = {
  ok: boolean;
  detail?: string;
  id?: string;
};

export type ZoomSmokeTestResult = {
  ok: boolean;
  checks: {
    user: SmokeCheck;
    meetingCreate: SmokeCheck;
    meetingDelete: SmokeCheck;
    webinarCreate: SmokeCheck;
    webinarDelete: SmokeCheck;
  };
};

function checkError(error: unknown): SmokeCheck {
  const message = error instanceof Error ? error.message : "Unknown Zoom error";
  return { ok: false, detail: message.slice(0, 500) };
}

function startTime() {
  return formatInTimeZone(new Date(Date.now() + 30 * 60 * 1000), "UTC", "yyyy-MM-dd'T'HH:mm:ss");
}

async function deleteZoomObject(connectionId: string, kind: "meeting" | "webinar", id: string) {
  const path = kind === "webinar" ? `/webinars/${encodeURIComponent(id)}` : `/meetings/${encodeURIComponent(id)}`;
  await zoomApi<null>(connectionId, path, { method: "DELETE" });
}

export async function runZoomSmokeTest(connectionId: string): Promise<ZoomSmokeTestResult> {
  const checks: ZoomSmokeTestResult["checks"] = {
    user: { ok: false },
    meetingCreate: { ok: false },
    meetingDelete: { ok: false },
    webinarCreate: { ok: false },
    webinarDelete: { ok: false },
  };

  try {
    const user = await zoomApi<{ id?: string; email?: string }>(connectionId, "/users/me");
    checks.user = {
      ok: true,
      detail: user.email ? `Connected as ${user.email}` : "Connected Zoom user resolved",
      id: user.id,
    };
  } catch (error) {
    checks.user = checkError(error);
  }

  let meetingId: string | null = null;
  try {
    const meeting = await zoomApi<ZoomCreatedSession>(connectionId, "/users/me/meetings", {
      method: "POST",
      body: JSON.stringify({
        topic: `Positives Zoom smoke test meeting ${new Date().toISOString()}`,
        type: 2,
        start_time: startTime(),
        duration: 15,
        timezone: "UTC",
        settings: {
          join_before_host: false,
          waiting_room: true,
          approval_type: 2,
        },
      }),
    });
    meetingId = meeting.id ? String(meeting.id) : null;
    checks.meetingCreate = {
      ok: Boolean(meetingId),
      detail: meetingId ? "Created throwaway Zoom meeting" : "Zoom did not return a meeting id",
      id: meetingId ?? undefined,
    };
  } catch (error) {
    checks.meetingCreate = checkError(error);
  }

  if (meetingId) {
    try {
      await deleteZoomObject(connectionId, "meeting", meetingId);
      checks.meetingDelete = { ok: true, detail: "Deleted throwaway Zoom meeting", id: meetingId };
    } catch (error) {
      checks.meetingDelete = checkError(error);
    }
  } else {
    checks.meetingDelete = { ok: false, detail: "Skipped because meeting creation failed" };
  }

  let webinarId: string | null = null;
  try {
    const webinar = await zoomApi<ZoomCreatedSession>(connectionId, "/users/me/webinars", {
      method: "POST",
      body: JSON.stringify({
        topic: `Positives Zoom smoke test webinar ${new Date().toISOString()}`,
        type: 5,
        start_time: startTime(),
        duration: 15,
        timezone: "UTC",
        settings: {
          approval_type: 2,
          registration_type: 1,
        },
      }),
    });
    webinarId = webinar.id ? String(webinar.id) : null;
    checks.webinarCreate = {
      ok: Boolean(webinarId),
      detail: webinarId ? "Created throwaway Zoom webinar" : "Zoom did not return a webinar id",
      id: webinarId ?? undefined,
    };
  } catch (error) {
    checks.webinarCreate = checkError(error);
  }

  if (webinarId) {
    try {
      await deleteZoomObject(connectionId, "webinar", webinarId);
      checks.webinarDelete = { ok: true, detail: "Deleted throwaway Zoom webinar", id: webinarId };
    } catch (error) {
      checks.webinarDelete = checkError(error);
    }
  } else {
    checks.webinarDelete = { ok: false, detail: "Skipped because webinar creation failed" };
  }

  return {
    ok: Object.values(checks).every((check) => check.ok),
    checks,
  };
}
