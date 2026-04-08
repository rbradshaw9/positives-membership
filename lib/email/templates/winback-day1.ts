/**
 * lib/email/templates/winback-day1.ts
 *
 * Win-back — Day 1 after cancellation.
 * Tone: warm, gracious, zero guilt. Soft door left open.
 */

import { B, emailWrapper, emailHeader, emailFooter, ctaButton } from "../brand";

export type WinbackDay1Data = {
  firstName: string;
  rejoindUrl: string; // URL to re-subscribe (join page)
};

export function winbackDay1EmailHtml({ firstName, rejoindUrl }: WinbackDay1Data): string {
  const body = `
    ${emailHeader()}

    <tr>
      <td style="background:${B.card};padding:36px 40px 32px;">
        <h1 style="margin:0 0 16px;font-family:${B.fontHeading};font-size:24px;font-weight:700;color:${B.foreground};line-height:1.25;letter-spacing:-0.02em;">
          We'll miss you, ${firstName}.
        </h1>
        <p style="margin:0 0 16px;font-family:${B.fontBody};font-size:15px;color:${B.mutedFg};line-height:1.65;">
          Your Positives membership has been canceled. We're grateful for the time you spent practicing with us.
        </p>
        <p style="margin:0 0 28px;font-family:${B.fontBody};font-size:15px;color:${B.mutedFg};line-height:1.65;">
          If you ever want to come back — even just for a week — the door is always open. No pressure, no catch.
        </p>

        ${ctaButton("Return to Positives", rejoindUrl)}
      </td>
    </tr>

    <!-- Soft note -->
    <tr>
      <td style="background:${B.card};padding:0 40px 36px;">
        <p style="margin:0;font-family:${B.fontBody};font-size:14px;color:${B.mutedFg};line-height:1.7;border-top:1px solid ${B.border};padding-top:24px;">
          If you'd like to share why you left, just reply to this email. We read every response and take it seriously.
        </p>
      </td>
    </tr>

    ${emailFooter()}`;

  return emailWrapper(body);
}

export function winbackDay1EmailText({ firstName, rejoindUrl }: WinbackDay1Data): string {
  return `Hey ${firstName},

Your Positives membership has been canceled. We're grateful for the time you spent with us.

If you ever want to come back, the door is always open:
${rejoindUrl}

If you'd like to share why you left, just reply to this email. We read every response.

— The Positives Team
positives.life`;
}
