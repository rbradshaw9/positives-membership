#!/usr/bin/env node
// scripts/seed-stripe-billing-fixtures.mjs
//
// Ensures the standard QA members have real Stripe customers + active
// subscriptions so billing portal flows can be tested end-to-end.
//
// Safe-ish to re-run in the current sandbox account. Existing active QA
// subscriptions for the managed customers are canceled and recreated to match
// the expected tier/price.

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
    console.warn(`[billing-fixtures] Could not read ${path} — falling back to process.env`);
  }
}

loadEnv(ENV_PATH);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!supabaseUrl || !serviceRoleKey || !stripeSecretKey) {
  console.error(
    "[billing-fixtures] Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or STRIPE_SECRET_KEY."
  );
  process.exit(1);
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2026-03-25.dahlia",
  typescript: true,
});

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const FIXTURES = [
  {
    email: "rbradshaw+l1@gmail.com",
    tier: "level_1",
    priceId: process.env.STRIPE_PRICE_LEVEL_1_MONTHLY,
    label: "Level 1 QA fixture",
  },
  {
    email: "rbradshaw+l2@gmail.com",
    tier: "level_2",
    priceId: process.env.STRIPE_PRICE_LEVEL_2_MONTHLY,
    label: "Level 2 QA fixture",
  },
  {
    email: "rbradshaw+l3@gmail.com",
    tier: "level_3",
    priceId: process.env.STRIPE_PRICE_LEVEL_3_MONTHLY,
    label: "Level 3 QA fixture",
  },
];

for (const fixture of FIXTURES) {
  if (!fixture.priceId) {
    console.error(
      `[billing-fixtures] Missing Stripe price ID for ${fixture.email} (${fixture.tier}).`
    );
    process.exit(1);
  }
}

async function getAuthUserId(email) {
  const { data, error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (error) {
    throw new Error(`Could not list auth users: ${error.message}`);
  }

  const user = data.users.find((entry) => entry.email === email);
  if (!user) {
    throw new Error(`No auth user exists for ${email}. Run seed-test-users first.`);
  }

  return user.id;
}

async function ensureCustomer(email) {
  const existing = await stripe.customers.list({ email, limit: 10 });
  const customer =
    existing.data.find((entry) => entry.metadata?.qa_fixture === "true") ??
    existing.data[0];

  if (customer) {
    return customer;
  }

  return stripe.customers.create({
    email,
    name: `QA ${email}`,
    metadata: {
      qa_fixture: "true",
    },
  });
}

async function ensureDefaultPaymentSource(customerId) {
  await stripe.customers.update(customerId, {
    source: "tok_visa",
  });

  return "tok_visa";
}

async function resetActiveSubscriptions(customerId) {
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 100,
  });

  for (const subscription of subscriptions.data) {
    if (subscription.status === "canceled" || subscription.status === "incomplete_expired") {
      continue;
    }

    await stripe.subscriptions.cancel(subscription.id);
  }
}

async function createActiveSubscription(customerId, priceId) {
  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    collection_method: "charge_automatically",
    payment_behavior: "allow_incomplete",
    metadata: {
      qa_fixture: "true",
    },
    expand: ["latest_invoice.payment_intent"],
  });

  if (
    subscription.latest_invoice &&
    typeof subscription.latest_invoice !== "string" &&
    subscription.latest_invoice.status === "open"
  ) {
    await stripe.invoices.pay(subscription.latest_invoice.id);
  }

  const refreshed = await stripe.subscriptions.retrieve(subscription.id, {
    expand: ["items.data.price"],
  });

  if (!["active", "trialing"].includes(refreshed.status)) {
    throw new Error(
      `Subscription ${refreshed.id} for ${customerId} is ${refreshed.status}, expected active.`
    );
  }

  return refreshed;
}

async function patchMember(userId, email, customerId, tier) {
  const { error } = await supabase
    .from("member")
    .update({
      email,
      stripe_customer_id: customerId,
      subscription_status: "active",
      subscription_tier: tier,
      password_set: true,
    })
    .eq("id", userId);

  if (error) {
    throw new Error(`Failed to update member(${email}): ${error.message}`);
  }
}

console.log("\n[billing-fixtures] Seeding Stripe-backed QA members…\n");

for (const fixture of FIXTURES) {
  console.log(`→ ${fixture.label}: ${fixture.email}`);
  try {
    const userId = await getAuthUserId(fixture.email);
    const customer = await ensureCustomer(fixture.email);
    await ensureDefaultPaymentSource(customer.id);
    await resetActiveSubscriptions(customer.id);
    const subscription = await createActiveSubscription(customer.id, fixture.priceId);
    await patchMember(userId, fixture.email, customer.id, fixture.tier);

    console.log(
      `  ✓ customer=${customer.id} subscription=${subscription.id} status=${subscription.status}\n`
    );
  } catch (error) {
    console.error(
      `  ✗ Failed for ${fixture.email}: ${error instanceof Error ? error.message : String(error)}\n`
    );
    process.exit(1);
  }
}

console.log("[billing-fixtures] All Stripe-backed QA fixtures are ready.\n");
