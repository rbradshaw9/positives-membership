#!/usr/bin/env node
// scripts/configure-stripe-hosted-billing.mjs
//
// Configures Stripe-hosted billing surfaces for Positives:
// - prints dashboard fallback instructions for account branding
// - enables Customer Portal subscription updates for L1/L2/L3
// - sets portal headline + policy links
//
// Safe to re-run in sandbox/test mode. Live mode requires either:
//   ALLOW_STRIPE_LIVE_SETUP=true npm run ...
// or:
//   node scripts/configure-stripe-hosted-billing.mjs --live

import Stripe from "stripe";
import { readFileSync } from "fs";
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
    console.warn(`[stripe-branding] Could not read ${path} — falling back to process.env`);
  }
}

loadEnv(ENV_PATH);

const APP_URL = process.env.NEXT_PUBLIC_APP_URL;
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const LIVE_SETUP_ALLOWED =
  process.env.ALLOW_STRIPE_LIVE_SETUP === "true" ||
  process.argv.includes("--live");

if (!APP_URL || !STRIPE_SECRET_KEY || !PUBLISHABLE_KEY || !STRIPE_WEBHOOK_SECRET) {
  console.error(
    "[stripe-branding] Missing one or more required Stripe env vars: " +
      "NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, " +
      "STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET."
  );
  process.exit(1);
}

try {
  const parsed = new URL(APP_URL);
  if (!["https:", "http:"].includes(parsed.protocol)) {
    throw new Error("invalid protocol");
  }
} catch {
  console.error(
    `[stripe-branding] NEXT_PUBLIC_APP_URL must be an absolute URL. Current value: "${APP_URL}".`
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
  console.error("[stripe-branding] Stripe keys must be sk_test/sk_live and pk_test/pk_live.");
  process.exit(1);
}

if (keyMode !== publishableKeyMode) {
  console.error(
    `[stripe-branding] Secret key mode (${keyMode}) does not match publishable key mode (${publishableKeyMode}).`
  );
  process.exit(1);
}

if (keyMode === "live" && !LIVE_SETUP_ALLOWED) {
  console.error(
    "[stripe-branding] Refusing to configure live Stripe without an explicit live-mode gate.\n" +
      "After business verification, re-run with ALLOW_STRIPE_LIVE_SETUP=true or --live."
  );
  process.exit(1);
}

const PRICE_ENV_KEYS = [
  "STRIPE_PRICE_LEVEL_1_MONTHLY",
  "STRIPE_PRICE_LEVEL_1_ANNUAL",
  "STRIPE_PRICE_LEVEL_2_MONTHLY",
  "STRIPE_PRICE_LEVEL_2_ANNUAL",
  "STRIPE_PRICE_LEVEL_3_MONTHLY",
  "STRIPE_PRICE_LEVEL_3_ANNUAL",
];

const missingPriceKeys = PRICE_ENV_KEYS.filter((key) => !process.env[key]);

if (missingPriceKeys.length > 0) {
  console.error(
    "[stripe-branding] Missing required L1/L2/L3 Stripe price IDs:\n" +
      missingPriceKeys.map((key) => `- ${key}`).join("\n")
  );
  process.exit(1);
}

const PRICE_IDS = PRICE_ENV_KEYS.map((key) => process.env[key]);

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

function buildPortalConfiguration(products) {
  return {
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
  };
}

async function main() {
  const account = await stripe.accounts.retrieve();
  const accountId = account.id;
  const accountBrandingApplied = false;
  const accountBrandingFallback =
    "Stripe does not allow account-level branding updates on your own account " +
    "through this Accounts API method. Set Dashboard > Settings > Public details / " +
    "Branding manually with Positives name, support@positives.life, teal primary " +
    "color, blue secondary color, and the logo/icon assets listed in this output.";
  const products = await loadPortalProducts(PRICE_IDS);

  console.log(
    JSON.stringify(
      {
        action: "configure_stripe_hosted_billing",
        keyMode,
        accountId,
        appUrl: APP_URL,
        customDomain: "disabled",
        cardBrands: "all accepted",
        portalProrationBehavior: "create_prorations",
        portalDowngradeHandling: "schedule_at_period_end",
        portalProductsRequested: products,
      },
      null,
      2
    )
  );

  console.warn(`[stripe-branding] ${accountBrandingFallback}`);

  const configurations = await stripe.billingPortal.configurations.list({ limit: 20 });
  const portalConfig =
    configurations.data.find((config) => config.is_default) ?? configurations.data[0];
  const portalConfigurationParams = buildPortalConfiguration(products);
  let updatedConfig;

  if (portalConfig) {
    console.log(`[stripe-branding] Updating portal configuration ${portalConfig.id}...`);
    updatedConfig = await stripe.billingPortal.configurations.update(
      portalConfig.id,
      portalConfigurationParams
    );
  } else {
    console.log("[stripe-branding] Creating Positives portal configuration...");
    updatedConfig = await stripe.billingPortal.configurations.create(
      portalConfigurationParams
    );
  }

  console.log(
    JSON.stringify(
      {
        keyMode,
        accountId,
        accountBrandingApplied,
        accountBrandingFallback,
        dashboardBranding: {
          businessName: "Positives",
          supportEmail: "support@positives.life",
          supportUrl: `${APP_URL}/support`,
          website: APP_URL,
          primaryColor: "#2EC4B6",
          secondaryColor: "#44A8D8",
          iconPath: ICON_PATH,
          logoPath: LOGO_PATH,
        },
        portalConfigurationId: updatedConfig.id,
        portalDefaultReturnUrl: updatedConfig.default_return_url,
        portalHeadline: updatedConfig.business_profile.headline,
        portalSubscriptionUpdateEnabled:
          updatedConfig.features.subscription_update.enabled,
        portalProrationBehavior:
          updatedConfig.features.subscription_update.proration_behavior,
        portalDowngradeHandling:
          updatedConfig.features.subscription_update.schedule_at_period_end,
        portalProductsRequested: products,
        liveModeNextStep:
          keyMode === "test"
            ? "After business verification, copy/recreate products and prices in live mode, update live env vars, then re-run with ALLOW_STRIPE_LIVE_SETUP=true."
            : "Live hosted billing configuration applied. Verify with a real portal/checkout smoke test before launch.",
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
