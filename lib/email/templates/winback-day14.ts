/**
 * lib/email/templates/winback-day14.ts
 *
 * Win-back — Day 14 after cancellation.
 * Tone: value-focused reminder. Remind them what they had access to.
 * Still no pressure. Curiosity, not urgency.
 */

import { B, emailWrapper, emailHeader, memberEmailFooter, ctaButton } from "../brand";

export type WinbackDay14Data = {
  firstName: string;
  rejoindUrl: string;
  unsubscribeUrl?: string;
};

export function winbackDay14EmailHtml({ firstName, rejoindUrl, unsubscribeUrl }: WinbackDay14Data): string {
  const body = `
    ${emailHeader()}

    <tr>
      <td style="background:${B.card};padding:36px 40px 32px;">
        <h1 style="margin:0 0 16px;font-family:${B.fontHeading};font-size:24px;font-weight:700;color:${B.foreground};line-height:1.25;letter-spacing:-0.02em;">
          Two weeks. Still thinking of you.
        </h1>
        <p style="margin:0 0 16px;font-family:${B.fontBody};font-size:15px;color:${B.mutedFg};line-height:1.65;">
          Hey ${firstName} — it's been two weeks since your membership ended. We just wanted to check in.
        </p>
        <p style="margin:0 0 24px;font-family:${B.fontBody};font-size:15px;color:${B.mutedFg};line-height:1.65;">
          If things have settled and you're ready to come back to a daily practice, we'd love to have you.
        </p>

        <!-- Value reminder card -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:28px;">
          <tr>
            <td style="background:${B.muted};border-radius:${B.radiusSm};padding:20px 24px;">
              <p style="margin:0 0 12px;font-family:${B.fontHeading};font-size:13px;font-weight:700;color:${B.foreground};text-transform:uppercase;letter-spacing:0.08em;">What you had access to</p>
              <p style="margin:0 0 8px;font-family:${B.fontBody};font-size:14px;color:${B.mutedFg};line-height:1.6;">
                🎧 &nbsp;Daily audio practices from Dr. Paul
              </p>
              <p style="margin:0 0 8px;font-family:${B.fontBody};font-size:14px;color:${B.mutedFg};line-height:1.6;">
                📅 &nbsp;Weekly principles and guided practices
              </p>
              <p style="margin:0 0 8px;font-family:${B.fontBody};font-size:14px;color:${B.mutedFg};line-height:1.6;">
                🌙 &nbsp;Monthly themes to anchor your growth
              </p>
              <p style="margin:0;font-family:${B.fontBody};font-size:14px;color:${B.mutedFg};line-height:1.6;">
                📚 &nbsp;The full Positives content library
              </p>
            </td>
          </tr>
        </table>

        ${ctaButton("Come back to Positives", rejoindUrl)}
      </td>
    </tr>

    ${memberEmailFooter("https://positives.life/account", unsubscribeUrl)}`;

  return emailWrapper(body);
}

export function winbackDay14EmailText({ firstName, rejoindUrl }: WinbackDay14Data): string {
  return `Hey ${firstName},

It's been two weeks since your Positives membership ended. We just wanted to check in.

If you're ready to come back to a daily practice, we'd love to have you:
${rejoindUrl}

What you had access to:
- Daily audio practices from Dr. Paul
- Weekly principles and guided practices
- Monthly themes to anchor your growth
- The full Positives content library

— The Positives Team
positives.life`;
}
