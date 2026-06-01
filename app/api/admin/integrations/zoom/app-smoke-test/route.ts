import { NextResponse } from "next/server";
import { runZoomAppSmokeTest } from "@/lib/zoom/app-smoke-test";

type AppSmokeTestRequest = {
  connectionId?: string;
  coachId?: string;
};

function authorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  return request.headers.get("authorization") === `Bearer ${cronSecret}`;
}

async function paramsFromRequest(request: Request) {
  const url = new URL(request.url);
  const queryConnectionId = url.searchParams.get("connectionId")?.trim() ?? "";
  const queryCoachId = url.searchParams.get("coachId")?.trim() ?? "";

  if (request.method !== "POST") {
    return {
      connectionId: queryConnectionId || null,
      coachId: queryCoachId || null,
    };
  }

  const body = (await request.json().catch(() => ({}))) as AppSmokeTestRequest;
  return {
    connectionId: body.connectionId?.trim() || queryConnectionId || null,
    coachId: body.coachId?.trim() || queryCoachId || null,
  };
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const params = await paramsFromRequest(request);
    const result = await runZoomAppSmokeTest(params);
    return NextResponse.json(result, { status: result.ok ? 200 : 500 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Zoom app smoke test failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
