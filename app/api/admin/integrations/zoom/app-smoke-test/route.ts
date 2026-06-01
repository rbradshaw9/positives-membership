import { NextResponse } from "next/server";
import { runZoomAppSmokeTest } from "@/lib/zoom/app-smoke-test";

type AppSmokeTestRequest = {
  connectionId?: string;
};

function authorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  return request.headers.get("authorization") === `Bearer ${cronSecret}`;
}

async function connectionIdFromRequest(request: Request) {
  const url = new URL(request.url);
  const queryConnectionId = url.searchParams.get("connectionId")?.trim() ?? "";

  if (request.method !== "POST") return queryConnectionId || null;

  const body = (await request.json().catch(() => ({}))) as AppSmokeTestRequest;
  return body.connectionId?.trim() || queryConnectionId || null;
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runZoomAppSmokeTest({
      connectionId: await connectionIdFromRequest(request),
    });
    return NextResponse.json(result, { status: result.ok ? 200 : 500 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Zoom app smoke test failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
