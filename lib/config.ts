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

export const config = {
  app: {
    get url() { return optional("NEXT_PUBLIC_APP_URL", "http://localhost:3000"); },
    get nodeEnv() { return optional("NODE_ENV", "development"); },
    get communityPreviewEnabled() {
      return optional("ENABLE_COMMUNITY_PREVIEW", "false") === "true";
    },
    get adminEmails() {
      return optional("ADMIN_EMAILS")
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean);
    },
  },

  supabase: {
    /** Public — safe for browser */
    get url() { return required("NEXT_PUBLIC_SUPABASE_URL"); },
    get anonKey() { return required("NEXT_PUBLIC_SUPABASE_ANON_KEY"); },
    /** Server-only — never expose to browser */
    get serviceRoleKey() { return required("SUPABASE_SERVICE_ROLE_KEY"); },
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
      get level4Monthly() { return optional("STRIPE_PRICE_LEVEL_4_MONTHLY"); },
      get level1Annual() { return optional("STRIPE_PRICE_LEVEL_1_ANNUAL"); },
      get level2Annual() { return optional("STRIPE_PRICE_LEVEL_2_ANNUAL"); },
      get level3Annual() { return optional("STRIPE_PRICE_LEVEL_3_ANNUAL"); },
      get level4Annual() { return optional("STRIPE_PRICE_LEVEL_4_ANNUAL"); },
    },
  },
} as const;
