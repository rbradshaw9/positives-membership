/**
 * lib/email/templates/receipt.ts
 *
 * Payment receipt email — one-off and subscription payments.
 * Triggered by: Stripe invoice.payment_succeeded → our webhook → Resend.
 */

import { B, emailWrapper, emailHeader, memberEmailFooter, ctaButton } from "../brand";

export type ReceiptEmailData = {
  firstName: string;
  invoiceNumber: string;
  amountPaid: string;        // pre-formatted, e.g. "$37.00"
  billingDate: string;       // pre-formatted, e.g. "April 7, 2026"
  description: string;       // e.g. "Positives — Level 1 Membership (Monthly)"
  nextBillingDate?: string;  // optional — omit for one-time payments
  invoiceUrl?: string;       // Stripe-hosted invoice PDF URL
  accountUrl?: string;
  unsubscribeUrl?: string;
};

export function receiptEmailHtml({
  firstName,
  invoiceNumber,
  amountPaid,
  billingDate,
  description,
  nextBillingDate,
  invoiceUrl,
  accountUrl = "https://positives.life/account",
  unsubscribeUrl,
}: ReceiptEmailData): string {
  const body = `
    ${emailHeader()}

    <!-- Body -->
    <tr>
      <td style="background:${B.card};padding:40px 40px 32px;">
        <p style="margin:0 0 8px;font-family:${B.fontBody};font-size:11px;font-weight:700;color:${B.primary};letter-spacing:0.12em;text-transform:uppercase;">Payment confirmed</p>
        <h1 style="margin:0 0 12px;font-family:${B.fontHeading};font-size:26px;font-weight:700;color:${B.foreground};line-height:1.2;letter-spacing:-0.02em;">
          Receipt for ${firstName}
        </h1>
        <p style="margin:0 0 28px;font-family:${B.fontBody};font-size:15px;color:${B.mutedFg};line-height:1.5;">
          Thanks — your payment went through. Here's your receipt.
        </p>

        <!-- Receipt box -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
          style="background:${B.muted};border-radius:${B.radius};border:1px solid ${B.border};margin-bottom:28px;">
          <tr>
            <td style="padding:24px 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                ${[
                  ["Date", billingDate],
                  ["Invoice", `#${invoiceNumber}`],
                  ["Description", description],
                ].map(([label, value], i, arr) => `
                <tr>
                  <td style="padding:8px 0;${i < arr.length - 1 ? `border-bottom:1px solid ${B.border};` : ""}vertical-align:top;">
                    <p style="margin:0;font-family:${B.fontBody};font-size:12px;color:${B.mutedFg};text-transform:uppercase;letter-spacing:0.09em;font-weight:600;">${label}</p>
                    <p style="margin:3px 0 0;font-family:${B.fontBody};font-size:14px;color:${B.foreground};line-height:1.4;">${value}</p>
                  </td>
                </tr>`).join("")}
              </table>
            </td>
          </tr>
          <!-- Amount row -->
          <tr>
            <td style="background:${B.gradient};border-radius:0 0 ${B.radius} ${B.radius};padding:18px 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <p style="margin:0;font-family:${B.fontBody};font-size:13px;color:rgba(255,255,255,0.8);font-weight:600;letter-spacing:0.06em;text-transform:uppercase;">Amount paid</p>
                  </td>
                  <td align="right">
                    <p style="margin:0;font-family:${B.fontHeading};font-size:24px;font-weight:700;color:#FFFFFF;letter-spacing:-0.02em;">${amountPaid}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        ${nextBillingDate ? `
        <p style="margin:0 0 28px;font-family:${B.fontBody};font-size:14px;color:${B.mutedFg};line-height:1.5;">
          Your next billing date is <strong style="color:${B.foreground};">${nextBillingDate}</strong>. You can manage or cancel your subscription any time from your account.
        </p>` : ""}

        ${ctaButton("Open Positives →", "https://positives.life/today")}
        ${invoiceUrl ? `
        <p style="margin:20px 0 0;">
          <a href="${invoiceUrl}" style="font-family:${B.fontBody};font-size:13px;color:${B.primary};text-decoration:none;">Download invoice PDF ↗</a>
        </p>` : ""}
      </td>
    </tr>

    ${memberEmailFooter(accountUrl, unsubscribeUrl)}`;

  return emailWrapper(body);
}

export function receiptEmailText({
  firstName,
  invoiceNumber,
  amountPaid,
  billingDate,
  description,
  nextBillingDate,
  invoiceUrl,
}: ReceiptEmailData): string {
  return `Payment confirmed — receipt for ${firstName}

Date: ${billingDate}
Invoice: #${invoiceNumber}
Description: ${description}
Amount paid: ${amountPaid}
${nextBillingDate ? `\nNext billing date: ${nextBillingDate}` : ""}

Open Positives: https://positives.life/today
${invoiceUrl ? `\nDownload invoice: ${invoiceUrl}` : ""}

Questions? Just reply to this email.

— The Positives Team
positives.life`;
}
