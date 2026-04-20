/**
 * lib/config.ts
 * Central config validation. All values are lazy — only resolved when called,
 * so `next build` works without real env vars set.
 */

function required(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `[Positives] Missing required environment variable: ${key}\n` +
        `Copy .env.example to .env.local and fill in the value.`
    );
  }
  return value;
}

function optional(key: string, fallback = ""): string {
  return process.env[key] ?? fallback;
}

function flag(key: string, fallback = "false"): boolean {
  return optional(key, fallback).replaceAll("\\n", "\n").trim().toLowerCase() === "true";
}

export const config = {
  app: {
    get url() { return optional("NEXT_PUBLIC_APP_URL", "http://localhost:3000"); },
    get nodeEnv() { return optional("NODE_ENV", "development"); },
    get communityPreviewEnabled() {
      return flag("ENABLE_COMMUNITY_PREVIEW");
    },
    get betaFeedbackEnabled() {
      return flag("ENABLE_BETA_FEEDBACK");
    },
    get betaWelcomeEnabled() {
      return flag("ENABLE_BETA_WELCOME");
    },
    get adminEmails() {
      return optional("ADMIN_EMAILS")
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);
    },
  },

  launch: {
    get alphaFreePromoCode() { return optional("NEXT_PUBLIC_ALPHA_FREE_PROMO_CODE"); },
    get betaDiscountPromoCode() { return optional("NEXT_PUBLIC_BETA_DISCOUNT_PROMO_CODE"); },
  },

  supabase: {
    /** Public — safe for browser */
    get url() { return required("NEXT_PUBLIC_SUPABASE_URL"); },
    get anonKey() { return required("NEXT_PUBLIC_SUPABASE_ANON_KEY"); },
    /** Server-only — never expose to browser */
    get serviceRoleKey() { return required("SUPABASE_SERVICE_ROLE_KEY"); },
  },

  security: {
    /**
     * Server-only secret used to hash abuse-guard keys before storing them.
     * Falls back to the Supabase service role key so the guard works without
     * extra launch setup, but can be overridden later with a dedicated secret.
     */
    get abuseGuardSecret() {
      return optional("ABUSE_GUARD_SECRET", process.env.SUPABASE_SERVICE_ROLE_KEY ?? "");
    },
  },

  stripe: {
    /** Server-only */
    get secretKey() { return required("STRIPE_SECRET_KEY"); },
    get publishableKey() { return optional("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"); },
    /** Server-only — used for webhook signature verification */
    get webhookSecret() { return required("STRIPE_WEBHOOK_SECRET"); },

    /**
     * Stripe Price IDs — map to Positives subscription tiers.
     * Set these in .env.local once prices are created in the Stripe dashboard.
     * Used exclusively by the webhook service layer — never in client code.
     */
    prices: {
      get level1Monthly() { return optional("STRIPE_PRICE_LEVEL_1_MONTHLY"); },
      get level2Monthly() { return optional("STRIPE_PRICE_LEVEL_2_MONTHLY"); },
      get level3Monthly() { return optional("STRIPE_PRICE_LEVEL_3_MONTHLY"); },
      /** L4 3-pay plan: $1,500/month × 3. Pay-in-full uses invoice (no price ID). */
      get level4ThreePay() { return optional("STRIPE_PRICE_LEVEL_4_THREE_PAY"); },
      get level1Annual() { return optional("STRIPE_PRICE_LEVEL_1_ANNUAL"); },
      get level2Annual() { return optional("STRIPE_PRICE_LEVEL_2_ANNUAL"); },
      get level3Annual() { return optional("STRIPE_PRICE_LEVEL_3_ANNUAL"); },
    },

    /**
     * Stripe Product IDs — used for inline price_data on custom L4 packages.
     * Never exposed to client code.
     */
    products: {
      get level4() { return optional("STRIPE_PRODUCT_LEVEL_4"); },
    },
  },

  analytics: {
    get measurementId() { return optional("NEXT_PUBLIC_GA_MEASUREMENT_ID"); },
    get measurementProtocolApiSecret() { return optional("GA_MEASUREMENT_PROTOCOL_API_SECRET"); },
  },
} as const;
