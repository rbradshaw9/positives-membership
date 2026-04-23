#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const FP_BASE = "https://api.firstpromoter.com/api/v2";
const strict = process.argv.includes("--strict");
const showEmails = process.argv.includes("--show-emails");
const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv(path) {
  try {
    const raw = readFileSync(path, "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex === -1) continue;

      const key = trimmed.slice(0, eqIndex).trim();
      let value = trimmed.slice(eqIndex + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[key] ||= value;
    }
  } catch {
    // Keep CI/process env support for environments that do not use .env.local.
  }
}

loadEnv(resolve(__dirname, "../.env.local"));

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function maskEmail(email) {
  if (!email || showEmails) return email ?? null;
  const [name, domain] = email.split("@");
  return `${name.slice(0, 2)}***@${domain}`;
}

async function fpFetch(path, { query = {} } = {}) {
  const url = new URL(`${FP_BASE}${path}`);
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined || value === "") continue;
    url.searchParams.set(key, String(value));
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${requireEnv("FIRSTPROMOTER_API_KEY")}`,
      "Account-ID": requireEnv("FIRSTPROMOTER_ACCOUNT_ID"),
      Accept: "application/json",
    },
  });

  const text = await response.text();
  if (!response.ok) {
    const error = new Error(`${response.status}: ${text}`);
    error.status = response.status;
    throw error;
  }

  return text ? JSON.parse(text) : null;
}

async function getPromoter(identifier, findBy) {
  return fpFetch(`/company/promoters/${encodeURIComponent(String(identifier))}`, {
    query: {
      ...(findBy ? { find_by: findBy } : {}),
      include_parent_promoter: true,
    },
  });
}

function classifyRow({ parent, child }) {
  if (!parent) return "unresolved_parent_ref";
  if (!child?.parent_promoter?.id) return "missing_parent";
  if (child.parent_promoter.id !== parent.id) return "mismatched_parent";
  return "ok";
}

const supabase = createClient(
  requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
  requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { persistSession: false } }
);

const { data: members, error } = await supabase
  .from("member")
  .select("id,email,referred_by_fpr,fp_promoter_id,fp_ref_id")
  .not("referred_by_fpr", "is", null)
  .not("fp_promoter_id", "is", null)
  .order("created_at", { ascending: false });

if (error) {
  throw new Error(`Failed to load referred affiliate members: ${error.message}`);
}

const rows = [];

for (const member of members ?? []) {
  let parent = null;
  let child = null;
  let errorMessage = null;

  try {
    child = await getPromoter(member.fp_promoter_id);
  } catch (err) {
    errorMessage = `child_lookup_failed: ${err.message}`;
  }

  try {
    parent = await getPromoter(member.referred_by_fpr, "ref_token");
  } catch (err) {
    if (err.status !== 404) {
      errorMessage = errorMessage
        ? `${errorMessage}; parent_lookup_failed: ${err.message}`
        : `parent_lookup_failed: ${err.message}`;
    }
  }

  const status = errorMessage ? "error" : classifyRow({ parent, child });

  rows.push({
    status,
    member_id: member.id,
    email: maskEmail(member.email),
    referred_by_fpr: member.referred_by_fpr,
    fp_promoter_id: member.fp_promoter_id,
    fp_ref_id: member.fp_ref_id,
    expected_parent_promoter_id: parent?.id ?? null,
    actual_parent_promoter_id: child?.parent_promoter?.id ?? null,
    error: errorMessage,
  });
}

const summary = rows.reduce(
  (acc, row) => {
    acc.total += 1;
    acc[row.status] = (acc[row.status] ?? 0) + 1;
    return acc;
  },
  { total: 0 }
);

console.log(JSON.stringify({ summary, rows }, null, 2));

if (strict && rows.some((row) => row.status !== "ok")) {
  process.exit(1);
}
