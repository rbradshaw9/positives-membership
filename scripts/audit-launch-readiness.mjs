#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env.local");

function loadEnv(path) {
  try {
    const raw = readFileSync(path, "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    console.warn(`[audit] Could not read ${path} — falling back to process.env`);
  }
}

loadEnv(envPath);

const args = new Set(process.argv.slice(2));
const partialMode = args.has("--partial") || args.has("--offline");

const REQUIRED_FILES = [
  "proxy.ts",
  "app/layout.tsx",
  "app/(marketing)/page.tsx",
  "app/join/page.tsx",
  "app/watch/page.tsx",
  "app/try/page.tsx",
  "app/(member)/today/page.tsx",
  "app/(member)/account/page.tsx",
  "app/api/webhooks/stripe/route.ts",
  "app/api/stripe/billing-portal/route.ts",
  "app/manifest.ts",
  "app/robots.ts",
  "app/sitemap.ts",
];

const RECOMMENDED_SCRIPTS = [
  "build",
  "lint",
  "test:e2e",
  "audit:launch",
];

function runStaticChecks() {
  const packageJsonPath = resolve(__dirname, "../package.json");
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  const scripts = packageJson.scripts ?? {};

  const missingFiles = REQUIRED_FILES.filter((path) => !existsSync(resolve(__dirname, "..", path)));
  const missingScripts = RECOMMENDED_SCRIPTS.filter((name) => !(name in scripts));

  console.log("\n[launch-audit] Static readiness checks\n");
  console.log(`Critical files present: ${REQUIRED_FILES.length - missingFiles.length}/${REQUIRED_FILES.length}`);
  console.log(`Recommended scripts present: ${RECOMMENDED_SCRIPTS.length - missingScripts.length}/${RECOMMENDED_SCRIPTS.length}`);

  if (missingFiles.length > 0) {
    console.log("\n[missing critical files]");
    for (const file of missingFiles) {
      console.log(`- ${file}`);
    }
  }

  if (missingScripts.length > 0) {
    console.log("\n[missing recommended scripts]");
    for (const script of missingScripts) {
      console.log(`- ${script}`);
    }
  }

  return {
    hasBlockers: missingFiles.length > 0,
  };
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  const staticResult = runStaticChecks();

  if (partialMode) {
    console.log("");
    console.warn(
      "[launch-audit] Partial mode: skipping database-backed checks because Supabase env vars are unavailable."
    );
    process.exit(staticResult.hasBlockers ? 1 : 0);
  }

  console.error(
    "[audit] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
      "        Make sure .env.local exists and contains these values,\n" +
      "        or run `npm run audit:launch -- --partial` for static-only checks."
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function formatDateOnly(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date, days) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function startOfUtcDay(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function startOfWeekMonday(date) {
  const day = date.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(startOfUtcDay(date), diff);
}

function getMonthYear(dateString) {
  return dateString.slice(0, 7);
}

function getMonthYearFromDate(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function isAuditFixtureRow(row) {
  const title = row?.title ?? "";
  return title.startsWith("E2E ");
}

async function main() {
  const staticResult = runStaticChecks();

  if (partialMode) {
    console.log("");
    console.warn(
      "[launch-audit] Partial mode: skipping database-backed checks by request."
    );
    process.exit(staticResult.hasBlockers ? 1 : 0);
  }

  const today = startOfUtcDay(new Date());
  const windowStart = formatDateOnly(today);
  const windowEnd = formatDateOnly(addDays(today, 55));

  const { data: publishedContent, error: publishedError } = await supabase
    .from("content")
    .select("id, title, type, status, publish_date, week_start, month_year, castos_episode_url, s3_audio_key")
    .in("type", ["daily_audio", "weekly_principle", "monthly_theme"])
    .eq("status", "published");

  if (publishedError) {
    throw new Error(`[audit] Failed to load published content: ${publishedError.message}`);
  }

  const { data: windowRows, error: windowError } = await supabase
    .from("content")
    .select("id, title, type, status, publish_date, week_start, month_year, castos_episode_url, s3_audio_key")
    .in("type", ["daily_audio", "weekly_principle", "monthly_theme"])
    .neq("status", "archived")
    .or(
      [
        `and(type.eq.daily_audio,publish_date.gte.${windowStart},publish_date.lte.${windowEnd})`,
        `and(type.eq.weekly_principle,week_start.gte.${formatDateOnly(startOfWeekMonday(today))},week_start.lte.${formatDateOnly(startOfWeekMonday(addDays(today, 55)))})`,
        ...Array.from(new Set(Array.from({ length: 56 }, (_, index) => getMonthYearFromDate(addDays(today, index)))))
          .map((month) => `and(type.eq.monthly_theme,month_year.eq.${month})`),
      ].join(",")
    );

  if (windowError) {
    throw new Error(`[audit] Failed to load launch window content: ${windowError.message}`);
  }

  const publishedRows = (publishedContent ?? []).filter((row) => !isAuditFixtureRow(row));
  const windowContent = (windowRows ?? []).filter((row) => !isAuditFixtureRow(row));

  const audioBlockers = publishedRows.filter(
    (row) =>
      (row.type === "daily_audio" || row.type === "weekly_principle") &&
      !row.castos_episode_url &&
      !!row.s3_audio_key
  );

  const missingAudioRows = publishedRows.filter(
    (row) =>
      (row.type === "daily_audio" || row.type === "weekly_principle") &&
      !row.castos_episode_url &&
      !row.s3_audio_key
  );

  const visibleDates = Array.from({ length: 56 }, (_, index) => formatDateOnly(addDays(today, index)));
  const weekStarts = Array.from(
    new Set(visibleDates.map((date) => formatDateOnly(startOfWeekMonday(new Date(`${date}T00:00:00.000Z`)))))
  );
  const monthYears = Array.from(new Set(visibleDates.map(getMonthYear)));

  const dailyByDate = new Map();
  const publishedWeeklyStarts = new Set();
  const publishedMonths = new Set();

  for (const row of windowContent) {
    if (row.type === "daily_audio" && row.publish_date) {
      dailyByDate.set(row.publish_date, [...(dailyByDate.get(row.publish_date) ?? []), row]);
    }
    if (row.type === "weekly_principle" && row.week_start && row.status === "published") {
      publishedWeeklyStarts.add(row.week_start);
    }
    if (row.type === "monthly_theme" && row.month_year && row.status === "published") {
      publishedMonths.add(row.month_year);
    }
  }

  const missingDailyDates = [];
  const unpublishedDailyDates = [];

  for (const date of visibleDates) {
    const rows = dailyByDate.get(date) ?? [];
    if (rows.length === 0) {
      missingDailyDates.push(date);
      continue;
    }
    if (!rows.some((row) => row.status === "published")) {
      unpublishedDailyDates.push(date);
    }
  }

  const missingWeeklyStarts = weekStarts.filter((weekStart) => !publishedWeeklyStarts.has(weekStart));
  const missingMonths = monthYears.filter((monthYear) => !publishedMonths.has(monthYear));

  console.log("\n[launch-audit] Core member launch readiness\n");
  console.log(`Window: ${windowStart} → ${windowEnd}`);
  console.log(`Published content: ${publishedRows.length}`);
  console.log(`Audio blockers (S3 only, no Castos): ${audioBlockers.length}`);
  console.log(`Missing audio source (daily/weekly): ${missingAudioRows.length}`);
  console.log(`Missing daily dates in next 8 weeks: ${missingDailyDates.length}`);
  console.log(`Unpublished daily dates in next 8 weeks: ${unpublishedDailyDates.length}`);
  console.log(`Weeks missing published principle: ${missingWeeklyStarts.length}`);
  console.log(`Months missing published theme: ${missingMonths.length}`);

  if (audioBlockers.length > 0) {
    console.log("\n[audio blockers]");
    for (const row of audioBlockers) {
      console.log(`- ${row.type} | ${row.title} | ${row.publish_date ?? row.week_start ?? row.month_year}`);
    }
  }

  if (missingAudioRows.length > 0) {
    console.log("\n[missing audio source]");
    for (const row of missingAudioRows) {
      console.log(`- ${row.type} | ${row.title} | ${row.publish_date ?? row.week_start ?? row.month_year}`);
    }
  }

  if (missingDailyDates.length > 0) {
    console.log("\n[missing daily coverage]");
    for (const date of missingDailyDates) {
      console.log(`- ${date}`);
    }
  }

  if (unpublishedDailyDates.length > 0) {
    console.log("\n[daily scheduled but not published]");
    for (const date of unpublishedDailyDates) {
      console.log(`- ${date}`);
    }
  }

  if (missingWeeklyStarts.length > 0) {
    console.log("\n[missing weekly principles]");
    for (const weekStart of missingWeeklyStarts) {
      console.log(`- ${weekStart}`);
    }
  }

  if (missingMonths.length > 0) {
    console.log("\n[missing monthly themes]");
    for (const monthYear of missingMonths) {
      console.log(`- ${monthYear}`);
    }
  }

  const hasBlockers =
    staticResult.hasBlockers ||
    audioBlockers.length > 0 ||
    missingAudioRows.length > 0 ||
    missingDailyDates.length > 0 ||
    unpublishedDailyDates.length > 0 ||
    missingWeeklyStarts.length > 0 ||
    missingMonths.length > 0;

  console.log("");
  if (hasBlockers) {
    console.error("[launch-audit] Launch blockers detected.");
    process.exit(1);
  }

  console.log("[launch-audit] No blockers detected.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
