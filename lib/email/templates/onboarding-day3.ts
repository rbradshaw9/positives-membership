/**
 * lib/email/templates/onboarding-day3.ts
 *
 * Onboarding drip — Day 3
 * "How's it going?" warm check-in. Reinforces the daily habit, surfaces the
 * weekly principle, removes friction for anyone not sure what to do next.
 */

import { B, emailWrapper, emailHeader, emailFooter, ctaButton, divider } from "../brand";

export type Day3EmailData = {
  firstName: string;
  dashboardUrl: string;
};

export function day3EmailHtml({ firstName, dashboardUrl }: Day3EmailData): string {
  const body = `
    ${emailHeader()}

    <!-- Body -->
    <tr>
      <td style="background:${B.card};padding:40px 40px 32px;">
        <p style="margin:0 0 8px;font-family:${B.fontBody};font-size:11px;font-weight:700;color:${B.primary};letter-spacing:0.12em;text-transform:uppercase;">Day 3</p>
        <h1 style="margin:0 0 20px;font-family:${B.fontHeading};font-size:26px;font-weight:700;color:${B.foreground};line-height:1.2;letter-spacing:-0.02em;">
          How's the practice feeling, ${firstName}?
        </h1>
        <p style="margin:0 0 16px;font-family:${B.fontBody};font-size:15px;color:${B.mutedFg};line-height:1.65;">
          Three days in. That's not nothing — most people never make it this far.
        </p>
        <p style="margin:0 0 16px;font-family:${B.fontBody};font-size:15px;color:${B.mutedFg};line-height:1.65;">
          The daily audio is short on purpose. Dr. Paul designed it to fit in before the day gets loud — before the inbox opens, before the first meeting, before everything pulls at your attention.
        </p>
        <p style="margin:0 0 32px;font-family:${B.fontBody};font-size:15px;color:${B.mutedFg};line-height:1.65;">
          If you haven't listened yet today, today's practice is ready for you.
        </p>
        ${ctaButton("Today's Practice →", dashboardUrl)}
      </td>
    </tr>

    ${divider()}

    <!-- Tip block -->
    <tr>
      <td style="background:${B.card};padding:28px 40px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="background:${B.muted};border-radius:${B.radiusSm};border-left:3px solid ${B.primary};padding:20px 24px;">
              <p style="margin:0 0 6px;font-family:${B.fontHeading};font-size:13px;font-weight:700;color:${B.foreground};">A simple suggestion</p>
              <p style="margin:0;font-family:${B.fontBody};font-size:13px;color:${B.mutedFg};line-height:1.6;">
                Pair the daily audio with something you already do each morning — coffee, getting dressed, a short walk. Habit stacking makes it easier to stay consistent without thinking about it.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    ${divider()}

    <!-- Reply nudge -->
    <tr>
      <td style="background:${B.card};padding:28px 40px 40px;">
        <p style="margin:0;font-family:${B.fontBody};font-size:14px;color:${B.mutedFg};line-height:1.65;">
          Questions about the platform or your practice? Just reply here — a real human reads these.
        </p>
      </td>
    </tr>

    ${emailFooter()}`;

  return emailWrapper(body);
}

export function day3EmailText({ firstName, dashboardUrl }: Day3EmailData): string {
  return `How's the practice feeling, ${firstName}?

Three days in — that's not nothing. Most people never make it this far.

The daily audio is short on purpose. Dr. Paul designed it to fit in before the day gets loud — before the inbox, before the meetings, before everything pulls at your attention.

If you haven't listened yet today, it's ready for you:
${dashboardUrl}

A simple suggestion: pair the daily audio with something you already do each morning — coffee, a walk, getting dressed. Habit stacking makes consistency effortless.

Questions? Just reply here — a real human reads these.

— The Positives Team
positives.life`;
}
