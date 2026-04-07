/**
 * lib/email/resend.ts
 *
 * Resend client singleton. Import this wherever you need to send email.
 *
 * Usage:
 *   import { resend, FROM_ADDRESS, REPLY_TO } from "@/lib/email/resend";
 *   await resend.emails.send({ from: FROM_ADDRESS, to, subject, html });
 */

import { Resend } from "resend";

if (!process.env.RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY is not set. Add it to .env.local and Vercel.");
}

export const resend = new Resend(process.env.RESEND_API_KEY);

/** Verified sending domain — all transactional email sends from this address. */
export const FROM_ADDRESS = "Positives <hello@positives.life>";

/** Reply-to for member replies — routes to support inbox, not the sending domain. */
export const REPLY_TO = "support@positives.life";
