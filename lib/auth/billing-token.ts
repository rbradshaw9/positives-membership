/**
 * lib/auth/billing-token.ts
 *
 * Signs and verifies short-lived billing recovery tokens.
 *
 * Used to produce 1-click billing portal links for payment-failed emails
 * without requiring the member to be logged in. The token is embedded
 * directly in the email CTA URL and verified server-side on click.
 *
 * Token format (Base64URL-encoded JSON + HMAC-SHA256 signature):
 *   <payload_b64>.<signature_hex>
 *
 * Payload:
 *   { stripeCustomerId, email, exp }
 *
 * Secret: BILLING_TOKEN_SECRET env var (set in Vercel + .env.local)
 * Expiry: 7 days — covers the full past-due email sequence (Day 0/3/7)
 *
 * No external JWT library required — Node.js crypto is sufficient.
 */

import { createHmac, timingSafeEqual } from "crypto";

const TOKEN_EXPIRY_DAYS = 7;

interface BillingTokenPayload {
  stripeCustomerId: string;
  email: string;
  exp: number; // Unix timestamp (seconds)
}

function getSecret(): string {
  const secret = process.env.BILLING_TOKEN_SECRET;
  if (!secret) {
    throw new Error(
      "[billing-token] BILLING_TOKEN_SECRET env var is not set. " +
        "Add it to Vercel environment variables and .env.local."
    );
  }
  return secret;
}

function b64url(str: string): string {
  return Buffer.from(str)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * Generate a signed billing recovery token.
 * Embed the result in: /account/billing?token=<token>
 */
export function generateBillingToken(params: {
  stripeCustomerId: string;
  email: string;
}): string {
  const secret = getSecret();
  const exp =
    Math.floor(Date.now() / 1000) + TOKEN_EXPIRY_DAYS * 24 * 60 * 60;

  const payload: BillingTokenPayload = {
    stripeCustomerId: params.stripeCustomerId,
    email: params.email,
    exp,
  };

  const payloadB64 = b64url(JSON.stringify(payload));
  const signature = sign(payloadB64, secret);

  return `${payloadB64}.${signature}`;
}

export type VerifyResult =
  | { ok: true; payload: BillingTokenPayload }
  | { ok: false; reason: "expired" | "invalid" };

/**
 * Verify a billing recovery token.
 * Returns the payload on success or a typed error reason.
 */
export function verifyBillingToken(token: string): VerifyResult {
  try {
    const secret = getSecret();
    const [payloadB64, signature] = token.split(".");

    if (!payloadB64 || !signature) {
      return { ok: false, reason: "invalid" };
    }

    // Constant-time comparison to prevent timing attacks
    const expected = sign(payloadB64, secret);
    const expectedBuf = Buffer.from(expected, "hex");
    const actualBuf = Buffer.from(signature, "hex");

    if (
      expectedBuf.length !== actualBuf.length ||
      !timingSafeEqual(expectedBuf, actualBuf)
    ) {
      return { ok: false, reason: "invalid" };
    }

    const payload: BillingTokenPayload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString()
    );

    if (Math.floor(Date.now() / 1000) > payload.exp) {
      return { ok: false, reason: "expired" };
    }

    return { ok: true, payload };
  } catch {
    return { ok: false, reason: "invalid" };
  }
}
