#!/usr/bin/env node

/**
 * Converts old scaffold/SoundHelix runway rows into explicit beta seed rows.
 *
 * The goal is alpha/beta test coverage through the rolling invite window while
 * Ryan waits for final Dr. Paul/Castos content. This script is intentionally
 * reversible: all touched rows are tagged with BETA_SEED_CONTENT in admin_notes.
 */

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

const BETA_SEED_MARKER = "BETA_SEED_CONTENT";
const DEFAULT_DAYS = 56;
const DEFAULT_SEED_AUDIO_PATH = "/beta-seed-audio.mp3";

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

function printHelp() {
  console.log(`
Usage:
  node scripts/sync-beta-seed-content-runway.mjs [--days 56] [--audio-url <url>] [--write]

Purpose:
  Re-tags published scaffold/SoundHelix content in the rolling beta runway as
  explicit beta seed content. Dry-run is the default.

Notes:
  - Daily and weekly rows with SoundHelix/scaffold audio are pointed to the
    beta seed audio asset.
  - All touched rows get an internal BETA_SEED_CONTENT admin note so final
    content replacement is easy to query later.
`);
}

function parseArgs(argv) {
  const args = {
    days: DEFAULT_DAYS,
    audioUrl: null,
    write: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--days") {
      args.days = Number(argv[index + 1]);
      index += 1;
    } else if (arg === "--audio-url") {
      args.audioUrl = argv[index + 1] ?? null;
      index += 1;
    } else if (arg === "--write") {
      args.write = true;
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

  return args;
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
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

function isAudioContent(row) {
  return row.type === "daily_audio" || row.type === "weekly_principle";
}

function buildSeedNote(date) {
  return [
    `${BETA_SEED_MARKER}: alpha/beta runway seed approved ${date}.`,
    "Use for testing invite coverage while final Dr. Paul/Castos media is being prepared.",
    "Replace with final media and editorial copy before broad public launch.",
  ].join(" ");
}

function absoluteSeedAudioUrl(args) {
  if (args.audioUrl) return args.audioUrl;

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://positives.life").replace(/\/$/, "");
  return `${appUrl}${DEFAULT_SEED_AUDIO_PATH}`;
}

loadEnv(envPath);

const args = parseArgs(process.argv.slice(2));
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
}

const seedAudioUrl = absoluteSeedAudioUrl(args);
const now = new Date();
const start = isoDate(now);
const end = isoDate(addDays(now, args.days - 1));
const seedNote = buildSeedNote(isoDate(now));

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
      "transcription",
    ].join(",")
  )
  .eq("status", "published")
  .or(
    [
      `and(type.eq.daily_audio,publish_date.gte.${start},publish_date.lte.${end})`,
      `and(type.eq.weekly_principle,week_start.gte.${start},week_start.lte.${end})`,
      `and(type.eq.monthly_theme,month_year.gte.${start.slice(0, 7)},month_year.lte.${end.slice(0, 7)})`,
    ].join(",")
  );

if (error) throw error;

const rows = (data ?? [])
  .map((row) => ({ ...row, placeholder_fields: placeholderHits(row) }))
  .filter((row) => row.placeholder_fields.length > 0)
  .sort((a, b) => slotDate(a).localeCompare(slotDate(b)) || a.type.localeCompare(b.type));

console.log(`[beta-seed-content] Mode: ${args.write ? "WRITE" : "DRY RUN"}`);
console.log(`[beta-seed-content] Window: ${start} -> ${end}`);
console.log(`[beta-seed-content] Seed audio: ${seedAudioUrl}`);
console.log(`[beta-seed-content] Rows to retag: ${rows.length}`);

let updated = 0;
for (const row of rows) {
  const payload = {
    admin_notes: seedNote,
  };

  if (isAudioContent(row)) {
    payload.castos_episode_url = seedAudioUrl;
    payload.s3_audio_key = null;
  }

  console.log(
    `- ${args.write ? "update" : "would-update"} ${row.type} ${slotDate(row)} :: ${row.title} (${row.placeholder_fields.join(", ")})`
  );

  if (args.write) {
    const { error: updateError } = await supabase
      .from("content")
      .update(payload)
      .eq("id", row.id);

    if (updateError) {
      throw new Error(`[beta-seed-content] Failed to update ${row.id}: ${updateError.message}`);
    }
  }

  updated += 1;
}

console.log(`[beta-seed-content] ${args.write ? "Updated" : "Would update"} ${updated} row(s).`);
