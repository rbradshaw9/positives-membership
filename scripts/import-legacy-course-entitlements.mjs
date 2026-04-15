#!/usr/bin/env node
// scripts/import-legacy-course-entitlements.mjs
//
// Imports legacy/course-only buyers into the permanent course entitlement model.
// Safe to run multiple times: active member+course entitlements are skipped.
//
// Usage:
//   node scripts/import-legacy-course-entitlements.mjs --file imports/legacy-courses.csv --dry-run
//   node scripts/import-legacy-course-entitlements.mjs --file imports/legacy-courses.csv
//
// Expected CSV columns:
//   email, name, course_slug OR course_id, purchase_date, legacy_transaction_id
//
// Optional CSV columns:
//   legacy_member_id, legacy_product_id, legacy_course_id, legacy_source

import { createClient } from "@supabase/supabase-js";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

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
    console.warn(`[course-import] Could not read ${path}; falling back to process.env.`);
  }
}

function parseArgs(argv) {
  const args = { dryRun: false, file: "", report: "tmp/course-entitlement-import-report.json" };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") args.help = true;
    else if (arg === "--dry-run") args.dryRun = true;
    else if (arg === "--file") args.file = argv[++i] ?? "";
    else if (arg === "--report") args.report = argv[++i] ?? args.report;
    else if (!args.file) args.file = arg;
  }

  return args;
}

function printHelp() {
  console.log(`
Import legacy course purchasers into course_entitlement.

Usage:
  node scripts/import-legacy-course-entitlements.mjs --file imports/legacy-courses.csv --dry-run
  node scripts/import-legacy-course-entitlements.mjs --file imports/legacy-courses.csv

Required CSV columns:
  email
  course_slug OR course_id

Recommended CSV columns:
  name
  purchase_date
  legacy_transaction_id
  legacy_product_id
  legacy_course_id
  legacy_member_id
  legacy_source

Options:
  --dry-run       Validate rows and report what would change without writing.
  --report PATH   Report path. Default: tmp/course-entitlement-import-report.json
`);
}

function parseCsv(raw) {
  const rows = [];
  let field = "";
  let row = [];
  let inQuotes = false;

  for (let i = 0; i < raw.length; i += 1) {
    const char = raw[i];
    const next = raw[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      field += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(field);
      field = "";
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }

  row.push(field);
  if (row.some((value) => value.trim())) rows.push(row);

  if (rows.length === 0) return [];

  const headers = rows[0].map((header) =>
    header.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")
  );

  return rows.slice(1).map((values, index) => {
    const record = { row_number: index + 2 };
    headers.forEach((header, headerIndex) => {
      record[header] = (values[headerIndex] ?? "").trim();
    });
    return record;
  });
}

function normalizedEmail(value) {
  return value.trim().toLowerCase();
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function firstValue(row, keys) {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

loadEnv(resolve(__dirname, "../.env.local"));

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

if (!args.file) {
  printHelp();
  console.error("[course-import] Missing --file.");
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error(
    "[course-import] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY."
  );
  process.exit(1);
}

const inputPath = resolve(process.cwd(), args.file);
if (!existsSync(inputPath)) {
  console.error(`[course-import] File not found: ${inputPath}`);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const report = {
  file: inputPath,
  dryRun: args.dryRun,
  totals: {
    rows: 0,
    wouldCreateMembers: 0,
    createdMembers: 0,
    wouldGrantEntitlements: 0,
    grantedEntitlements: 0,
    skippedExistingEntitlements: 0,
    missingEmails: 0,
    unknownCourses: 0,
    errors: 0,
  },
  missingEmails: [],
  unknownCourses: [],
  skippedExistingEntitlements: [],
  createdMembers: [],
  grantedEntitlements: [],
  errors: [],
};

async function findAuthUserByEmail(email) {
  let page = 1;

  while (page < 100) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`listUsers(${email}): ${error.message}`);

    const match = data.users.find((user) => user.email?.toLowerCase() === email);
    if (match) return match;
    if (data.users.length < 1000) return null;
    page += 1;
  }

  throw new Error("Auth user scan exceeded 99,000 users. Add a narrower import batch.");
}

async function resolveCourse(row) {
  const courseId = firstValue(row, ["course_id", "course_uuid"]);
  const courseSlug = firstValue(row, ["course_slug", "slug"]);

  if (!courseId && !courseSlug) {
    return { course: null, reason: "missing course_id/course_slug" };
  }

  let query = supabase.from("course").select("id, title, slug").limit(2);
  query = courseId ? query.eq("id", courseId) : query.eq("slug", courseSlug);
  const { data, error } = await query;

  if (error) throw new Error(`course lookup failed: ${error.message}`);
  if (!data || data.length === 0) {
    return { course: null, reason: courseId ? `unknown course_id ${courseId}` : `unknown course_slug ${courseSlug}` };
  }
  if (data.length > 1) {
    return { course: null, reason: `ambiguous course reference ${courseId || courseSlug}` };
  }

  return { course: data[0], reason: "" };
}

async function ensureMember(row, email) {
  const { data: existingMember, error: memberLookupError } = await supabase
    .from("member")
    .select("id, email")
    .eq("email", email)
    .maybeSingle();

  if (memberLookupError) {
    throw new Error(`member lookup failed for ${email}: ${memberLookupError.message}`);
  }

  if (existingMember) return { memberId: existingMember.id, created: false };

  if (args.dryRun) {
    report.totals.wouldCreateMembers += 1;
    return { memberId: `dry-run:${email}`, created: true };
  }

  let authUser = await findAuthUserByEmail(email);
  if (!authUser) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        name: firstValue(row, ["name", "full_name"]),
        source: "legacy_course_import",
      },
    });

    if (error) throw new Error(`create auth user failed for ${email}: ${error.message}`);
    authUser = data.user;
  }

  const name = firstValue(row, ["name", "full_name"]);
  const legacyMemberRef = firstValue(row, ["legacy_member_id", "legacy_contact_id"]);
  const { error: upsertError } = await supabase.from("member").upsert(
    {
      id: authUser.id,
      email,
      ...(name ? { name } : {}),
      ...(legacyMemberRef ? { legacy_member_ref: legacyMemberRef } : {}),
      subscription_status: "inactive",
      password_set: false,
    },
    { onConflict: "id" }
  );

  if (upsertError) {
    throw new Error(`member upsert failed for ${email}: ${upsertError.message}`);
  }

  report.totals.createdMembers += 1;
  report.createdMembers.push({ email, member_id: authUser.id });
  return { memberId: authUser.id, created: true };
}

