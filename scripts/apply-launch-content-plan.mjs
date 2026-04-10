#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env.local");

function printHelp() {
  console.log(`
Usage:
  node scripts/apply-launch-content-plan.mjs --plan <file> [--write] [--allow-update] [--audit]

Purpose:
  Applies a structured launch-content plan into the linked Supabase project.
  Dry-run is the default. Nothing is written unless --write is provided.

Flags:
  --plan <file>       Path to a JSON plan file.
  --write             Perform inserts/updates. Without this flag the script only previews.
  --allow-update      Allow updates to existing rows found by slot key (daily date, weekly start, month key).
  --audit             Run scripts/audit-launch-readiness.mjs after a successful write.
  --help              Show this help.

Plan shape:
  {
    "metadata": { "name": "L1 launch runway" },
    "months": [{ "month_year": "2026-05", "status": "published" }],
    "monthly_themes": [{ "month_year": "2026-05", "title": "Theme", "status": "published" }],
    "weekly_principles": [{ "week_start": "2026-05-04", "title": "Weekly", "status": "published" }],
    "daily_audios": [{ "publish_date": "2026-05-04", "title": "Daily", "status": "published" }]
  }

Notes:
  - Existing rows are matched by slot:
    - daily_audio      => publish_date
    - weekly_principle => week_start
    - monthly_theme    => month_year
  - Existing rows are skipped unless --allow-update is also provided.
  - Referenced months are auto-created if they do not yet exist.
`);
}

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
    console.warn(`[launch-content] Could not read ${path} — falling back to process.env`);
  }
}

function parseArgs(argv) {
  const args = {
    plan: null,
    write: false,
    allowUpdate: false,
    audit: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--plan") {
      args.plan = argv[index + 1] ?? null;
      index += 1;
    } else if (arg === "--write") {
      args.write = true;
    } else if (arg === "--allow-update") {
      args.allowUpdate = true;
    } else if (arg === "--audit") {
      args.audit = true;
    } else if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return args;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertArray(name, value) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    throw new Error(`[launch-content] "${name}" must be an array.`);
  }
  return value;
}

function monthLabel(monthYear) {
  const [year, month] = monthYear.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, 1));
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function assertDate(name, value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`[launch-content] "${name}" must be YYYY-MM-DD. Received: ${value}`);
  }
}

function assertMonthYear(name, value) {
  if (!/^\d{4}-\d{2}$/.test(value)) {
    throw new Error(`[launch-content] "${name}" must be YYYY-MM. Received: ${value}`);
  }
}

function normalizeStatus(value, fallback = "draft") {
  const status = value ?? fallback;
  const allowed = new Set(["draft", "ready_for_review", "published", "archived"]);
  if (!allowed.has(status)) {
    throw new Error(`[launch-content] Invalid status: ${status}`);
  }
  return status;
}

function normalizeResourceLinks(value) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    throw new Error("[launch-content] resource_links must be an array when provided.");
  }
  return value;
}

function parseMediaUrl(value) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const vimeoMatch = trimmed.match(
    /(?:vimeo\.com\/(?:video\/)?|player\.vimeo\.com\/video\/)(\d+)/i
  );
  if (vimeoMatch) {
    return { vimeo_video_id: vimeoMatch[1], youtube_video_id: null, castos_episode_url: null };
  }

  const youtubeMatch = trimmed.match(
    /(?:youtube\.com\/watch\?.*v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/i
  );
  if (youtubeMatch) {
    return { vimeo_video_id: null, youtube_video_id: youtubeMatch[1], castos_episode_url: null };
  }

  if (/castos\.com|feeds\.castos/i.test(trimmed) || /^https?:\/\//i.test(trimmed)) {
    return { vimeo_video_id: null, youtube_video_id: null, castos_episode_url: trimmed };
  }

  return null;
}

