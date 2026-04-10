/**
 * lib/email/templates/onboarding-day7.ts
 *
 * Onboarding drip — Day 7
 * One full week in. Reinforces the identity shift ("I'm someone who does this"),
 * surfaces the weekly principle, and introduces the library.
 */

import { B, emailWrapper, emailHeader, memberEmailFooter, ctaButton, divider } from "../brand";

export type Day7EmailData = {
  firstName: string;
  dashboardUrl: string;
  unsubscribeUrl?: string;
};

export function day7EmailHtml({ firstName, dashboardUrl, unsubscribeUrl }: Day7EmailData): string {
  const body = `
    ${emailHeader()}

    <!-- Body -->
    <tr>
      <td style="background:${B.card};padding:40px 40px 32px;">
        <p style="margin:0 0 8px;font-family:${B.fontBody};font-size:11px;font-weight:700;color:${B.primary};letter-spacing:0.12em;text-transform:uppercase;">One week</p>
        <h1 style="margin:0 0 20px;font-family:${B.fontHeading};font-size:26px;font-weight:700;color:${B.foreground};line-height:1.2;letter-spacing:-0.02em;">
          You've made it a week, ${firstName}.
        </h1>
        <p style="margin:0 0 16px;font-family:${B.fontBody};font-size:15px;color:${B.mutedFg};line-height:1.65;">
          One week of daily practice. That's meaningful. Research on habit formation puts the most critical window in the first two weeks — and you're already through the hardest part.
        </p>
        <p style="margin:0 0 16px;font-family:${B.fontBody};font-size:15px;color:${B.mutedFg};line-height:1.65;">
          This week's principle is available inside. It's a short read designed to give your week a grounding frame — something to return to when things get noisy.
        </p>
        <p style="margin:0 0 32px;font-family:${B.fontBody};font-size:15px;color:${B.mutedFg};line-height:1.65;">
          Keep going.
        </p>
        ${ctaButton("This Week's Principle →", dashboardUrl)}
      </td>
    </tr>

    ${divider()}

    <!-- What's in the platform -->
    <tr>
      <td style="background:${B.card};padding:28px 40px;">
        <p style="margin:0 0 16px;font-family:${B.fontBody};font-size:11px;font-weight:700;color:${B.mutedFg};letter-spacing:0.12em;text-transform:uppercase;">Also inside your membership</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          ${[
            ["📚", "The Library", "Past themes, practices, and principles — available anytime you want to go deeper."],
            ["📓", "Your Journal", "A private space to reflect. No one else sees it."],
            ["📆", "Monthly Theme", "Each month has a guiding focus. The current theme is waiting inside."],
          ].map(([icon, title, desc]) => `
          <tr>
            <td style="padding:12px 0;border-bottom:1px solid ${B.border};vertical-align:top;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="width:36px;vertical-align:top;padding-top:2px;font-size:18px;">${icon}</td>
                  <td style="vertical-align:top;padding-left:12px;">
                    <p style="margin:0 0 3px;font-family:${B.fontHeading};font-size:13px;font-weight:700;color:${B.foreground};letter-spacing:-0.01em;">${title}</p>
                    <p style="margin:0;font-family:${B.fontBody};font-size:13px;color:${B.mutedFg};line-height:1.55;">${desc}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`).join("")}
        </table>
      </td>
    </tr>

    ${memberEmailFooter("https://positives.life/account", unsubscribeUrl)}`;

  return emailWrapper(body);
}

export function day7EmailText({ firstName, dashboardUrl }: Day7EmailData): string {
  return `You've made it a week, ${firstName}.

One week of daily practice. That's meaningful.

Research on habit formation puts the most critical window in the first two weeks — and you're already through the hardest part.

This week's principle is waiting inside — a short read to give your week a grounding frame:
${dashboardUrl}

Also inside your membership:
- The Library: past themes, practices, and principles available anytime
- Your Journal: a private space to reflect
- Monthly Theme: each month has a guiding focus

Keep going.

— The Positives Team
positives.life`;
}
