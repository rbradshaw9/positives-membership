import { NextRequest, NextResponse } from "next/server";
import { withCronMonitor } from "@/lib/observability/sentry-cron";

export const dynamic = "force-dynamic";

const SITE_HEALTH_PATHS = [
  { key: "home", path: "/" },
  { key: "join", path: "/join" },
] as const;

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

function getAppUrl() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://positives.life";
  return appUrl.endsWith("/") ? appUrl.slice(0, -1) : appUrl;
}

async function runSiteHealthChecks() {
  const appUrl = getAppUrl();
  const results: Array<{
    key: string;
    path: string;
    status: number;
    durationMs: number;
  }> = [];

  for (const target of SITE_HEALTH_PATHS) {
    const url = `${appUrl}${target.path}`;
    const startedAt = Date.now();
    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      headers: {
        "user-agent": "Positives-Site-Health/1.0",
      },
      signal: AbortSignal.timeout(15_000),
    });
    const durationMs = Date.now() - startedAt;

    if (!response.ok) {
      throw new Error(`Health check failed for ${target.path}: ${response.status}`);
    }

    results.push({
      key: target.key,
      path: target.path,
      status: response.status,
      durationMs,
    });
  }

  return {
    checkedAt: new Date().toISOString(),
    appUrl,
    targets: results,
  };
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await withCronMonitor("siteHealth", () => runSiteHealthChecks());
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[cron/site-health] check failed:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
