import { createHmac, timingSafeEqual } from "crypto";

const TOKEN_EXPIRY_DAYS = 30;

type UnsubscribeTokenPayload = {
  email: string;
  exp: number;
};

function getSecret(): string {
  const secret = process.env.EMAIL_UNSUBSCRIBE_SECRET;
  if (!secret) {
    throw new Error(
      "[unsubscribe-token] EMAIL_UNSUBSCRIBE_SECRET is not set. " +
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

export function generateUnsubscribeToken(email: string): string {
  const payload: UnsubscribeTokenPayload = {
    email: email.trim().toLowerCase(),
    exp: Math.floor(Date.now() / 1000) + TOKEN_EXPIRY_DAYS * 24 * 60 * 60,
  };

  const payloadB64 = b64url(JSON.stringify(payload));
  const signature = sign(payloadB64, getSecret());

  return `${payloadB64}.${signature}`;
}

export function buildUnsubscribeUrl(email: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://positives.life";
  const url = new URL("/api/unsubscribe", appUrl);
  url.searchParams.set("email", email.trim().toLowerCase());
  url.searchParams.set("token", generateUnsubscribeToken(email));
  return url.toString();
}

export type VerifyUnsubscribeResult =
  | { ok: true; email: string }
  | { ok: false; reason: "invalid" | "expired" | "mismatch" };

export function verifyUnsubscribeToken(
  email: string,
  token: string
): VerifyUnsubscribeResult {
  try {
    const [payloadB64, signature] = token.split(".");

    if (!payloadB64 || !signature) {
      return { ok: false, reason: "invalid" };
    }

    const expected = sign(payloadB64, getSecret());
    const expectedBuf = Buffer.from(expected, "hex");
    const actualBuf = Buffer.from(signature, "hex");

    if (
      expectedBuf.length !== actualBuf.length ||
      !timingSafeEqual(expectedBuf, actualBuf)
    ) {
      return { ok: false, reason: "invalid" };
    }

    const payload: UnsubscribeTokenPayload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString()
    );

    if (Math.floor(Date.now() / 1000) > payload.exp) {
      return { ok: false, reason: "expired" };
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (payload.email !== normalizedEmail) {
      return { ok: false, reason: "mismatch" };
    }

    return { ok: true, email: normalizedEmail };
  } catch {
    return { ok: false, reason: "invalid" };
  }
}
