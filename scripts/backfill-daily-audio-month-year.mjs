#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
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
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    console.warn(`[backfill-daily-audio-month-year] Could not read ${path}`);
  }
}

function parseArgs(argv) {
  return {
    write: argv.includes("--write"),
  };
}

loadEnv(envPath);

const { write } = parseArgs(process.argv.slice(2));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "[backfill-daily-audio-month-year] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY."
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

async function main() {
  const { data: rows, error: rowsError } = await supabase
    .from("content")
    .select("id, title, publish_date, monthly_practice_id")
    .eq("type", "daily_audio")
    .is("month_year", null)
    .not("monthly_practice_id", "is", null)
    .order("publish_date", { ascending: true });

  if (rowsError) {
    throw new Error(`Failed to fetch content rows: ${rowsError.message}`);
  }

  if (!rows || rows.length === 0) {
    console.log("[backfill-daily-audio-month-year] No rows need backfill.");
    return;
  }

  const monthIds = [...new Set(rows.map((row) => row.monthly_practice_id).filter(Boolean))];
  const { data: months, error: monthsError } = await supabase
    .from("monthly_practice")
    .select("id, month_year")
    .in("id", monthIds);

  if (monthsError) {
    throw new Error(`Failed to fetch monthly_practice rows: ${monthsError.message}`);
  }

  const monthYearById = new Map((months ?? []).map((month) => [month.id, month.month_year]));

  const updates = rows
    .map((row) => {
      const monthYear = monthYearById.get(row.monthly_practice_id);
      if (!monthYear) return null;
      return {
        id: row.id,
        title: row.title,
        publish_date: row.publish_date,
        month_year: monthYear,
      };
    })
    .filter(Boolean);

  console.log(
    `[backfill-daily-audio-month-year] ${write ? "Updating" : "Would update"} ${updates.length} rows.`
  );
  for (const update of updates) {
    console.log(`- ${update.publish_date ?? "no-date"} :: ${update.title} -> ${update.month_year}`);
  }

  if (!write) {
    console.log("[backfill-daily-audio-month-year] Dry run complete. Re-run with --write to persist.");
    return;
  }

  for (const update of updates) {
    const { error } = await supabase
      .from("content")
      .update({ month_year: update.month_year })
      .eq("id", update.id);

    if (error) {
      throw new Error(`Failed to update ${update.id}: ${error.message}`);
    }
  }

  console.log("[backfill-daily-audio-month-year] Backfill complete.");
}

main().catch((error) => {
  console.error(`[backfill-daily-audio-month-year] ${error.message}`);
  process.exit(1);
});
