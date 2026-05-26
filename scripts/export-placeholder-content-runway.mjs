#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env.local");

const PLACEHOLDER_PATTERNS = [
  /soundhelix\.com/i,
  /\bplaceholder\b/i,
  /\bscaffold\b/i,
  /\bsample audio\b/i,
  /\blorem ipsum\b/i,
];

const TEXT_FIELDS = [
  "title",
  "excerpt",
  "description",
  "body",
  "reflection_prompt",
  "admin_notes",
  "castos_episode_url",
  "s3_audio_key",
  "transcription",
];

function loadEnv(path) {
  if (!existsSync(path)) return;
  const raw = readFileSync(path, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function parseArgs(argv) {
  const args = {
    days: 56,
    format: "markdown",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--days") {
      args.days = Number(argv[index + 1]);
      index += 1;
    } else if (arg === "--format") {
      args.format = argv[index + 1] ?? args.format;
      index += 1;
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!Number.isInteger(args.days) || args.days < 1) {
    throw new Error("--days must be a positive integer.");
  }
  if (!["csv", "markdown"].includes(args.format)) {
    throw new Error('--format must be "csv" or "markdown".');
  }

  return args;
}

function printHelp() {
  console.log(`
Usage:
  node scripts/export-placeholder-content-runway.mjs [--days 56] [--format markdown|csv]

Purpose:
  Exports published placeholder/scaffold content in the rolling beta runway.
  This is read-only and does not modify content.
`);
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function startOfWeekMonday(date) {
  const day = date.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(date, diff);
}

function slotDate(row) {
  return row.publish_date ?? row.week_start ?? `${row.month_year ?? ""}-01`;
}

function placeholderHits(row) {
  const hits = [];
  for (const field of TEXT_FIELDS) {
    const value = row[field];
    if (value === null || value === undefined) continue;
    const text = typeof value === "string" ? value : JSON.stringify(value);
    if (PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(text))) {
      hits.push(field);
    }
  }
  return hits;
}

function needs(row) {
  const items = [];
  if (row.type === "daily_audio" || row.type === "weekly_principle") {
    if (/soundhelix\.com/i.test(row.castos_episode_url ?? "")) {
      items.push("approved Castos/audio URL");
    }
    if (row.s3_audio_key && /placeholder|scaffold|sample/i.test(row.s3_audio_key)) {
      items.push("approved S3 audio key");
    }
  }
  if (["daily_audio", "weekly_principle", "monthly_theme"].includes(row.type)) {
    items.push("approved title/copy");
  }
  if (!row.transcription) items.push("transcript when available");
  return Array.from(new Set(items)).join("; ");
}

function csvValue(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function printCsv(rows, start, end) {
  const headers = [
    "slot_date",
    "type",
    "title",
    "status",
    "id",
    "placeholder_fields",
    "needed_replacement",
    "castos_episode_url",
    "s3_audio_key",
    "vimeo_video_id",
    "resource_links",
    "admin_notes",
  ];
  console.log(headers.map(csvValue).join(","));
  for (const row of rows) {
    console.log(
      [
        slotDate(row),
        row.type,
        row.title,
        row.status,
        row.id,
        placeholderHits(row).join("; "),
        needs(row),
        row.castos_episode_url,
        row.s3_audio_key,
        row.vimeo_video_id,
        JSON.stringify(row.resource_links ?? []),
        row.admin_notes,
      ]
        .map(csvValue)
        .join(",")
    );
  }
  console.error(
    `[placeholder-export] ${rows.length} published placeholder row(s) exported for ${start} -> ${end}.`
  );
}

function printMarkdown(rows, start, end) {
  console.log(`# Placeholder Content Runway`);
  console.log();
  console.log(`Window: ${start} -> ${end}`);
  console.log(`Published placeholder rows: ${rows.length}`);
  console.log();
  console.log("| Date | Type | Title | Placeholder fields | Needed replacement |");
  console.log("|---|---|---|---|---|");
  for (const row of rows) {
    console.log(
      `| ${slotDate(row)} | ${row.type} | ${row.title ?? ""} | ${placeholderHits(row).join(", ")} | ${needs(row)} |`
    );
  }
}

loadEnv(envPath);
const args = parseArgs(process.argv.slice(2));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
}

const now = new Date();
const start = isoDate(now);
const weekStart = isoDate(startOfWeekMonday(now));
const end = isoDate(addDays(now, args.days - 1));

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

const { data, error } = await supabase
  .from("content")
  .select(
    [
      "id",
      "type",
      "title",
      "status",
      "publish_date",
      "week_start",
      "month_year",
      "excerpt",
      "description",
      "body",
      "reflection_prompt",
      "admin_notes",
      "castos_episode_url",
      "s3_audio_key",
      "vimeo_video_id",
      "resource_links",
      "transcription",
    ].join(",")
  )
  .eq("status", "published")
  .or(
    [
      `and(type.eq.daily_audio,publish_date.gte.${start},publish_date.lte.${end})`,
      `and(type.eq.weekly_principle,week_start.gte.${weekStart},week_start.lte.${end})`,
      `and(type.eq.monthly_theme,month_year.gte.${start.slice(0, 7)},month_year.lte.${end.slice(0, 7)})`,
    ].join(",")
  );

if (error) throw error;

const rows = (data ?? [])
  .map((row) => ({ ...row, placeholder_fields: placeholderHits(row) }))
  .filter((row) => row.placeholder_fields.length > 0)
  .sort((a, b) => slotDate(a).localeCompare(slotDate(b)) || a.type.localeCompare(b.type));

if (args.format === "csv") {
  printCsv(rows, start, end);
} else {
  printMarkdown(rows, start, end);
}
