#!/usr/bin/env node
// scripts/configure-stripe-hosted-billing.mjs
//
// Configures Stripe-hosted billing surfaces for Positives:
// - uploads brand icon/logo assets
// - applies account branding colors + support profile
// - enables Customer Portal subscription updates for L1/L2/L3
// - sets portal headline + policy links
//
// Safe to re-run in the current sandbox account.

import Stripe from "stripe";
import { createReadStream, readFileSync } from "fs";
import { resolve, dirname, basename } from "path";
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
    console.warn(`[stripe-branding] Could not read ${path} — falling back to process.env`);
  }
}

loadEnv(ENV_PATH);

const APP_URL = process.env.NEXT_PUBLIC_APP_URL;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!APP_URL || !STRIPE_SECRET_KEY) {
  console.error(
    "[stripe-branding] Missing NEXT_PUBLIC_APP_URL or STRIPE_SECRET_KEY in .env.local."
  );
  process.exit(1);
}

const PRICE_IDS = [
  process.env.STRIPE_PRICE_LEVEL_1_MONTHLY,
  process.env.STRIPE_PRICE_LEVEL_1_ANNUAL,
  process.env.STRIPE_PRICE_LEVEL_2_MONTHLY,
  process.env.STRIPE_PRICE_LEVEL_2_ANNUAL,
  process.env.STRIPE_PRICE_LEVEL_3_MONTHLY,
  process.env.STRIPE_PRICE_LEVEL_3_ANNUAL,
].filter(Boolean);

if (PRICE_IDS.length < 6) {
  console.error(
    "[stripe-branding] Missing one or more L1/L2/L3 Stripe price IDs in .env.local."
  );
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2026-03-25.dahlia",
  typescript: true,
});

const ICON_PATH = resolve(
  ROOT,
  "public/logos/png/positives-logos_positives-icon-square.png"
);
const LOGO_PATH = resolve(
  ROOT,
  "public/logos/png/positives-logos_Positives-logo-full.png"
);

async function uploadBusinessAsset(purpose, path) {
  const uploaded = await stripe.files.create({
    purpose,
    file: {
      data: createReadStream(path),
      name: basename(path),
      type: "image/png",
    },
  });

  return uploaded.id;
}

async function loadPortalProducts(priceIds) {
  const grouped = new Map();

  for (const priceId of priceIds) {
    const price = await stripe.prices.retrieve(priceId);
    if (!price.product || typeof price.product !== "string") {
      throw new Error(`[stripe-branding] Could not resolve product for price ${priceId}`);
    }

    const prices = grouped.get(price.product) ?? new Set();
    prices.add(price.id);
    grouped.set(price.product, prices);
  }

  return Array.from(grouped.entries()).map(([product, prices]) => ({
    product,
    prices: Array.from(prices),
  }));
}

async function main() {
  let accountId = "acct_1THAYHIJYk5vKnWz";
  let iconFileId = null;
  let logoFileId = null;
  let accountBrandingApplied = false;

  try {
    console.log("[stripe-branding] Uploading Positives assets...");
    [iconFileId, logoFileId] = await Promise.all([
      uploadBusinessAsset("business_icon", ICON_PATH),
      uploadBusinessAsset("business_logo", LOGO_PATH),
    ]);

    console.log("[stripe-branding] Updating Stripe account branding...");
    const account = await stripe.accounts.update(accountId, {
      business_profile: {
        name: "Positives",
        support_email: "support@positives.life",
        support_url: `${APP_URL}/support`,
        url: APP_URL,
      },
      settings: {
        branding: {
          icon: iconFileId,
          logo: logoFileId,
          primary_color: "#2EC4B6",
          secondary_color: "#44A8D8",
        },
      },
    });

    accountId = account.id;
    accountBrandingApplied = true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(
      "[stripe-branding] Account-level branding could not be applied via API. " +
        "Portal behavior and portal business profile will still be configured.\n" +
        `Reason: ${message}`
    );
  }

  const configurations = await stripe.billingPortal.configurations.list({ limit: 20 });
  const portalConfig =
    configurations.data.find((config) => config.is_default) ?? configurations.data[0];

  if (!portalConfig) {
    throw new Error("[stripe-branding] No Stripe billing portal configuration found.");
  }

  const products = await loadPortalProducts(PRICE_IDS);

  console.log(`[stripe-branding] Updating portal configuration ${portalConfig.id}...`);
  const updatedConfig = await stripe.billingPortal.configurations.update(portalConfig.id, {
    name: "Positives member billing",
    default_return_url: `${APP_URL}/account`,
    business_profile: {
      headline: "Manage your Positives membership in one calm place.",
      privacy_policy_url: `${APP_URL}/privacy`,
      terms_of_service_url: `${APP_URL}/terms`,
    },
    features: {
      customer_update: {
        enabled: true,
        allowed_updates: ["name", "email", "address", "phone"],
      },
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      subscription_cancel: {
        enabled: true,
        mode: "at_period_end",
        cancellation_reason: {
          enabled: true,
          options: [
            "too_expensive",
            "missing_features",
            "unused",
            "switched_service",
            "other",
          ],
        },
      },
      subscription_update: {
        enabled: true,
        default_allowed_updates: ["price"],
        billing_cycle_anchor: "unchanged",
        proration_behavior: "create_prorations",
        schedule_at_period_end: {
          conditions: [
            { type: "decreasing_item_amount" },
            { type: "shortening_interval" },
          ],
        },
        trial_update_behavior: "continue_trial",
        products,
      },
    },
  });

  console.log(
    JSON.stringify(
      {
        accountId,
        accountBrandingApplied,
        iconFileId,
        logoFileId,
        portalConfigurationId: updatedConfig.id,
        portalSubscriptionUpdateEnabled:
          updatedConfig.features.subscription_update.enabled,
        portalProducts: updatedConfig.features.subscription_update.products,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error("[stripe-branding] Failed:", error);
  process.exit(1);
});
