import { getAdminClient } from "@/lib/supabase/admin";
import { asLooseSupabaseClient } from "@/lib/supabase/loose";
import { runZoomSmokeTest, type ZoomSmokeTestResult } from "@/lib/zoom/smoke-test";

export type PersistedZoomSmokeTestResult = {
  connectionId: string;
  runId: string | null;
  status: "passed" | "failed";
  checks: ZoomSmokeTestResult["checks"] | null;
  error: string | null;
};

export async function runAndPersistZoomSmokeTest(params: {
  connectionId: string;
  initiatedBy?: string | null;
}) {
  const supabase = asLooseSupabaseClient(getAdminClient());
  const startedAt = new Date().toISOString();
  const { data: connectionRaw } = await supabase
    .from("zoom_connection")
    .select("id, status")
    .eq("id", params.connectionId)
    .maybeSingle();
  const connection = connectionRaw as { id: string; status: "active" | "needs_reconnect" | "disabled" } | null;

  if (!connection || connection.status === "disabled") {
    return {
      connectionId: params.connectionId,
      runId: null,
      status: "failed",
      checks: null,
      error: "Zoom connection is missing or disabled.",
    } satisfies PersistedZoomSmokeTestResult;
  }

  const { data: runRaw } = await supabase
    .from("zoom_connection_test_run")
    .insert({
      zoom_connection_id: params.connectionId,
      initiated_by: params.initiatedBy ?? null,
      status: "running",
      started_at: startedAt,
    })
    .select("id")
    .single();
  const run = runRaw as { id: string } | null;

  try {
    const result = await runZoomSmokeTest(params.connectionId);
    const finishedAt = new Date().toISOString();
    const firstError = Object.values(result.checks).find((check) => !check.ok)?.detail ?? null;

    if (run?.id) {
      await supabase
        .from("zoom_connection_test_run")
        .update({
          status: result.ok ? "passed" : "failed",
          checks: result.checks,
          error: firstError,
          finished_at: finishedAt,
        })
        .eq("id", run.id);
    }

    await supabase
      .from("zoom_connection")
      .update({
        status: result.ok ? "active" : connection.status,
        last_checked_at: finishedAt,
        last_error: firstError,
        updated_at: finishedAt,
      })
      .eq("id", params.connectionId);

    return {
      connectionId: params.connectionId,
      runId: run?.id ?? null,
      status: result.ok ? "passed" : "failed",
      checks: result.checks,
      error: firstError,
    } satisfies PersistedZoomSmokeTestResult;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Zoom smoke test failed.";
    const finishedAt = new Date().toISOString();
    const needsReconnect =
      message.includes("refresh token") ||
      message.includes("token request failed") ||
      message.includes("401") ||
      message.includes("invalid_grant");

    if (run?.id) {
      await supabase
        .from("zoom_connection_test_run")
        .update({
          status: "failed",
          error: message.slice(0, 500),
          finished_at: finishedAt,
        })
        .eq("id", run.id);
    }

    await supabase
      .from("zoom_connection")
      .update({
        status: needsReconnect ? "needs_reconnect" : connection.status,
        last_checked_at: finishedAt,
        last_error: message.slice(0, 500),
        updated_at: finishedAt,
      })
      .eq("id", params.connectionId);

    return {
      connectionId: params.connectionId,
      runId: run?.id ?? null,
      status: "failed",
      checks: null,
      error: message.slice(0, 500),
    } satisfies PersistedZoomSmokeTestResult;
  }
}