function buildAudioFields(entry) {
  const fields = {};

  if (entry.castos_episode_url !== undefined) {
    fields.castos_episode_url = entry.castos_episode_url || null;
  }
  if (entry.s3_audio_key !== undefined) {
    fields.s3_audio_key = entry.s3_audio_key || null;
  }

  if (entry.audio_url !== undefined) {
    if (/^https?:\/\//i.test(entry.audio_url)) {
      fields.castos_episode_url = entry.audio_url || null;
    } else {
      fields.s3_audio_key = entry.audio_url || null;
    }
  }

  return fields;
}

function maybeAssign(target, key, value, transform = (input) => input) {
  if (value !== undefined) {
    target[key] = transform(value);
  }
}

function buildContentFields(entry, type, monthYear, monthlyPracticeId, existingRow) {
  const row = {};
  const status = normalizeStatus(entry.status, existingRow?.status ?? "draft");
  const nowIso = new Date().toISOString();

  row.type = type;
  row.status = status;
  row.is_active = status === "published";

  maybeAssign(row, "title", entry.title?.trim(), (value) => value || null);
  maybeAssign(row, "excerpt", entry.excerpt?.trim(), (value) => value || null);
  maybeAssign(row, "description", entry.description?.trim(), (value) => value || null);
  maybeAssign(row, "body", entry.body?.trim(), (value) => value || null);
  maybeAssign(row, "reflection_prompt", entry.reflection_prompt?.trim(), (value) => value || null);
  maybeAssign(row, "download_url", entry.download_url?.trim(), (value) => value || null);
  maybeAssign(row, "admin_notes", entry.admin_notes?.trim(), (value) => value || null);
  maybeAssign(row, "tier_min", entry.tier_min, (value) => value || null);
  maybeAssign(row, "duration_seconds", entry.duration_seconds, (value) => {
    if (value === null || value === "") return null;
    const parsed = Number.parseInt(String(value), 10);
    if (!Number.isFinite(parsed)) {
      throw new Error(`[launch-content] duration_seconds must be an integer. Received: ${value}`);
    }
    return parsed;
  });

  if (entry.resource_links !== undefined) {
    row.resource_links = normalizeResourceLinks(entry.resource_links);
  }

  const mediaFields =
    entry.media_url !== undefined
      ? parseMediaUrl(entry.media_url)
      : null;

  if (mediaFields) {
    Object.assign(row, mediaFields);
  }

  maybeAssign(row, "vimeo_video_id", entry.vimeo_video_id, (value) => value || null);
  maybeAssign(row, "youtube_video_id", entry.youtube_video_id, (value) => value || null);
  maybeAssign(row, "mux_playback_id", entry.mux_playback_id, (value) => value || null);
  maybeAssign(row, "mux_asset_id", entry.mux_asset_id, (value) => value || null);
  maybeAssign(row, "join_url", entry.join_url?.trim(), (value) => value || null);
  maybeAssign(row, "starts_at", entry.starts_at, (value) => {
    if (!value) return null;
    return new Date(value).toISOString();
  });

  Object.assign(row, buildAudioFields(entry));

  if (type === "daily_audio") {
    row.publish_date = entry.publish_date;
    row.month_year = monthYear;
  }
  if (type === "weekly_principle") {
    row.week_start = entry.week_start;
    row.month_year = monthYear;
  }
  if (type === "monthly_theme") {
    row.month_year = monthYear;
  }

  if (monthlyPracticeId) {
    row.monthly_practice_id = monthlyPracticeId;
  }

  if (status === "published" && !existingRow?.published_at) {
    row.published_at = nowIso;
  }

  return row;
}

function summarizeAction(action, kind, key, title, extra = "") {
  const suffix = extra ? ` ${extra}` : "";
  console.log(`- ${action.toUpperCase()} ${kind} ${key}${title ? ` :: ${title}` : ""}${suffix}`);
}

loadEnv(envPath);

