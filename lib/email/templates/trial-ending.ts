/**
 * lib/email/templates/trial-ending.ts
 *
 * Trial reminder email — sent from Stripe's `customer.subscription.trial_will_end`
 * webhook event.
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

export type TrialEndingEmailData = {
  firstName: string;
  planName?: string;
  dashboardUrl: string;
  billingUrl: string;
  trialEndDate?: string;
  unsubscribeUrl?: string;
};

export function trialEndingEmailHtml({
  firstName,
  planName,
  dashboardUrl,
  billingUrl,
  trialEndDate,
  unsubscribeUrl,
}: TrialEndingEmailData): string {
  const body = `
    ${emailHeader()}

    <tr>
      <td style="background:${B.card};padding:40px 40px 32px;">
        <p style="margin:0 0 8px;font-family:${B.fontBody};font-size:11px;font-weight:700;color:${B.primary};letter-spacing:0.12em;text-transform:uppercase;">Trial reminder</p>
        <h1 style="margin:0 0 20px;font-family:${B.fontHeading};font-size:28px;font-weight:700;color:${B.foreground};line-height:1.2;letter-spacing:-0.02em;">
          Your trial is almost up, ${firstName}.
        </h1>
        <p style="margin:0 0 16px;font-family:${B.fontBody};font-size:15px;color:${B.mutedFg};line-height:1.65;">
          ${trialEndDate
            ? `Your 7-day trial ends on <strong style="color:${B.foreground};">${trialEndDate}</strong>.`
            : "Your 7-day trial ends soon."}
          If ${planName ? `<strong style="color:${B.foreground};">${planName}</strong>` : "Positives"} is helping, you don&apos;t need to do anything. Your membership will continue automatically.
        </p>
        <p style="margin:0 0 28px;font-family:${B.fontBody};font-size:15px;color:${B.mutedFg};line-height:1.65;">
          If it&apos;s not the right fit, you can cancel from your billing center before the trial ends.
        </p>
        ${ctaButton("Open Positives →", dashboardUrl)}
        <div style="height:16px;"></div>
        ${ctaButton("Manage Billing →", billingUrl)}
      </td>
    </tr>

    ${divider()}

    <tr>
      <td style="background:${B.card};padding:28px 40px;">
        ${infoCard(`
          <p style="margin:0 0 6px;font-family:${B.fontHeading};font-size:13px;font-weight:700;color:${B.foreground};letter-spacing:-0.01em;">
            Want to stay in?
          </p>
          <p style="margin:0;font-family:${B.fontBody};font-size:13px;color:${B.mutedFg};line-height:1.6;">
            Keep showing up for the daily practice. If you continue, the same membership just rolls forward automatically and nothing in your account changes.
          </p>
        `)}
      </td>
    </tr>

    ${memberEmailFooter("https://positives.life/account", unsubscribeUrl)}`;

  return emailWrapper(body);
}

export function trialEndingEmailText({
  firstName,
  planName,
  dashboardUrl,
  billingUrl,
  trialEndDate,
}: TrialEndingEmailData): string {
  return `Your trial is almost up, ${firstName}.

${trialEndDate ? `Your 7-day trial ends on ${trialEndDate}.` : "Your 7-day trial ends soon."}

If ${planName ?? "Positives"} is helping, you don't need to do anything. Your membership will continue automatically.

Open Positives:
${dashboardUrl}

Manage billing or cancel:
${billingUrl}

— The Positives Team
positives.life`;
}
