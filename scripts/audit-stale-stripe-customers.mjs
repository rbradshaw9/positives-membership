#!/usr/bin/env node
// scripts/audit-stale-stripe-customers.mjs
//
// Read-only audit for member.stripe_customer_id values. This intentionally does
// not repair data: stale billing links can affect access and support workflows,
// so reconciliation should be reviewed before any production mutation.

import { createClient } from "@supabase/supabase-js";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
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
    console.warn(`[stripe-customer-audit] Could not read ${path} — falling back to process.env`);
  }
}

function parseArgs(argv) {
  const options = {
    email: null,
    customer: null,
    member: null,
    limit: null,
    includePayments: false,
    staleOnly: false,
    output: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--include-payments") {
      options.includePayments = true;
      continue;
    }
    if (arg === "--stale-only") {
      options.staleOnly = true;
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
    options.customer = readValue("--customer") ?? options.customer;
    options.member = readValue("--member") ?? options.member;
    options.output = readValue("--output") ?? options.output;

    const limit = readValue("--limit");
    if (limit) options.limit = Number(limit);
  }

  return options;
}

function requiredEnv(key) {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function isStripeMissingCustomerError(error) {
  return (
    error instanceof Stripe.errors.StripeInvalidRequestError &&
    error.code === "resource_missing"
  );
}

function cents(value) {
  return Number.isFinite(value) ? value : 0;
}

function formatUsd(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents(value) / 100);
}

function shortId(value) {
  if (!value) return "none";
  if (value.length <= 14) return value;
  return `${value.slice(0, 10)}…${value.slice(-4)}`;
}

