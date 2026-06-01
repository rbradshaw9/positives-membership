import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";
import { runAndPersistZoomSmokeTest } from "@/lib/zoom/smoke-runner";

type SmokeTestRequest = {
  connectionId?: string;
};

function authorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  return request.headers.get("authorization") === `Bearer ${cronSecret}`;
}

async function targetConnectionIds(request: Request) {
  const url = new URL(request.url);
  const queryConnectionId = url.searchParams.get("connectionId")?.trim();
  let bodyConnectionId = "";

  if (request.method === "POST") {
    const body = (await request.json().catch(() => ({}))) as SmokeTestRequest;
    bodyConnectionId = body.connectionId?.trim() ?? "";
  }

  const explicitConnectionId = bodyConnectionId || queryConnectionId;
  if (explicitConnectionId) return [explicitConnectionId];

  const supabase = asLooseSupabaseClient(getAdminClient());
  const { data, error } = await supabase
    .from("zoom_connection")
    .select<{ id: string }[]>("id")
    .in("status", ["active", "needs_reconnect"])
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => row.id);
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const connectionIds = await targetConnectionIds(request);
    const results = [];
    for (const connectionId of connectionIds) {
      results.push(await runAndPersistZoomSmokeTest({ connectionId }));
    }

    const passed = results.every((result) => result.status === "passed");
    return NextResponse.json(
      {
        status: passed ? "passed" : "failed",
        count: results.length,
        results,
      },
      { status: passed ? 200 : 500 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Zoom smoke test failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
