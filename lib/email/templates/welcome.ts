/**
 * lib/email/templates/welcome.ts
 *
 * Welcome email — fires after guest checkout activation (Step 6 in handle-checkout.ts).
 * Triggered by: Stripe checkout.session.completed → our webhook → Resend.
 */

import { B, emailWrapper, emailHeader, memberEmailFooter, ctaButton, divider, infoCard } from "../brand";

export type WelcomeEmailData = {
  firstName: string;
  loginUrl: string;
  unsubscribeUrl?: string;
};

export function welcomeEmailHtml({ firstName, loginUrl, unsubscribeUrl }: WelcomeEmailData): string {
  const body = `
    ${emailHeader()}

    <!-- Body -->
    <tr>
      <td style="background:${B.card};padding:40px 40px 32px;">
        <p style="margin:0 0 8px;font-family:${B.fontBody};font-size:11px;font-weight:700;color:${B.primary};letter-spacing:0.12em;text-transform:uppercase;">Welcome</p>
        <h1 style="margin:0 0 20px;font-family:${B.fontHeading};font-size:28px;font-weight:700;color:${B.foreground};line-height:1.2;letter-spacing:-0.02em;">
          Good to have you, ${firstName}.
        </h1>
        <p style="margin:0 0 16px;font-family:${B.fontBody};font-size:15px;color:${B.mutedFg};line-height:1.65;">
          Positives is a daily practice. Not a course. Not a program. Something you come back to each morning to start your day grounded.
        </p>
        <p style="margin:0 0 32px;font-family:${B.fontBody};font-size:15px;color:${B.mutedFg};line-height:1.65;">
          Your first daily audio is waiting for you inside.
        </p>
        ${ctaButton("Start Your Practice →", loginUrl)}
        <div style="height:20px;"></div>
        ${infoCard(`
          <p style="margin:0 0 6px;font-family:${B.fontHeading};font-size:13px;font-weight:700;color:${B.foreground};letter-spacing:-0.01em;">
            Want faster sign-in next time?
          </p>
          <p style="margin:0;font-family:${B.fontBody};font-size:13px;color:${B.mutedFg};line-height:1.6;">
            After you open Positives, go to <strong style="color:${B.foreground};">Account</strong> and create your password there. For security, we don&apos;t send passwords by email.
          </p>
        `)}
      </td>
    </tr>

    ${divider()}

    <!-- What to expect -->
    <tr>
      <td style="background:${B.card};padding:28px 40px;">
        <p style="margin:0 0 20px;font-family:${B.fontBody};font-size:11px;font-weight:700;color:${B.mutedFg};letter-spacing:0.12em;text-transform:uppercase;">Your practice</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          ${[
            ["🎧", "Daily", "A short audio from Dr. Paul to ground you before the day begins."],
            ["📖", "Weekly", "A guiding principle and practice to carry through your week."],
            ["🌙", "Monthly", "A deeper theme to anchor your focus for the month."],
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

export function welcomeEmailText({ firstName, loginUrl }: WelcomeEmailData): string {
  return `Good to have you, ${firstName}.

Positives is a daily practice — not a course, not a program. Something you return to each morning to start your day grounded.

Your first daily audio is waiting inside:
${loginUrl}

Want faster sign-in next time?
After you open Positives, go to Account and create your password there. For security, we don't send passwords by email.

Your practice:
- Daily: A short audio from Dr. Paul each morning
- Weekly: A guiding principle and practice
- Monthly: A deeper theme to anchor your focus

Questions? Just reply to this email.

— The Positives Team
positives.life`;
}
