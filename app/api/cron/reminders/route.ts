import { NextRequest, NextResponse } from "next/server";
import { dispatchReminderTriggers } from "@/lib/reminders/dispatch";
import { withCronMonitor } from "@/lib/observability/sentry-cron";

export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest) {
  if (process.env.NODE_ENV !== "production") {
    return true;
  }

  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  return false;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await withCronMonitor("reminders", () =>
      dispatchReminderTriggers()
    );
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[cron/reminders] dispatch failed:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
