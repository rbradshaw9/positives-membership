/**
 * lib/email/templates/onboarding-day14.ts
 *
 * Onboarding drip — Day 14
 * Two weeks in. Celebrates a real milestone, plants the identity ("you're
 * someone who does this"), and gently introduces what's next without pressure.
 */

import { B, emailWrapper, emailHeader, emailFooter, ctaButton, divider } from "../brand";

export type Day14EmailData = {
  firstName: string;
  dashboardUrl: string;
};

export function day14EmailHtml({ firstName, dashboardUrl }: Day14EmailData): string {
  const body = `
    ${emailHeader()}

    <!-- Body -->
    <tr>
      <td style="background:${B.card};padding:40px 40px 32px;">
        <p style="margin:0 0 8px;font-family:${B.fontBody};font-size:11px;font-weight:700;color:${B.primary};letter-spacing:0.12em;text-transform:uppercase;">Two weeks</p>
        <h1 style="margin:0 0 20px;font-family:${B.fontHeading};font-size:26px;font-weight:700;color:${B.foreground};line-height:1.2;letter-spacing:-0.02em;">
          Two weeks. That's a real habit, ${firstName}.
        </h1>
        <p style="margin:0 0 16px;font-family:${B.fontBody};font-size:15px;color:${B.mutedFg};line-height:1.65;">
          Two weeks ago, you made a decision — to invest in your own mental and emotional health. That's not something everyone does. And the fact that you're still here says something about who you are.
        </p>
        <p style="margin:0 0 16px;font-family:${B.fontBody};font-size:15px;color:${B.mutedFg};line-height:1.65;">
          You're not completing Positives. You're practicing it. And the return — day after day — is how it works.
        </p>
        <p style="margin:0 0 32px;font-family:${B.fontBody};font-size:15px;color:${B.mutedFg};line-height:1.65;">
          Today's practice is waiting.
        </p>
        ${ctaButton("Continue Your Practice →", dashboardUrl)}
      </td>
    </tr>

    ${divider()}

    <!-- What's ahead box -->
    <tr>
      <td style="background:${B.card};padding:28px 40px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="background:${B.gradient};border-radius:${B.radiusSm};padding:24px;">
              <p style="margin:0 0 8px;font-family:${B.fontHeading};font-size:14px;font-weight:700;color:#FFFFFF;">What's coming</p>
              <p style="margin:0;font-family:${B.fontBody};font-size:13px;color:rgba(255,255,255,0.85);line-height:1.65;">
                New content is added regularly — weekly principles, monthly themes, and deeper library content. Every month brings a new focus to explore. You'll never run out of practice.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    ${divider()}

    <!-- Closing -->
    <tr>
      <td style="background:${B.card};padding:28px 40px 40px;">
        <p style="margin:0 0 12px;font-family:${B.fontBody};font-size:15px;color:${B.mutedFg};line-height:1.65;">
          As always — if there's anything you need, just reply here. We read every email.
        </p>
        <p style="margin:0;font-family:${B.fontBody};font-size:15px;color:${B.mutedFg};line-height:1.65;">
          We're glad you're here.
        </p>
      </td>
    </tr>

    ${emailFooter()}`;

  return emailWrapper(body);
}

export function day14EmailText({ firstName, dashboardUrl }: Day14EmailData): string {
  return `Two weeks. That's a real habit, ${firstName}.

Two weeks ago you made a decision — to invest in your own mental and emotional health. That's not something everyone does.

You're not completing Positives. You're practicing it. And the return — day after day — is how it works.

Today's practice is waiting:
${dashboardUrl}

What's coming: new content is added regularly — weekly principles, monthly themes, and deeper library content. Every month brings a new focus to explore.

If there's anything you need, reply to this email. We read every one.

We're glad you're here.

— The Positives Team
positives.life`;
}
