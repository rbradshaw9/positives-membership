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
  },
} as const;
