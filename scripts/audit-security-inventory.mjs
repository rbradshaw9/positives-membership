#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync, readdirSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const ENV_PATH = resolve(ROOT, ".env.local");
const MIGRATIONS_DIR = resolve(ROOT, "supabase/migrations");

function loadEnv(path) {
  try {
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
  } catch {
    // Fall back to ambient env.
  }
}

function line(value = "") {
  console.log(value);
}

function status(ok, label) {
  return `${ok ? "OK" : "CHECK"} - ${label}`;
}

loadEnv(ENV_PATH);

const REQUIRED_SECRETS = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "SEND_EMAIL_HOOK_SECRET",
  "EMAIL_UNSUBSCRIBE_SECRET",
  "CRON_SECRET",
  "ACTIVECAMPAIGN_WEBHOOK_SECRET",
];

const EXPECTED_BUCKETS = [
  {
    name: "beta-feedback-uploads",
    public: false,
    route: "app/admin/beta-feedback/screenshot/[id]/route.ts",
  },
  {
    name: "member-documents",
    public: false,
    route: "app/admin/members/[id]/documents/[documentId]/route.ts",
  },
  {
    name: "member-avatars",
    public: true,
    route: null,
  },
];

function getMigrationInventory() {
  const created = new Set();
  const rls = new Set();
  const dropped = new Set();

  for (const file of readdirSync(MIGRATIONS_DIR).sort()) {
    const sql = readFileSync(resolve(MIGRATIONS_DIR, file), "utf8");

    for (const match of sql.matchAll(/create table\s+public\.([a-z0-9_]+)/gi)) {
      created.add(match[1].toLowerCase());
    }

    for (const match of sql.matchAll(/alter table\s+public\.([a-z0-9_]+)\s+enable row level security/gi)) {
      rls.add(match[1].toLowerCase());
    }

    for (const match of sql.matchAll(/drop table(?: if exists)?\s+public\.([a-z0-9_]+)/gi)) {
      dropped.add(match[1].toLowerCase());
    }
  }

  const activeTables = [...created].filter((table) => !dropped.has(table));
  return {
    activeTables,
    missingRls: activeTables.filter((table) => !rls.has(table)),
  };
}

function getSignedRouteChecks() {
  return EXPECTED_BUCKETS.filter((bucket) => bucket.route).map((bucket) => {
    const fullPath = resolve(ROOT, bucket.route);
    const exists = existsSync(fullPath);
    const source = exists ? readFileSync(fullPath, "utf8") : "";
    return {
      bucket: bucket.name,
      route: bucket.route,
      ok: exists && source.includes(".createSignedUrl("),
    };
  });
}

async function getBucketInventory() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase env is missing.");
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );

  const { data, error } = await supabase.storage.listBuckets();
  if (error) throw error;

  return EXPECTED_BUCKETS.map((expected) => {
    const bucket = data.find((item) => item.name === expected.name);
    return {
      ...expected,
      exists: Boolean(bucket),
      actualPublic: bucket?.public ?? null,
      fileSizeLimit: bucket?.file_size_limit ?? null,
      allowedMimeTypes: bucket?.allowed_mime_types ?? [],
      ok: Boolean(bucket) && bucket.public === expected.public,
    };
  });
}

line("# Security Inventory Audit");
line();
line(`Generated: ${new Date().toISOString()}`);
line();

line("## Secrets");
for (const key of REQUIRED_SECRETS) {
  line(`- ${status(Boolean(process.env[key]), key)}`);
}
line(
  `- ${status(
    Boolean(process.env.BILLING_TOKEN_SECRET),
    process.env.BILLING_TOKEN_SECRET
      ? "BILLING_TOKEN_SECRET configured"
      : "BILLING_TOKEN_SECRET is missing; signed billing recovery links are not hardened"
  )}`
);
line(
  `- ${status(
    true,
    process.env.ABUSE_GUARD_SECRET
      ? "ABUSE_GUARD_SECRET override is configured"
      : "ABUSE_GUARD_SECRET override is not set; fallback to SUPABASE_SERVICE_ROLE_KEY is currently in use"
  )}`
);
line(
  `- ${status(
    Boolean(process.env.ADMIN_EMAILS),
    process.env.ADMIN_EMAILS
      ? "ADMIN_EMAILS bootstrap fallback is present; keep tracking this as launch risk"
      : "ADMIN_EMAILS bootstrap fallback is not configured"
  )}`
);
line();

line("## Public Table RLS Inventory");
const migrationInventory = getMigrationInventory();
line(`- Public tables explicitly created in tracked migration files: ${migrationInventory.activeTables.length}`);
if (migrationInventory.missingRls.length === 0) {
  line(`- ${status(true, "All active public tables found in migrations have RLS enabled")}`);
} else {
  line(`- ${status(false, `Missing RLS enablement in migrations: ${migrationInventory.missingRls.join(", ")}`)}`);
}
line();

line("## Storage Buckets");
try {
  const buckets = await getBucketInventory();
  for (const bucket of buckets) {
    line(`- ${status(bucket.ok, `${bucket.name} ${bucket.exists ? "exists" : "missing"} and public=${String(bucket.actualPublic)}`)}`);
    if (bucket.exists) {
      line(`  - file size limit: ${bucket.fileSizeLimit ?? "n/a"}`);
      line(`  - mime types: ${bucket.allowedMimeTypes.length > 0 ? bucket.allowedMimeTypes.join(", ") : "default"}`);
    }
  }
} catch (error) {
  line(`- CHECK - ${error instanceof Error ? error.message : "Bucket inventory failed"}`);
}
line();

line("## Private Bucket Access Paths");
for (const check of getSignedRouteChecks()) {
  line(`- ${status(check.ok, `${check.bucket} is served through ${check.route}`)}`);
}
line();

line("## Manual Dashboard Checks");
line("- CHECK - Verify Supabase Auth leaked-password protection is enabled in production.");
line("- CHECK - Verify production send-email hook secret and URL are configured in Supabase Auth.");
line("- CHECK - Verify no newly added public tables were created outside migrations or ad-hoc SQL.");
line("- CHECK - Review bootstrap ADMIN_EMAILS usage and remove it after role seeding is fully trusted.");
