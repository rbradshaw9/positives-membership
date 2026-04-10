/**
 * lib/email/templates/trial-started.ts
 *
 * 7-day trial start email — sent immediately after a trial checkout activates.
 */

import {
  B,
  ctaButton,
  divider,
  emailHeader,
  emailWrapper,
  infoCard,
  memberEmailFooter,
} from "../brand";

export type TrialStartedEmailData = {
  firstName: string;
  loginUrl: string;
  planName?: string;
  trialEndDate?: string;
  unsubscribeUrl?: string;
};

export function trialStartedEmailHtml({
  firstName,
  loginUrl,
  planName,
  trialEndDate,
  unsubscribeUrl,
}: TrialStartedEmailData): string {
  const body = `
    ${emailHeader()}

    <tr>
      <td style="background:${B.card};padding:40px 40px 32px;">
        <p style="margin:0 0 8px;font-family:${B.fontBody};font-size:11px;font-weight:700;color:${B.primary};letter-spacing:0.12em;text-transform:uppercase;">7-day trial started</p>
        <h1 style="margin:0 0 20px;font-family:${B.fontHeading};font-size:28px;font-weight:700;color:${B.foreground};line-height:1.2;letter-spacing:-0.02em;">
          Your trial is live, ${firstName}.
        </h1>
        <p style="margin:0 0 16px;font-family:${B.fontBody};font-size:15px;color:${B.mutedFg};line-height:1.65;">
          You now have full access to ${planName ? `<strong style="color:${B.foreground};">${planName}</strong>` : "Positives"}. Start with today&apos;s practice and see how it feels to return to a calmer daily rhythm.
        </p>
        <p style="margin:0 0 32px;font-family:${B.fontBody};font-size:15px;color:${B.mutedFg};line-height:1.65;">
          ${trialEndDate
            ? `Your free trial runs through <strong style="color:${B.foreground};">${trialEndDate}</strong>. If you stay in, your membership will continue automatically after that.`
            : "Your free trial is active now. If you stay in, your membership will continue automatically after the 7-day period ends."}
        </p>
        ${ctaButton("Start Your Practice →", loginUrl)}
        <div style="height:20px;"></div>
        ${infoCard(`
          <p style="margin:0 0 6px;font-family:${B.fontHeading};font-size:13px;font-weight:700;color:${B.foreground};letter-spacing:-0.01em;">
            Need a faster way back in?
          </p>
          <p style="margin:0;font-family:${B.fontBody};font-size:13px;color:${B.mutedFg};line-height:1.6;">
            After you open Positives, go to <strong style="color:${B.foreground};">Account</strong> and set your password there. You can also manage or cancel billing from the same place.
          </p>
        `)}
      </td>
    </tr>

    ${divider()}

    <tr>
      <td style="background:${B.card};padding:28px 40px;">
        <p style="margin:0 0 16px;font-family:${B.fontBody};font-size:11px;font-weight:700;color:${B.mutedFg};letter-spacing:0.12em;text-transform:uppercase;">What to do this week</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          ${[
            ["🎧", "Start with today", "Your daily practice is the best first step. Keep it simple and return tomorrow."],
            ["📖", "Open the weekly reflection", "Use the weekly principle to give your days one clear grounding idea."],
            ["🌙", "Explore the monthly theme", "Every month has a deeper focus tying the daily and weekly rhythm together."],
          ]
            .map(
              ([icon, title, desc]) => `
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
          </tr>`
            )
            .join("")}
        </table>
      </td>
    </tr>

    ${memberEmailFooter("https://positives.life/account", unsubscribeUrl)}`;

  return emailWrapper(body);
}

export function trialStartedEmailText({
  firstName,
  loginUrl,
  planName,
  trialEndDate,
}: TrialStartedEmailData): string {
  return `Your trial is live, ${firstName}.

You now have full access to ${planName ?? "Positives"}.

${trialEndDate ? `Your free trial runs through ${trialEndDate}.` : "Your free trial is active now."} If you stay in, your membership will continue automatically after the 7-day period ends.

Start here:
${loginUrl}

Need a faster way back in?
After you open Positives, go to Account and set your password there. You can also manage or cancel billing from the same page.

What to do this week:
- Start with today: your daily practice is the best first step
- Open the weekly reflection
- Explore the monthly theme

— The Positives Team
positives.life`;
}
