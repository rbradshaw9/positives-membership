/**
 * lib/email/templates/payment-failed.ts
 *
 * Payment failed email — sent when a subscription renewal charge fails.
 * Triggered by: Stripe invoice.payment_failed → our webhook → Resend.
 *
 * Tone: calm and supportive, not alarming. Give them a clear path to fix it.
 */

import { B, emailWrapper, emailHeader, emailFooter, ctaButton } from "../brand";

export type PaymentFailedEmailData = {
  firstName: string;
  amountDue: string;         // pre-formatted, e.g. "$37.00"
  failureReason?: string;    // from Stripe charge.failure_message — optional
  updatePaymentUrl: string;  // Stripe customer portal URL or /account
  nextRetryDate?: string;    // optional — Stripe auto-retry date if known
};

export function paymentFailedEmailHtml({
  firstName,
  amountDue,
  failureReason,
  updatePaymentUrl,
  nextRetryDate,
}: PaymentFailedEmailData): string {
  const body = `
    ${emailHeader()}

    <!-- Amber notice bar -->
    <tr>
      <td style="background:#FFFBEB;border-left:3px solid #F59E0B;padding:14px 40px;">
        <p style="margin:0;font-family:${B.fontBody};font-size:13px;color:#92400E;font-weight:600;">
          Action needed — your payment didn't go through.
        </p>
      </td>
    </tr>

    <!-- Body -->
    <tr>
      <td style="background:${B.card};padding:36px 40px 32px;">
        <h1 style="margin:0 0 16px;font-family:${B.fontHeading};font-size:24px;font-weight:700;color:${B.foreground};line-height:1.25;letter-spacing:-0.02em;">
          Hey ${firstName}, we couldn't process your payment.
        </h1>
        <p style="margin:0 0 16px;font-family:${B.fontBody};font-size:15px;color:${B.mutedFg};line-height:1.65;">
          Your Positives membership payment of <strong style="color:${B.foreground};">${amountDue}</strong> was declined.${failureReason ? ` Reason: ${failureReason}.` : ""}
        </p>
        <p style="margin:0 0 28px;font-family:${B.fontBody};font-size:15px;color:${B.mutedFg};line-height:1.65;">
          To keep your access active, please update your payment method. It only takes a minute.
        </p>

        ${ctaButton("Update Payment Method", updatePaymentUrl)}

        ${nextRetryDate ? `
        <p style="margin:24px 0 0;font-family:${B.fontBody};font-size:13px;color:${B.mutedFg};line-height:1.5;background:${B.muted};border-radius:${B.radiusSm};padding:14px 16px;">
          We'll automatically retry the payment on <strong style="color:${B.foreground};">${nextRetryDate}</strong>. Updating your card before then keeps everything uninterrupted.
        </p>` : ""}
      </td>
    </tr>

    <!-- Reassurance -->
    <tr>
      <td style="background:${B.card};padding:0 40px 36px;">
        <p style="margin:0;font-family:${B.fontBody};font-size:14px;color:${B.mutedFg};line-height:1.7;border-top:1px solid ${B.border};padding-top:24px;">
          If you have any questions or need help, just reply to this email. We'll take care of it.
        </p>
      </td>
    </tr>

    ${emailFooter()}`;

  return emailWrapper(body);
}

export function paymentFailedEmailText({
  firstName,
  amountDue,
  failureReason,
  updatePaymentUrl,
  nextRetryDate,
}: PaymentFailedEmailData): string {
  return `Hey ${firstName},

We weren't able to process your Positives membership payment of ${amountDue}.${failureReason ? `\nReason: ${failureReason}.` : ""}

To keep your access active, please update your payment method:
${updatePaymentUrl}
${nextRetryDate ? `\nWe'll automatically retry on ${nextRetryDate}. Updating before then keeps everything uninterrupted.` : ""}

Questions? Just reply to this email.

— The Positives Team
positives.life`;
}
