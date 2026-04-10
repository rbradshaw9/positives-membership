/**
 * lib/email/templates/winback-day30.ts
 *
 * Win-back — Day 30 after cancellation.
 * Tone: final gentle reach-out. Acknowledge time passed, offer something real.
 * This is the last automated email in the sequence.
 */

import { B, emailWrapper, emailHeader, memberEmailFooter, ctaButton } from "../brand";

export type WinbackDay30Data = {
  firstName: string;
  rejoindUrl: string;
  unsubscribeUrl?: string;
};

export function winbackDay30EmailHtml({ firstName, rejoindUrl, unsubscribeUrl }: WinbackDay30Data): string {
  const body = `
    ${emailHeader()}

    <tr>
      <td style="background:${B.card};padding:36px 40px 32px;">
        <h1 style="margin:0 0 16px;font-family:${B.fontHeading};font-size:24px;font-weight:700;color:${B.foreground};line-height:1.25;letter-spacing:-0.02em;">
          One last note, ${firstName}.
        </h1>
        <p style="margin:0 0 16px;font-family:${B.fontBody};font-size:15px;color:${B.mutedFg};line-height:1.65;">
          It's been a month since you left. We won't keep reaching out after this — we respect your space.
        </p>
        <p style="margin:0 0 16px;font-family:${B.fontBody};font-size:15px;color:${B.mutedFg};line-height:1.65;">
          But if there's even a small part of you that's been thinking about coming back to a daily practice, this is a good moment.
        </p>
        <p style="margin:0 0 28px;font-family:${B.fontBody};font-size:15px;color:${B.mutedFg};line-height:1.65;">
          A small, consistent daily habit creates meaningful change over time. We're still here when you're ready.
        </p>

        ${ctaButton("Rejoin Positives", rejoindUrl)}
      </td>
    </tr>

    <!-- Final note -->
    <tr>
      <td style="background:${B.card};padding:0 40px 36px;">
        <p style="margin:0;font-family:${B.fontBody};font-size:14px;color:${B.mutedFg};line-height:1.7;border-top:1px solid ${B.border};padding-top:24px;">
          This is the last automated email you'll receive from us. If you ever want to return, just visit positives.life — the door is always open.
        </p>
      </td>
    </tr>

    ${memberEmailFooter("https://positives.life/account", unsubscribeUrl)}`;

  return emailWrapper(body);
}

export function winbackDay30EmailText({ firstName, rejoindUrl }: WinbackDay30Data): string {
  return `Hey ${firstName},

It's been a month since you left Positives. We won't keep reaching out after this — we respect your space.

But if you've been thinking about coming back to a daily practice, we're still here:
${rejoindUrl}

This is the last automated email you'll receive. If you ever want to return, just visit positives.life.

— The Positives Team
positives.life`;
}
