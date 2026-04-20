#!/usr/bin/env node
// scripts/backfill-member-names-from-stripe.mjs
//
// Backfills member.name from Stripe customer data for existing purchases that
// predate the checkout name-persistence fix.

import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = resolve(__dirname, "../.env.local");

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
    console.warn(`[name-backfill] Could not read ${path} — falling back to process.env`);
  }
}

loadEnv(ENV_PATH);

if (
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  !process.env.SUPABASE_SERVICE_ROLE_KEY ||
  !process.env.STRIPE_SECRET_KEY
) {
  console.error(
    "[name-backfill] Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or STRIPE_SECRET_KEY."
  );
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-03-25.dahlia",
  typescript: true,
});

function isStripeMissingCustomerError(error) {
  return (
    error instanceof Stripe.errors.StripeInvalidRequestError &&
    error.code === "resource_missing"
  );
}

async function main() {
  const { data: members, error } = await supabase
    .from("member")
    .select("id,email,name,stripe_customer_id")
    .not("stripe_customer_id", "is", null)
    .is("name", null)
    .order("email");

  if (error) {
    throw new Error(`Could not load members for backfill: ${error.message}`);
  }

  if (!members || members.length === 0) {
    console.log("[name-backfill] No members need name backfill.");
    return;
  }

  console.log(`\n[name-backfill] Backfilling ${members.length} member name(s)…\n`);

  for (const member of members) {
    let customer;
    try {
      customer = await stripe.customers.retrieve(member.stripe_customer_id);
    } catch (error) {
      if (isStripeMissingCustomerError(error)) {
        console.log(
          `- skipped ${member.email} (${member.stripe_customer_id}) — Stripe customer missing`
        );
        continue;
      }
      throw error;
    }

    if (customer.deleted) {
      console.log(`- skipped ${member.email} (${member.stripe_customer_id}) — Stripe customer deleted`);
      continue;
    }

    const name =
      typeof customer === "string" ? null : customer.name?.trim() ?? null;

    if (!name) {
      console.log(`- skipped ${member.email} (${member.stripe_customer_id}) — no Stripe name`);
      continue;
    }

    const { error: updateError } = await supabase
      .from("member")
      .update({ name })
      .eq("id", member.id);

    if (updateError) {
      throw new Error(`Could not update ${member.email}: ${updateError.message}`);
    }

    console.log(`- updated ${member.email} → ${name}`);
  }

  console.log("\n[name-backfill] Done.\n");
}

main().catch((error) => {
  console.error("[name-backfill] Failed:", error);
  process.exit(1);
});