async function listMembers(supabase, options) {
  const rows = [];
  let from = 0;

  while (true) {
    let query = supabase
      .from("member")
      .select(
        "id,email,name,stripe_customer_id,subscription_status,subscription_tier,launch_cohort,created_at"
      )
      .not("stripe_customer_id", "is", null)
      .order("email", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (options.email) query = query.ilike("email", options.email);
    if (options.customer) query = query.eq("stripe_customer_id", options.customer);
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

async function findPossibleCustomerMatches(stripe, email, currentCustomerId) {
  if (!email) return [];

  const response = await stripe.customers.list({ email, limit: 10 });
  return response.data
    .filter((customer) => customer.id !== currentCustomerId && !customer.deleted)
    .map((customer) => ({
      id: customer.id,
      email: customer.email ?? null,
      name: customer.name ?? null,
      created: customer.created ? new Date(customer.created * 1000).toISOString() : null,
    }));
}

async function getPaymentTotals(stripe, customerId) {
  const [charges, paymentIntents, invoices] = await Promise.all([
    stripe.charges.list({ customer: customerId, limit: 100 }),
    stripe.paymentIntents.list({ customer: customerId, limit: 100 }),
    stripe.invoices.list({ customer: customerId, limit: 100 }),
  ]);

  const succeededCharges = charges.data.filter((charge) => charge.status === "succeeded");
  const succeededPaymentIntents = paymentIntents.data.filter(
    (intent) => intent.status === "succeeded"
  );
  const paidInvoices = invoices.data.filter((invoice) => invoice.status === "paid");

  return {
    succeeded_charge_count: succeededCharges.length,
    succeeded_charge_total_cents: succeededCharges.reduce(
      (sum, charge) => sum + cents(charge.amount_captured || charge.amount),
      0
    ),
    succeeded_payment_intent_count: succeededPaymentIntents.length,
    succeeded_payment_intent_total_cents: succeededPaymentIntents.reduce(
      (sum, intent) => sum + cents(intent.amount_received || intent.amount),
      0
    ),
    paid_invoice_count: paidInvoices.length,
    paid_invoice_total_cents: paidInvoices.reduce(
      (sum, invoice) => sum + cents(invoice.amount_paid),
      0
    ),
  };
}

async function auditMember(stripe, member, options) {
  const base = {
    member_id: member.id,
    email: member.email,
    name: member.name,
    stripe_customer_id: member.stripe_customer_id,
    subscription_status: member.subscription_status,
    subscription_tier: member.subscription_tier,
    launch_cohort: member.launch_cohort,
    status: "unknown",
    stripe_customer_email: null,
    stripe_customer_name: null,
    stripe_customer_created: null,
    possible_matches: [],
    payment_totals: null,
    error: null,
  };

  try {
    const customer = await stripe.customers.retrieve(member.stripe_customer_id);
    if (customer.deleted) {
      return {
        ...base,
        status: "deleted",
        possible_matches: await findPossibleCustomerMatches(
          stripe,
          member.email,
          member.stripe_customer_id
        ),
      };
    }

    return {
      ...base,
      status: "ok",
      stripe_customer_email: customer.email ?? null,
      stripe_customer_name: customer.name ?? null,
      stripe_customer_created: customer.created
        ? new Date(customer.created * 1000).toISOString()
        : null,
      payment_totals: options.includePayments
        ? await getPaymentTotals(stripe, member.stripe_customer_id)
        : null,
    };
  } catch (error) {
    if (isStripeMissingCustomerError(error)) {
      return {
        ...base,
        status: "missing",
        possible_matches: await findPossibleCustomerMatches(
          stripe,
          member.email,
          member.stripe_customer_id
        ),
      };
    }

    return {
      ...base,
      status: "stripe_error",
      error: error instanceof Error ? error.message : "Unknown Stripe error",
    };
  }
}

function summarize(results) {
  return results.reduce(
    (summary, result) => {
      summary.total += 1;
      summary[result.status] = (summary[result.status] ?? 0) + 1;
      if (result.possible_matches.length > 0) summary.with_possible_matches += 1;
      return summary;
    },
    {
      total: 0,
      ok: 0,
      deleted: 0,
      missing: 0,
      stripe_error: 0,
      with_possible_matches: 0,
    }
  );
}

function printReport(results, summary, options) {
  const visibleResults = options.staleOnly
    ? results.filter((result) => result.status !== "ok")
    : results;

  console.log("\n# Stripe Customer Link Audit\n");
  console.log(`Members audited: ${summary.total}`);
  console.log(`OK: ${summary.ok}`);
  console.log(`Deleted in Stripe: ${summary.deleted}`);
  console.log(`Missing in Stripe: ${summary.missing}`);
  console.log(`Stripe errors: ${summary.stripe_error}`);
  console.log(`Stale rows with possible replacement customer by email: ${summary.with_possible_matches}`);

  if (visibleResults.length === 0) {
    console.log("\nNo rows matched the visible report filter.\n");
    return;
  }

  console.log("\n## Detail\n");
  for (const result of visibleResults) {
    const matchText =
      result.possible_matches.length > 0
        ? ` | possible matches: ${result.possible_matches
            .map((match) => shortId(match.id))
            .join(", ")}`
        : "";
    const paymentText = result.payment_totals
      ? ` | charges ${formatUsd(result.payment_totals.succeeded_charge_total_cents)} (${result.payment_totals.succeeded_charge_count}) | invoices ${formatUsd(result.payment_totals.paid_invoice_total_cents)} (${result.payment_totals.paid_invoice_count}) | PIs ${formatUsd(result.payment_totals.succeeded_payment_intent_total_cents)} (${result.payment_totals.succeeded_payment_intent_count})`
      : "";
    const errorText = result.error ? ` | error: ${result.error}` : "";

    console.log(
      `- ${result.status.toUpperCase()} ${result.email ?? result.member_id} | member ${shortId(result.member_id)} | customer ${shortId(result.stripe_customer_id)}${matchText}${paymentText}${errorText}`
    );
  }

  console.log();
}

loadEnv(ENV_PATH);

const options = parseArgs(process.argv.slice(2));
const supabase = createClient(
  requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
  requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { autoRefreshToken: false, persistSession: false } }
);
const stripe = new Stripe(requiredEnv("STRIPE_SECRET_KEY"), {
  apiVersion: "2026-03-25.dahlia",
  typescript: true,
});

const members = await listMembers(supabase, options);
const results = [];

for (const member of members) {
  results.push(await auditMember(stripe, member, options));
}

const summary = summarize(results);
const report = {
  generated_at: new Date().toISOString(),
  mode: requiredEnv("STRIPE_SECRET_KEY").startsWith("sk_live_") ? "live" : "test",
  filters: options,
  summary,
  results,
};

printReport(results, summary, options);

if (options.output) {
  const outputPath = resolve(process.cwd(), options.output);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`[stripe-customer-audit] Wrote ${outputPath}`);
}

if (summary.deleted > 0 || summary.missing > 0 || summary.stripe_error > 0) {
  process.exitCode = 2;
}