async function entitlementExists(memberId, courseId) {
  if (memberId.startsWith("dry-run:")) return false;

  const { data, error } = await supabase
    .from("course_entitlement")
    .select("id, source, status")
    .eq("member_id", memberId)
    .eq("course_id", courseId)
    .eq("status", "active")
    .maybeSingle();

  if (error) throw new Error(`entitlement lookup failed: ${error.message}`);
  return data;
}

async function grantEntitlement({ row, email, memberId, course }) {
  const existing = await entitlementExists(memberId, course.id);
  if (existing) {
    report.totals.skippedExistingEntitlements += 1;
    report.skippedExistingEntitlements.push({
      row_number: row.row_number,
      email,
      course_id: course.id,
      entitlement_id: existing.id,
    });
    return;
  }

  if (args.dryRun) {
    report.totals.wouldGrantEntitlements += 1;
    report.grantedEntitlements.push({
      row_number: row.row_number,
      email,
      course_id: course.id,
      dry_run: true,
    });
    return;
  }

  const legacyTransactionId = firstValue(row, [
    "legacy_transaction_id",
    "legacy_order_id",
    "legacy_purchase_id",
    "transaction_id",
  ]);
  const legacyProductId = firstValue(row, ["legacy_product_id", "legacy_course_id"]);
  const purchasedAt = parseDate(firstValue(row, ["purchase_date", "purchased_at", "created_at"]));
  const legacySource = firstValue(row, ["legacy_source", "source"]) || "legacy_import";
  const legacyRef =
    legacyTransactionId ||
    [legacySource, legacyProductId, email, course.slug ?? course.id].filter(Boolean).join(":");

  const { data, error } = await supabase
    .from("course_entitlement")
    .insert({
      member_id: memberId,
      course_id: course.id,
      source: "migration",
      status: "active",
      legacy_source: legacySource,
      legacy_ref: legacyRef,
      purchased_at: purchasedAt,
      grant_note: `Migrated legacy course access from ${legacySource}.`,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      report.totals.skippedExistingEntitlements += 1;
      return;
    }
    throw new Error(`entitlement insert failed: ${error.message}`);
  }

  await supabase.from("activity_event").insert({
    member_id: memberId,
    event_type: "admin_course_granted",
    metadata: {
      course_id: course.id,
      course_title: course.title,
      source: "migration",
      legacy_source: legacySource,
      legacy_ref: legacyRef,
      entitlement_id: data.id,
    },
  });

  report.totals.grantedEntitlements += 1;
  report.grantedEntitlements.push({
    row_number: row.row_number,
    email,
    course_id: course.id,
    entitlement_id: data.id,
  });
}

const rows = parseCsv(readFileSync(inputPath, "utf8"));
report.totals.rows = rows.length;

console.log(
  `[course-import] ${args.dryRun ? "Dry-run validating" : "Importing"} ${rows.length} row(s) from ${inputPath}`
);

for (const row of rows) {
  try {
    const email = normalizedEmail(firstValue(row, ["email", "buyer_email", "contact_email"]));
    if (!email) {
      report.totals.missingEmails += 1;
      report.missingEmails.push({ row_number: row.row_number });
      continue;
    }

    const { course, reason } = await resolveCourse(row);
    if (!course) {
      report.totals.unknownCourses += 1;
      report.unknownCourses.push({
        row_number: row.row_number,
        email,
        reason,
        legacy_product_id: firstValue(row, ["legacy_product_id", "legacy_course_id"]),
      });
      continue;
    }

    const { memberId } = await ensureMember(row, email);
    await grantEntitlement({ row, email, memberId, course });
  } catch (error) {
    report.totals.errors += 1;
    report.errors.push({
      row_number: row.row_number,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

const reportPath = resolve(process.cwd(), args.report);
mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, JSON.stringify(report, null, 2));

console.log("\n[course-import] Complete.");
console.log(JSON.stringify(report.totals, null, 2));
console.log(`[course-import] Report written to ${reportPath}\n`);

if (report.totals.errors > 0 || report.totals.missingEmails > 0 || report.totals.unknownCourses > 0) {
  process.exitCode = 1;
}
