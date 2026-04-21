#!/usr/bin/env node
// scripts/reconcile-stale-stripe-customers.mjs
//
// Dry-run-first repair for member.stripe_customer_id values that point to
// deleted/missing Stripe customers and have no replacement customer with the
// same email. This clears only unrecoverable stale links so admin billing views
// stop treating broken customer IDs as usable Stripe records.

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import Stripe from "stripe";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = resolve(__dirname, "../.env.local");
const PAGE_SIZE = 500;

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
    console.warn("[stripe-customer-reconcile] Could not read .env.local; using process.env.");
  }
}

function parseArgs(argv) {
  const options = {
    apply: false,
    email: null,
    member: null,
    limit: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--apply") {
      options.apply = true;
      continue;
    }

    const readValue = (name) => {
      if (arg.startsWith(`${name}=`)) return arg.slice(name.length + 1);
      if (arg === name && next) {
        index += 1;
        return next;
      }
      return null;
    };

    options.email = readValue("--email") ?? options.email;
    options.member = readValue("--member") ?? options.member;

    const limit = readValue("--limit");
    if (limit) options.limit = Number(limit);
  }

  return options;
}

function requiredEnv(key) {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

function shortId(value) {
  if (!value) return "none";
  if (value.length <= 14) return value;
  return `${value.slice(0, 10)}…${value.slice(-4)}`;
}

function isMissingCustomer(error) {
  return (
    error instanceof Stripe.errors.StripeInvalidRequestError &&
    error.code === "resource_missing"
  );
}

async function listMembers(supabase, options) {
  const rows = [];
  let from = 0;

  while (true) {
    let query = supabase
      .from("member")
      .select("id,email,name,stripe_customer_id,subscription_status,subscription_tier,launch_cohort")
      .not("stripe_customer_id", "is", null)
      .order("email", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (options.email) query = query.ilike("email", options.email);
    if (options.member) query = query.eq("id", options.member);

    const { data, error } = await query;
    if (error) throw new Error(`Could not load members: ${error.message}`);
    rows.push(...(data ?? []));

    if (!data || data.length < PAGE_SIZE) break;
    if (options.limit && rows.length >= options.limit) break;
    from += PAGE_SIZE;
  }

  return options.limit ? rows.slice(0, options.limit) : rows;
}

async function findPossibleMatches(stripe, member) {
  if (!member.email) return [];
  const response = await stripe.customers.list({ email: member.email, limit: 10 });
  return response.data
    .filter((customer) => customer.id !== member.stripe_customer_id && !customer.deleted)
    .map((customer) => ({
      id: customer.id,
      email: customer.email ?? null,
      name: customer.name ?? null,
      created: customer.created ? new Date(customer.created * 1000).toISOString() : null,
    }));
}

async function inspectMember(stripe, member) {
  try {
    const customer = await stripe.customers.retrieve(member.stripe_customer_id);
    if (customer.deleted) {
      return {
        member,
        status: "deleted",
        possibleMatches: await findPossibleMatches(stripe, member),
      };
    }
    return { member, status: "ok", possibleMatches: [] };
  } catch (error) {
    if (isMissingCustomer(error)) {
      return {
        member,
        status: "missing",
        possibleMatches: await findPossibleMatches(stripe, member),
      };
    }
    return {
      member,
      status: "stripe_error",
      possibleMatches: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function clearStaleCustomer(supabase, result) {
  const oldCustomerId = result.member.stripe_customer_id;

  const { error: memberError } = await supabase
    .from("member")
    .update({ stripe_customer_id: null })
    .eq("id", result.member.id)
    .eq("stripe_customer_id", oldCustomerId);

  if (memberError) throw new Error(`Could not clear member link: ${memberError.message}`);

  const { error: summaryError } = await supabase
    .from("member_billing_summary")
    .update({ stripe_customer_id: null, updated_at: new Date().toISOString() })
    .eq("member_id", result.member.id)
    .eq("stripe_customer_id", oldCustomerId);

  if (summaryError) {
    throw new Error(`Could not clear billing summary link: ${summaryError.message}`);
  }

  const { error: auditError } = await supabase.from("member_audit_log").insert({
    actor_member_id: null,
    target_member_id: result.member.id,
    action: "stripe_customer_reconciled",
    target_type: "stripe_customer",
    target_id: oldCustomerId,
    reason:
      "Cleared stale Stripe customer link after Stripe reported the customer missing/deleted and no replacement customer existed for the member email.",
    metadata: {
      previous_stripe_customer_id: oldCustomerId,
      status: result.status,
      script: "scripts/reconcile-stale-stripe-customers.mjs",
    },
  });

  if (auditError) {
    console.warn(`[stripe-customer-reconcile] Audit insert failed: ${auditError.message}`);
  }
}

loadEnv(ENV_PATH);

const options = parseArgs(process.argv.slice(2));
const supabase = createClient(
  requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
  requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { autoRefreshToken: false, persistSession: false } }
);
const stripeKey = requiredEnv("STRIPE_SECRET_KEY");
const stripe = new Stripe(stripeKey, {
  apiVersion: "2026-03-25.dahlia",
  typescript: true,
});

const members = await listMembers(supabase, options);
const results = [];

for (const member of members) {
  results.push(await inspectMember(stripe, member));
}

const repairable = results.filter(
  (result) =>
    ["missing", "deleted"].includes(result.status) && result.possibleMatches.length === 0
);
const needsManualReview = results.filter(
  (result) =>
    ["missing", "deleted"].includes(result.status) && result.possibleMatches.length > 0
);

console.log("\n# Stripe Customer Reconciliation\n");
console.log(`Mode: ${stripeKey.startsWith("sk_live_") ? "live" : "test"}`);
console.log(`Action: ${options.apply ? "apply" : "dry-run"}`);
console.log(`Members inspected: ${results.length}`);
console.log(`Valid links: ${results.filter((result) => result.status === "ok").length}`);
console.log(`Repairable stale links: ${repairable.length}`);
console.log(`Manual review needed: ${needsManualReview.length}`);
console.log(`Stripe errors: ${results.filter((result) => result.status === "stripe_error").length}`);

if (repairable.length > 0) {
  console.log("\n## Stale links to clear\n");
  for (const result of repairable) {
    console.log(
      `- ${result.status.toUpperCase()} ${result.member.email} | member ${shortId(
        result.member.id
      )} | customer ${shortId(result.member.stripe_customer_id)}`
    );
  }
}

if (needsManualReview.length > 0) {
  console.log("\n## Manual review needed\n");
  for (const result of needsManualReview) {
    console.log(
      `- ${result.status.toUpperCase()} ${result.member.email} | customer ${shortId(
        result.member.stripe_customer_id
      )} | possible matches ${result.possibleMatches.map((match) => shortId(match.id)).join(", ")}`
    );
  }
}

if (!options.apply) {
  console.log("\nDry run only. Re-run with `--apply` to clear repairable stale links.\n");
  process.exit(repairable.length > 0 ? 2 : 0);
}

for (const result of repairable) {
  await clearStaleCustomer(supabase, result);
  console.log(`- cleared ${result.member.email} (${shortId(result.member.stripe_customer_id)})`);
}

console.log("\nReconciliation complete.\n");