const args = parseArgs(process.argv.slice(2));
if (args.help || !args.plan) {
  printHelp();
  process.exit(args.help ? 0 : 1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error(
    "[launch-content] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY."
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const planPath = resolve(process.cwd(), args.plan);
const plan = readJson(planPath);

if (!isObject(plan)) {
  throw new Error("[launch-content] Plan root must be a JSON object.");
}

const months = assertArray("months", plan.months);
const monthlyThemes = assertArray("monthly_themes", plan.monthly_themes);
const weeklyPrinciples = assertArray("weekly_principles", plan.weekly_principles);
const dailyAudios = assertArray("daily_audios", plan.daily_audios);

const summary = {
  monthsCreated: 0,
  monthsUpdated: 0,
  contentCreated: 0,
  contentUpdated: 0,
  skipped: 0,
  errors: 0,
};

const monthCache = new Map();

async function getMonthByMonthYear(monthYear) {
  if (monthCache.has(monthYear)) return monthCache.get(monthYear);

  const { data, error } = await supabase
    .from("monthly_practice")
    .select("id, month_year, label, status, description, admin_notes")
    .eq("month_year", monthYear)
    .maybeSingle();

  if (error) {
    throw new Error(`[launch-content] Failed to load month ${monthYear}: ${error.message}`);
  }

  monthCache.set(monthYear, data ?? null);
  return data ?? null;
}

async function ensureMonth(entry, source = "months") {
  assertMonthYear(`${source}.month_year`, entry.month_year);

  const existing = await getMonthByMonthYear(entry.month_year);
  const payload = {};

  maybeAssign(payload, "label", entry.label?.trim(), (value) => value || monthLabel(entry.month_year));
  maybeAssign(payload, "description", entry.description?.trim(), (value) => value || null);
  maybeAssign(payload, "admin_notes", entry.admin_notes?.trim(), (value) => value || null);
  payload.status = normalizeStatus(entry.status, existing?.status ?? "draft");

  if (existing) {
    if (source !== "months") {
      return existing;
    }

    if (!args.allowUpdate) {
      summary.skipped += 1;
      summarizeAction("skip", "month", entry.month_year, existing.label, "(exists; rerun with --allow-update to modify)");
      return existing;
    }

    if (args.write) {
      const { data, error } = await supabase
        .from("monthly_practice")
        .update({
          ...payload,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select("id, month_year, label, status, description, admin_notes")
        .single();

      if (error || !data) {
        throw new Error(`[launch-content] Failed to update month ${entry.month_year}: ${error?.message ?? "unknown error"}`);
      }

      monthCache.set(entry.month_year, data);
      summary.monthsUpdated += 1;
      summarizeAction("update", "month", entry.month_year, data.label);
      return data;
    }

    summary.monthsUpdated += 1;
    summarizeAction("would-update", "month", entry.month_year, existing.label);
    return existing;
  }

  const createPayload = {
    month_year: entry.month_year,
    label: payload.label ?? monthLabel(entry.month_year),
    status: payload.status,
    description: payload.description ?? null,
    admin_notes: payload.admin_notes ?? null,
  };

  if (args.write) {
    const { data, error } = await supabase
      .from("monthly_practice")
      .insert(createPayload)
      .select("id, month_year, label, status, description, admin_notes")
      .single();

    if (error || !data) {
      throw new Error(`[launch-content] Failed to create month ${entry.month_year}: ${error?.message ?? "unknown error"}`);
    }

    monthCache.set(entry.month_year, data);
    summary.monthsCreated += 1;
    summarizeAction("create", "month", entry.month_year, data.label);
    return data;
  }

  const dryRunMonth = {
    id: `dry-run:${entry.month_year}`,
    ...createPayload,
  };
  monthCache.set(entry.month_year, dryRunMonth);
  summary.monthsCreated += 1;
  summarizeAction("would-create", "month", entry.month_year, createPayload.label);
  return dryRunMonth;
}

async function findExistingContent(type, slotKey, slotValue, title) {
  const { data, error } = await supabase
    .from("content")
    .select("id, title, status, published_at, publish_date, week_start, month_year, monthly_practice_id")
    .eq("type", type)
    .eq(slotKey, slotValue)
    .limit(2);

  if (error) {
    throw new Error(`[launch-content] Failed to query ${type} ${slotValue}: ${error.message}`);
  }

  let rows = data ?? [];

  if (rows.length > 1 && title?.trim()) {
    rows = rows.filter((row) => row.title === title.trim());
  }

  if (rows.length > 1) {
    throw new Error(
      `[launch-content] Multiple ${type} rows found for ${slotKey}=${slotValue}${title ? ` and title=${title}` : ""}. Resolve manually before running this plan.`
    );
  }

  return rows[0] ?? null;
}

async function applyContentEntry(kind, type, slotKey, entry) {
  const slotValue = entry[slotKey];
  if (!slotValue) {
    throw new Error(`[launch-content] ${kind} entry is missing required field "${slotKey}".`);
  }

  if (slotKey === "publish_date" || slotKey === "week_start") {
    assertDate(`${kind}.${slotKey}`, slotValue);
  }

  const monthYear =
    entry.month_year ??
    (slotKey === "publish_date" || slotKey === "week_start" ? slotValue.slice(0, 7) : slotValue);

  assertMonthYear(`${kind}.month_year`, monthYear);

  const month = await ensureMonth(
    {
      month_year: monthYear,
      status: entry.month_status ?? (entry.status === "published" ? "published" : "draft"),
    },
    kind
  );

  const existing = await findExistingContent(type, slotKey, slotValue, entry.title);

  if (!existing && !entry.title?.trim()) {
    throw new Error(`[launch-content] ${kind} ${slotValue} needs a title when creating a new row.`);
  }

  const payload = buildContentFields(entry, type, monthYear, month.id, existing);

  if (existing) {
    if (!args.allowUpdate) {
      summary.skipped += 1;
      summarizeAction("skip", kind, slotValue, existing.title, "(exists; rerun with --allow-update to modify)");
      return;
    }

    if (args.write) {
      const { error } = await supabase
        .from("content")
        .update(payload)
        .eq("id", existing.id);

      if (error) {
        throw new Error(`[launch-content] Failed to update ${kind} ${slotValue}: ${error.message}`);
      }
    }

    summary.contentUpdated += 1;
    summarizeAction(args.write ? "update" : "would-update", kind, slotValue, payload.title ?? existing.title);
    return;
  }

  if (args.write) {
    const { error } = await supabase.from("content").insert(payload);
    if (error) {
      throw new Error(`[launch-content] Failed to create ${kind} ${slotValue}: ${error.message}`);
    }
  }

  summary.contentCreated += 1;
  summarizeAction(args.write ? "create" : "would-create", kind, slotValue, payload.title ?? "");
}

async function main() {
  console.log(`\n[launch-content] Plan: ${planPath}`);
  console.log(`[launch-content] Mode: ${args.write ? "WRITE" : "DRY RUN"}`);
  console.log(`[launch-content] Existing row updates: ${args.allowUpdate ? "ENABLED" : "DISABLED"}\n`);

  for (const month of months) {
    await ensureMonth(month, "months");
  }

  for (const item of monthlyThemes) {
    await applyContentEntry("monthly_theme", "monthly_theme", "month_year", item);
  }

  for (const item of weeklyPrinciples) {
    await applyContentEntry("weekly_principle", "weekly_principle", "week_start", item);
  }

  for (const item of dailyAudios) {
    await applyContentEntry("daily_audio", "daily_audio", "publish_date", item);
  }

  console.log("\n[launch-content] Summary");
  console.log(`- Months created: ${summary.monthsCreated}`);
  console.log(`- Months updated: ${summary.monthsUpdated}`);
  console.log(`- Content created: ${summary.contentCreated}`);
  console.log(`- Content updated: ${summary.contentUpdated}`);
  console.log(`- Skipped: ${summary.skipped}`);
  console.log(`- Errors: ${summary.errors}`);

  if (args.write && args.audit) {
    console.log("\n[launch-content] Running launch audit...\n");
    const auditResult = spawnSync(process.execPath, [resolve(__dirname, "./audit-launch-readiness.mjs")], {
      cwd: resolve(__dirname, ".."),
      stdio: "inherit",
    });

    if (auditResult.status !== 0) {
      process.exit(auditResult.status ?? 1);
    }
  }
}

main().catch((error) => {
  summary.errors += 1;
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
