#!/usr/bin/env node
/**
 * scripts/migrate-l3-l4-to-l2.mjs
 *
 * Migrates all members with subscription_tier = level_3 or level_4
 * to level_2 (Positives Plus). L3/L4 are no longer publicly marketed.
 * Existing members retain access — they gain access to Plus content.
 *
 * Stripe subscriptions are NOT touched: billing stays as-is.
 * Manual Stripe changes (if any) must be done in the Stripe Dashboard.
 *
 * Usage:
 *   node scripts/migrate-l3-l4-to-l2.mjs --dry-run   # preview only
 *   node scripts/migrate-l3-l4-to-l2.mjs --execute   # write changes
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local
function loadEnv() {
  try {
    const envPath = join(__dirname, "../.env.local");
    const lines = readFileSync(envPath, "utf8").split("\n");
    for (const line of lines) {
      const [key, ...valueParts] = line.split("=");
      if (key && valueParts.length) {
        const val = valueParts.join("=").replace(/^["']|["']$/g, "").trim();
        if (!process.env[key.trim()]) process.env[key.trim()] = val;
      }
    }
  } catch {
    // If .env.local isn't present, rely on existing env vars
  }
}

loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const isDryRun = process.argv.includes("--dry-run");
const isExecute = process.argv.includes("--execute");

if (!isDryRun && !isExecute) {
  console.error("Usage: node scripts/migrate-l3-l4-to-l2.mjs --dry-run | --execute");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log(`\n${"=".repeat(60)}`);
  console.log(` L3/L4 → L2 Member Migration`);
  console.log(` Mode: ${isDryRun ? "DRY RUN (no changes written)" : "EXECUTE (writing changes)"}`);
  console.log(`${"=".repeat(60)}\n`);

  // Fetch all L3 and L4 members
  const { data: members, error } = await supabase
    .from("member")
    .select("id, email, name, subscription_tier, subscription_status, created_at, stripe_customer_id")
    .in("subscription_tier", ["level_3", "level_4"])
    .order("subscription_tier")
    .order("created_at");

  if (error) {
    console.error("❌  Failed to fetch members:", error.message);
    process.exit(1);
  }

  if (!members || members.length === 0) {
    console.log("✅  No members found with level_3 or level_4. Nothing to migrate.");
    return;
  }

  console.log(`Found ${members.length} member(s) to migrate:\n`);
  console.log(
    members
      .map(
        (m) =>
          `  • ${m.email.padEnd(40)} ${m.subscription_tier.padEnd(10)} ${m.subscription_status} ${m.stripe_customer_id ? `(Stripe: ${m.stripe_customer_id})` : "(no Stripe ID)"}`
      )
      .join("\n")
  );

  if (isDryRun) {
    console.log(`\n✅  Dry run complete. ${members.length} member(s) would be migrated to level_2.`);
    console.log(`    Run with --execute to apply.\n`);
    return;
  }

  // Execute migration
  console.log(`\nMigrating ${members.length} member(s) to level_2…\n`);

  let successCount = 0;
  let failCount = 0;
  const failures = [];

  for (const member of members) {
    const { error: updateError } = await supabase
      .from("member")
      .update({ subscription_tier: "level_2" })
      .eq("id", member.id);

    if (updateError) {
      console.error(`  ❌  ${member.email}: ${updateError.message}`);
      failCount++;
      failures.push(member.email);
    } else {
      console.log(`  ✅  ${member.email} (${member.subscription_tier} → level_2)`);
      successCount++;
    }
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(` Migration complete`);
  console.log(`   Succeeded: ${successCount}`);
  if (failCount > 0) {
    console.log(`   Failed:    ${failCount}`);
    console.log(`   Failed members: ${failures.join(", ")}`);
  }
  console.log(`${"=".repeat(60)}\n`);

  if (failCount > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
