#!/usr/bin/env node
// scripts/configure-stripe-product-catalog.mjs
//
// Creates or reuses the Positives Stripe test/live product catalog for the
// currently configured Stripe account, then writes the resulting IDs back to
// .env.local. Safe to re-run. Live mode requires an explicit flag/env gate.

import Stripe from "stripe";
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const ENV_PATH = resolve(ROOT, ".env.local");

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
    console.warn(`[stripe-catalog] Could not read ${path} — falling back to process.env`);
  }
}

function writeEnvValues(path, values) {
  let raw = readFileSync(path, "utf8");

  for (const [key, value] of Object.entries(values)) {
    const line = `${key}="${value}"`;
    const re = new RegExp(`^${key}=.*$`, "m");
    raw = re.test(raw) ? raw.replace(re, line) : `${raw.trimEnd()}\n${line}\n`;
  }

  writeFileSync(path, raw);
}

loadEnv(ENV_PATH);

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const LIVE_SETUP_ALLOWED =
  process.env.ALLOW_STRIPE_LIVE_SETUP === "true" ||
  process.argv.includes("--live");

if (!STRIPE_SECRET_KEY || !PUBLISHABLE_KEY) {
  console.error(
    "[stripe-catalog] Missing STRIPE_SECRET_KEY or NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY."
  );
  process.exit(1);
}

const keyMode = STRIPE_SECRET_KEY.startsWith("sk_live_")
  ? "live"
  : STRIPE_SECRET_KEY.startsWith("sk_test_")
    ? "test"
    : "unknown";
const publishableKeyMode = PUBLISHABLE_KEY.startsWith("pk_live_")
  ? "live"
  : PUBLISHABLE_KEY.startsWith("pk_test_")
    ? "test"
    : "unknown";

if (keyMode === "unknown" || publishableKeyMode === "unknown") {
  console.error("[stripe-catalog] Stripe keys must be sk_test/sk_live and pk_test/pk_live.");
  process.exit(1);
}

if (keyMode !== publishableKeyMode) {
  console.error(
    `[stripe-catalog] Secret key mode (${keyMode}) does not match publishable key mode (${publishableKeyMode}).`
  );
  process.exit(1);
}

if (keyMode === "live" && !LIVE_SETUP_ALLOWED) {
  console.error(
    "[stripe-catalog] Refusing to configure live Stripe without ALLOW_STRIPE_LIVE_SETUP=true or --live."
  );
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2026-03-25.dahlia",
  typescript: true,
});

const CATALOG = [
  {
    tier: "level_1",
    productName: "Positives Membership",
    env: {
      monthly: "STRIPE_PRICE_LEVEL_1_MONTHLY",
      annual: "STRIPE_PRICE_LEVEL_1_ANNUAL",
    },
    prices: [
      {
        label: "monthly",
        lookupKey: "positives_level_1_monthly",
        amount: 3700,
        interval: "month",
      },
      {
        label: "annual",
        lookupKey: "positives_level_1_annual",
        amount: 37000,
        interval: "year",
      },
    ],
  },
  {
    tier: "level_2",
    productName: "Positives Membership + Events",
    env: {
      monthly: "STRIPE_PRICE_LEVEL_2_MONTHLY",
      annual: "STRIPE_PRICE_LEVEL_2_ANNUAL",
    },
    prices: [
      {
        label: "monthly",
        lookupKey: "positives_level_2_monthly",
        amount: 9700,
        interval: "month",
      },
      {
        label: "annual",
        lookupKey: "positives_level_2_annual",
        amount: 97000,
        interval: "year",
      },
    ],
  },
  {
    tier: "level_3",
    productName: "Positives Coaching Circle",
    env: {
      monthly: "STRIPE_PRICE_LEVEL_3_MONTHLY",
      annual: "STRIPE_PRICE_LEVEL_3_ANNUAL",
    },
    prices: [
      {
        label: "monthly",
        lookupKey: "positives_level_3_monthly",
        amount: 29700,
        interval: "month",
      },
      {
        label: "annual",
        lookupKey: "positives_level_3_annual",
        amount: 297000,
        interval: "year",
      },
    ],
  },
  {
    tier: "level_4",
    productName: "Positives Executive Coaching",
    env: {
      three_pay: "STRIPE_PRICE_LEVEL_4_THREE_PAY",
      product: "STRIPE_PRODUCT_LEVEL_4",
    },
    prices: [
      {
        label: "three_pay",
        lookupKey: "positives_level_4_three_pay",
        amount: 150000,
        interval: "month",
      },
    ],
  },
];

async function findProductByName(name) {
  const products = await stripe.products.list({ active: true, limit: 100 });
  return products.data.find((product) => product.name === name) ?? null;
}

async function ensureProduct(entry) {
  const existing = await findProductByName(entry.productName);
  if (existing) return existing;

  return stripe.products.create({
    name: entry.productName,
    metadata: {
      positives_tier: entry.tier,
      managed_by: "positives_setup_script",
    },
  });
}

async function findPriceByLookupKey(lookupKey) {
  const prices = await stripe.prices.list({
    active: true,
    lookup_keys: [lookupKey],
    limit: 1,
  });

  return prices.data[0] ?? null;
}

async function ensurePrice(product, entry, priceSpec) {
  const existing = await findPriceByLookupKey(priceSpec.lookupKey);
  if (existing) return existing;

  return stripe.prices.create({
    product: product.id,
    currency: "usd",
    unit_amount: priceSpec.amount,
    recurring: {
      interval: priceSpec.interval,
      usage_type: "licensed",
    },
    lookup_key: priceSpec.lookupKey,
    nickname: `${entry.productName} ${priceSpec.label}`,
    metadata: {
      positives_tier: entry.tier,
      billing_interval: priceSpec.label,
      managed_by: "positives_setup_script",
    },
  });
}

async function main() {
  const account = await stripe.accounts.retrieve();
  const envUpdates = {};
  const summary = [];

  for (const entry of CATALOG) {
    const product = await ensureProduct(entry);
    if (entry.env.product) {
      envUpdates[entry.env.product] = product.id;
    }

    const priceSummary = [];
    for (const priceSpec of entry.prices) {
      const price = await ensurePrice(product, entry, priceSpec);
      envUpdates[entry.env[priceSpec.label]] = price.id;
      priceSummary.push({
        label: priceSpec.label,
        id: price.id,
        amount: price.unit_amount,
        interval: price.recurring?.interval,
        livemode: price.livemode,
      });
    }

    summary.push({
      tier: entry.tier,
      product: {
        id: product.id,
        name: product.name,
        livemode: product.livemode,
      },
      prices: priceSummary,
    });
  }

  writeEnvValues(ENV_PATH, envUpdates);

  console.log(
    JSON.stringify(
      {
        action: "configure_stripe_product_catalog",
        keyMode,
        accountId: account.id,
        envUpdated: Object.keys(envUpdates),
        catalog: summary,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error("[stripe-catalog] Failed:", error);
  process.exit(1);
});
