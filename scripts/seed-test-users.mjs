#!/usr/bin/env node
// scripts/seed-test-users.mjs
//
// Creates / upserts two test users for dev/QA use.
// Safe to run multiple times — fully idempotent.
//
// Usage:
//   node scripts/seed-test-users.mjs
//
// Requires:
//   .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
//
// DO NOT commit credentials. This script reads them from .env.local only.
// DO NOT import this file from any app code.

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// ---------------------------------------------------------------------------
// Load .env.local manually (no dotenv dependency required)
// ---------------------------------------------------------------------------
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
      // Strip surrounding quotes
      if ((val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    console.warn(`[seed] Could not read ${path} — falling back to process.env`);
  }
}

loadEnv(envPath);

// ---------------------------------------------------------------------------
// Config — users to create
// ---------------------------------------------------------------------------
const USERS = [
  {
    email: "lopcadmin@gmail.com",
    password: "PiR43Tx2-",
    // Admin access is email-allowlist (ADMIN_EMAILS env var) — no DB column.
    // The member row still needs to be active so /today etc. work.
    memberPatch: {
      name: "Admin",
      subscription_status: "active",
      subscription_tier: "level_1",
      password_set: true,
    },
    label: "Admin",
  },
  {
    email: "rbradshaw+l1@gmail.com",
    password: "PiR43Tx2-",
    memberPatch: {
      name: "Ryan (L1 Test)",
      subscription_status: "active",
      subscription_tier: "level_1",
      password_set: true,
    },
    label: "Level 1 member",
  },
];

// ---------------------------------------------------------------------------
// Supabase admin client (service role — bypasses RLS)
// ---------------------------------------------------------------------------
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error(
    "[seed] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
      "       Make sure .env.local exists and contains these values."
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function upsertAuthUser(email, password) {
  // Check if auth user already exists
  const { data: listData, error: listErr } =
    await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });

  if (listErr) throw new Error(`listUsers: ${listErr.message}`);

  const existing = listData.users.find((u) => u.email === email);

  if (existing) {
    // Update password to ensure it matches the spec
    const { error: updErr } = await supabase.auth.admin.updateUserById(
      existing.id,
      { password, email_confirm: true }
    );
    if (updErr) throw new Error(`updateUserById(${email}): ${updErr.message}`);
    console.log(`  ✓ Auth user exists — password refreshed: ${email}`);
    return existing.id;
  }

  // Create new auth user
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // skip email verification
  });
  if (error) throw new Error(`createUser(${email}): ${error.message}`);
  console.log(`  ✓ Auth user created: ${email}`);
  return data.user.id;
}

async function upsertMember(userId, email, patch) {
  // The on_auth_user_created trigger inserts member with status='inactive'.
  // We upsert here to set the correct active tier regardless of insert order.
  const { error } = await supabase
    .from("member")
    .upsert(
      {
        id: userId,
        email,
        ...patch,
      },
      { onConflict: "id" }
    );

  if (error) throw new Error(`upsert member(${email}): ${error.message}`);
  console.log(`  ✓ Member row upserted — status=active tier=${patch.subscription_tier}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
console.log("\n[seed] Creating/upserting test users…\n");

for (const user of USERS) {
  console.log(`→ ${user.label}: ${user.email}`);
  try {
    const userId = await upsertAuthUser(user.email, user.password);
    await upsertMember(userId, user.email, user.memberPatch);
    console.log(`  ✓ Done\n`);
  } catch (err) {
    console.error(`  ✗ Failed: ${err.message}\n`);
    process.exit(1);
  }
}

console.log("[seed] All test users ready.\n");
console.log("  lopcadmin@gmail.com  → /admin  (email in ADMIN_EMAILS)");
console.log("  rbradshaw+l1@gmail.com → /today  (Level 1 active member)");
console.log("");
