/**
 * lib/email/templates/payment-recovery-day7.ts
 *
 * Past-due recovery — Day 7 follow-up.
 * Final recovery email before Stripe cancels the subscription.
 * Tone: honest (this is the last chance), still calm, not threatening.
 */

import { B, emailWrapper, emailHeader, memberEmailFooter, ctaButton } from "../brand";

export type PaymentRecoveryDay7Data = {
  firstName: string;
  amountDue: string;
  updatePaymentUrl: string;
  unsubscribeUrl?: string;
};

export function paymentRecoveryDay7EmailHtml({
  firstName,
  amountDue,
  updatePaymentUrl,
  unsubscribeUrl,
}: PaymentRecoveryDay7Data): string {
  const body = `
    ${emailHeader()}

    <!-- Red notice bar -->
    <tr>
      <td style="background:#FEF2F2;border-left:3px solid #EF4444;padding:14px 40px;">
        <p style="margin:0;font-family:${B.fontBody};font-size:13px;color:#991B1B;font-weight:600;">
          Your membership is at risk of cancellation.
        </p>
      </td>
    </tr>

    <tr>
      <td style="background:${B.card};padding:36px 40px 32px;">
        <h1 style="margin:0 0 16px;font-family:${B.fontHeading};font-size:24px;font-weight:700;color:${B.foreground};line-height:1.25;letter-spacing:-0.02em;">
          ${firstName}, we need to hear from you.
        </h1>
        <p style="margin:0 0 16px;font-family:${B.fontBody};font-size:15px;color:${B.mutedFg};line-height:1.65;">
          It's been 7 days since your Positives membership payment of <strong style="color:${B.foreground};">${amountDue}</strong> failed. We've tried to reach you and haven't heard back.
        </p>
        <p style="margin:0 0 16px;font-family:${B.fontBody};font-size:15px;color:${B.mutedFg};line-height:1.65;">
          If we're unable to process a payment soon, your membership will be automatically canceled by Stripe.
        </p>
        <p style="margin:0 0 28px;font-family:${B.fontBody};font-size:15px;color:${B.mutedFg};line-height:1.65;">
          Updating your payment method takes less than a minute.
        </p>

        ${ctaButton("Update Payment Now", updatePaymentUrl)}
      </td>
    </tr>

    <tr>
      <td style="background:${B.card};padding:0 40px 36px;">
        <p style="margin:0;font-family:${B.fontBody};font-size:14px;color:${B.mutedFg};line-height:1.7;border-top:1px solid ${B.border};padding-top:24px;">
          If you meant to cancel, you don't need to do anything. If you have questions or need help, reply to this email — we're here.
        </p>
      </td>
    </tr>

    ${memberEmailFooter("https://positives.life/account", unsubscribeUrl)}`;

  return emailWrapper(body);
}

export function paymentRecoveryDay7EmailText({
  firstName,
  amountDue,
  updatePaymentUrl,
}: PaymentRecoveryDay7Data): string {
  return `Hey ${firstName},

It's been 7 days since your Positives payment of ${amountDue} failed. If we can't process a payment soon, your membership will be automatically canceled.

To keep your access, please update your payment method now:
${updatePaymentUrl}

If you meant to cancel, you don't need to do anything.
If you need help, just reply to this email.

— The Positives Team
positives.life`;
}
