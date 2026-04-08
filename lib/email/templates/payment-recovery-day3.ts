/**
 * lib/email/templates/payment-recovery-day3.ts
 *
 * Past-due recovery — Day 3 follow-up.
 * The immediate payment-failed email (day 1) fires from handle-subscription.ts.
 * This is the gentle follow-up — still supportive, clear CTA, no shame.
 */

import { B, emailWrapper, emailHeader, emailFooter, ctaButton } from "../brand";

export type PaymentRecoveryDay3Data = {
  firstName: string;
  amountDue: string;         // pre-formatted, e.g. "$37.00"
  updatePaymentUrl: string;  // Signed billing portal URL (1-click, no login)
  nextRetryDate?: string;
};

export function paymentRecoveryDay3EmailHtml({
  firstName,
  amountDue,
  updatePaymentUrl,
  nextRetryDate,
}: PaymentRecoveryDay3Data): string {
  const body = `
    ${emailHeader()}

    <!-- Amber notice bar -->
    <tr>
      <td style="background:#FFFBEB;border-left:3px solid #F59E0B;padding:14px 40px;">
        <p style="margin:0;font-family:${B.fontBody};font-size:13px;color:#92400E;font-weight:600;">
          Your payment still needs attention.
        </p>
      </td>
    </tr>

    <tr>
      <td style="background:${B.card};padding:36px 40px 32px;">
        <h1 style="margin:0 0 16px;font-family:${B.fontHeading};font-size:24px;font-weight:700;color:${B.foreground};line-height:1.25;letter-spacing:-0.02em;">
          Hey ${firstName}, a quick follow-up.
        </h1>
        <p style="margin:0 0 16px;font-family:${B.fontBody};font-size:15px;color:${B.mutedFg};line-height:1.65;">
          We weren't able to process your Positives membership payment of <strong style="color:${B.foreground};">${amountDue}</strong> a few days ago, and it still hasn't gone through.
        </p>
        <p style="margin:0 0 28px;font-family:${B.fontBody};font-size:15px;color:${B.mutedFg};line-height:1.65;">
          Updating your payment method only takes a minute — and it will keep your practice uninterrupted.
        </p>

        ${ctaButton("Update Payment Method", updatePaymentUrl)}

        ${nextRetryDate ? `
        <p style="margin:24px 0 0;font-family:${B.fontBody};font-size:13px;color:${B.mutedFg};line-height:1.5;background:${B.muted};border-radius:${B.radiusSm};padding:14px 16px;">
          We'll automatically retry your card on <strong style="color:${B.foreground};">${nextRetryDate}</strong>. Updating before then avoids any interruption.
        </p>` : ""}
      </td>
    </tr>

    <tr>
      <td style="background:${B.card};padding:0 40px 36px;">
        <p style="margin:0;font-family:${B.fontBody};font-size:14px;color:${B.mutedFg};line-height:1.7;border-top:1px solid ${B.border};padding-top:24px;">
          Need help? Just reply to this email — a real person will respond.
        </p>
      </td>
    </tr>

    ${emailFooter()}`;

  return emailWrapper(body);
}

export function paymentRecoveryDay3EmailText({
  firstName,
  amountDue,
  updatePaymentUrl,
  nextRetryDate,
}: PaymentRecoveryDay3Data): string {
  return `Hey ${firstName},

A quick follow-up — your Positives membership payment of ${amountDue} from a few days ago still hasn't gone through.

To keep your access active, please update your payment method:
${updatePaymentUrl}
${nextRetryDate ? `\nWe'll retry automatically on ${nextRetryDate}.` : ""}

Need help? Just reply to this email.

— The Positives Team
positives.life`;
}
