#!/usr/bin/env node

/**
 * Creates clean raw-HTML ActiveCampaign templates for transactional email.
 *
 * Important API quirk:
 * - POST /templates with raw HTML creates a usable template.
 * - PUT /templates/:id re-wraps content in {"html":"...","css":""}, which
 *   makes the template preview/editor ugly inside ActiveCampaign.
 *
 * Because of that, this script only creates missing templates.
 */

const API_URL = process.env.ACTIVECAMPAIGN_API_URL;
const API_KEY = process.env.ACTIVECAMPAIGN_API_KEY;

if (!API_URL || !API_KEY) {
  console.error("Missing ACTIVECAMPAIGN_API_URL or ACTIVECAMPAIGN_API_KEY");
  process.exit(1);
}

const BRAND = {
  primary: "#2EC4B6",
  secondary: "#44A8D8",
  foreground: "#09090B",
  background: "#FAFAFA",
  card: "#FFFFFF",
  muted: "#F4F4F5",
  mutedFg: "#52525B",
  border: "#E4E4E7",
  warningBg: "#FFFBEB",
  warningBorder: "#F59E0B",
  warningText: "#92400E",
  radius: "16px",
  radiusSm: "12px",
  radiusPill: "9999px",
  fontHeading: "Montserrat, 'Helvetica Neue', Arial, sans-serif",
  fontBody: "Poppins, 'Helvetica Neue', Arial, sans-serif",
  gradient: "linear-gradient(135deg, #2EC4B6 0%, #44A8D8 100%)",
};

const GOOGLE_FONTS =
  '<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800&family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">';

function shell(inner) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    ${GOOGLE_FONTS}
  </head>
  <body style="margin:0;padding:0;background:${BRAND.background};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.background};padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">
            ${inner}
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function header() {
  return `
    <tr>
      <td style="background:${BRAND.gradient};border-radius:${BRAND.radius} ${BRAND.radius} 0 0;padding:30px 36px;text-align:center;">
        <p style="margin:0;font-family:${BRAND.fontHeading};font-size:24px;font-weight:800;color:#FFFFFF;letter-spacing:0.08em;text-transform:uppercase;line-height:1;">POSITIVES</p>
        <p style="margin:8px 0 0;font-family:${BRAND.fontBody};font-size:11px;color:rgba(255,255,255,0.85);letter-spacing:0.14em;text-transform:uppercase;">Daily practice for a better life</p>
      </td>
    </tr>
    <tr>
      <td style="background:linear-gradient(90deg,#2EC4B6,#44A8D8,#2EC4B6);height:3px;font-size:0;line-height:0;">&nbsp;</td>
    </tr>`;
}

function cardIntro(kicker, title, body, cta) {
  return `
    <tr>
      <td style="background:${BRAND.card};padding:38px 40px 30px;">
        <p style="margin:0 0 8px;font-family:${BRAND.fontBody};font-size:11px;font-weight:700;color:${BRAND.primary};letter-spacing:0.12em;text-transform:uppercase;">${kicker}</p>
        <h1 style="margin:0 0 18px;font-family:${BRAND.fontHeading};font-size:28px;font-weight:700;color:${BRAND.foreground};line-height:1.2;letter-spacing:-0.02em;">${title}</h1>
        ${body}
        ${cta ? `<div style="padding-top:28px;">${button(cta.label, cta.href)}</div>` : ""}
      </td>
    </tr>`;
}

function button(label, href) {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="background:${BRAND.gradient};border-radius:${BRAND.radiusPill};box-shadow:0 4px 16px rgba(46,196,182,0.28);">
          <a href="${href}" style="display:inline-block;padding:15px 34px;font-family:${BRAND.fontBody};font-size:15px;font-weight:700;color:#FFFFFF;text-decoration:none;letter-spacing:0.01em;">${label}</a>
        </td>
      </tr>
    </table>`;
}

function divider() {
  return `<tr><td style="padding:0 40px;background:${BRAND.card};"><hr style="border:none;border-top:1px solid ${BRAND.border};margin:0;"></td></tr>`;
}

function section(title, rows) {
  return `
    <tr>
      <td style="background:${BRAND.card};padding:28px 40px 34px;border-radius:0 0 ${BRAND.radius} ${BRAND.radius};">
        <p style="margin:0 0 18px;font-family:${BRAND.fontBody};font-size:11px;font-weight:700;color:${BRAND.mutedFg};letter-spacing:0.12em;text-transform:uppercase;">${title}</p>
        ${rows}
      </td>
    </tr>`;
}

function list(items) {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      ${items
        .map(
          ([icon, title, desc], index) => `
        <tr>
          <td style="padding:12px 0;${index < items.length - 1 ? `border-bottom:1px solid ${BRAND.border};` : ""}">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="width:36px;font-size:18px;vertical-align:top;padding-top:2px;">${icon}</td>
                <td style="padding-left:12px;vertical-align:top;">
                  <p style="margin:0 0 4px;font-family:${BRAND.fontHeading};font-size:13px;font-weight:700;color:${BRAND.foreground};letter-spacing:-0.01em;">${title}</p>
                  <p style="margin:0;font-family:${BRAND.fontBody};font-size:13px;color:${BRAND.mutedFg};line-height:1.55;">${desc}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>`
        )
        .join("")}
    </table>`;
}

function infoCard(content) {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:20px;">
      <tr>
        <td style="background:${BRAND.muted};border-left:4px solid ${BRAND.primary};border-radius:${BRAND.radiusSm};padding:18px 20px;">
          ${content}
        </td>
      </tr>
    </table>`;
}

function warningNotice(text) {
  return `
    <tr>
      <td style="background:${BRAND.warningBg};border-left:4px solid ${BRAND.warningBorder};padding:14px 40px;">
        <p style="margin:0;font-family:${BRAND.fontBody};font-size:13px;font-weight:600;color:${BRAND.warningText};">${text}</p>
      </td>
    </tr>`;
}

function receiptBox() {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.muted};border-radius:${BRAND.radius};border:1px solid ${BRAND.border};margin:2px 0 28px;">
      <tr>
        <td style="padding:22px 26px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="padding:8px 0;border-bottom:1px solid ${BRAND.border};">
                <p style="margin:0;font-family:${BRAND.fontBody};font-size:11px;color:${BRAND.mutedFg};text-transform:uppercase;letter-spacing:0.09em;font-weight:700;">Invoice</p>
                <p style="margin:4px 0 0;font-family:${BRAND.fontBody};font-size:14px;color:${BRAND.foreground};">%INVOICE_NUMBER%</p>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 0;border-bottom:1px solid ${BRAND.border};">
                <p style="margin:0;font-family:${BRAND.fontBody};font-size:11px;color:${BRAND.mutedFg};text-transform:uppercase;letter-spacing:0.09em;font-weight:700;">Amount</p>
                <p style="margin:4px 0 0;font-family:${BRAND.fontBody};font-size:14px;color:${BRAND.foreground};">%AMOUNT_PAID%</p>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 0;">
                <p style="margin:0;font-family:${BRAND.fontBody};font-size:11px;color:${BRAND.mutedFg};text-transform:uppercase;letter-spacing:0.09em;font-weight:700;">Next billing date</p>
                <p style="margin:4px 0 0;font-family:${BRAND.fontBody};font-size:14px;color:${BRAND.foreground};">%NEXT_BILLING_DATE%</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`;
}

const templates = [
  {
    name: "Positives Transactional - Welcome",
    html: shell(
      `${header()}${cardIntro(
        "Welcome",
        "Good to have you, %FIRSTNAME%.",
        `
          <p style="margin:0 0 16px;font-family:${BRAND.fontBody};font-size:15px;color:${BRAND.mutedFg};line-height:1.65;">
            Positives is a daily practice. Not a course. Not a program. Something you come back to each morning to start your day grounded.
          </p>
          <p style="margin:0;font-family:${BRAND.fontBody};font-size:15px;color:${BRAND.mutedFg};line-height:1.65;">
            Your first daily audio is waiting for you inside.
          </p>
          ${infoCard(`
            <p style="margin:0 0 6px;font-family:${BRAND.fontHeading};font-size:13px;font-weight:700;color:${BRAND.foreground};">Want faster sign-in next time?</p>
            <p style="margin:0;font-family:${BRAND.fontBody};font-size:13px;color:${BRAND.mutedFg};line-height:1.6;">
              After you open Positives, go to <strong style="color:${BRAND.foreground};">Account</strong> and create your password there.
            </p>
          `)}
        `,
        { label: "Start Your Practice", href: "%LOGIN_LINK%" }
      )}${divider()}${section(
        "Your practice",
        list([
          ["&#127911;", "Daily", "A short audio from Dr. Paul to ground you before the day begins."],
          ["&#128214;", "Weekly", "A guiding principle and practice to carry through your week."],
          ["&#127769;", "Monthly", "A deeper theme to anchor your focus for the month."],
        ])
      )}`
    ),
  },
  {
    name: "Positives Transactional - Trial Started",
    html: shell(
      `${header()}${cardIntro(
        "7-day trial started",
        "Your trial is live, %FIRSTNAME%.",
        `
          <p style="margin:0 0 16px;font-family:${BRAND.fontBody};font-size:15px;color:${BRAND.mutedFg};line-height:1.65;">
            You now have full access to <strong style="color:${BRAND.foreground};">%PLAN_NAME%</strong>. Start with today's practice and see how it feels to return to a calmer daily rhythm.
          </p>
          <p style="margin:0;font-family:${BRAND.fontBody};font-size:15px;color:${BRAND.mutedFg};line-height:1.65;">
            Your free trial runs through <strong style="color:${BRAND.foreground};">%TRIAL_END_DATE%</strong>.
          </p>
          ${infoCard(`
            <p style="margin:0 0 6px;font-family:${BRAND.fontHeading};font-size:13px;font-weight:700;color:${BRAND.foreground};">Need a faster way back in?</p>
            <p style="margin:0;font-family:${BRAND.fontBody};font-size:13px;color:${BRAND.mutedFg};line-height:1.6;">
              After you open Positives, go to <strong style="color:${BRAND.foreground};">Account</strong> and set your password there.
            </p>
          `)}
        `,
        { label: "Start Your Practice", href: "%LOGIN_LINK%" }
      )}${divider()}${section(
        "What to do this week",
        list([
          ["&#127911;", "Start with today", "Your daily practice is the best first step. Keep it simple and return tomorrow."],
          ["&#128214;", "Open the weekly reflection", "Use the weekly principle to give your days one clear grounding idea."],
          ["&#127769;", "Explore the monthly theme", "Every month has a deeper focus tying the daily and weekly rhythm together."],
        ])
      )}`
    ),
  },
  {
    name: "Positives Transactional - Payment Receipt",
    html: shell(
      `${header()}${cardIntro(
        "Payment confirmed",
        "Receipt for %FIRSTNAME%",
        `
          <p style="margin:0 0 22px;font-family:${BRAND.fontBody};font-size:15px;color:${BRAND.mutedFg};line-height:1.6;">
            Thanks. Your payment went through and your membership is active.
          </p>
          ${receiptBox()}
        `,
        { label: "View Invoice", href: "%INVOICE_URL%" }
      )}`
    ),
  },
  {
    name: "Positives Transactional - Payment Failed Day 0",
    html: shell(
      `${header()}${warningNotice("Action needed - your payment did not go through.")}${cardIntro(
        "Billing",
        "We could not process your payment, %FIRSTNAME%.",
        `
          <p style="margin:0 0 16px;font-family:${BRAND.fontBody};font-size:15px;color:${BRAND.mutedFg};line-height:1.65;">
            This usually means the card on file needs to be updated. Your access is still active while you take care of it.
          </p>
          <p style="margin:0;font-family:${BRAND.fontBody};font-size:15px;color:${BRAND.mutedFg};line-height:1.65;">
            It only takes a minute to fix.
          </p>
        `,
        { label: "Update Payment Method", href: "%BILLING_LINK%" }
      )}`
    ),
  },
  {
    name: "Positives Transactional - Payment Failed Day 3",
    html: shell(
      `${header()}${warningNotice("Your payment still needs attention.")}${cardIntro(
        "Billing follow-up",
        "A quick reminder, %FIRSTNAME%.",
        `
          <p style="margin:0 0 16px;font-family:${BRAND.fontBody};font-size:15px;color:${BRAND.mutedFg};line-height:1.65;">
            We are still waiting on an updated payment method for your Positives membership.
          </p>
          <p style="margin:0;font-family:${BRAND.fontBody};font-size:15px;color:${BRAND.mutedFg};line-height:1.65;">
            Updating now keeps your access uninterrupted.
          </p>
        `,
        { label: "Update Payment Method", href: "%BILLING_LINK%" }
      )}`
    ),
  },
  {
    name: "Positives Transactional - Payment Failed Final",
    html: shell(
      `${header()}${warningNotice("Final billing reminder before access is paused.")}${cardIntro(
        "Final notice",
        "Your membership needs attention, %FIRSTNAME%.",
        `
          <p style="margin:0 0 16px;font-family:${BRAND.fontBody};font-size:15px;color:${BRAND.mutedFg};line-height:1.65;">
            We still have not been able to process your payment. If it is not updated soon, your access may be paused.
          </p>
          <p style="margin:0;font-family:${BRAND.fontBody};font-size:15px;color:${BRAND.mutedFg};line-height:1.65;">
            We would love to keep your practice uninterrupted.
          </p>
        `,
        { label: "Fix Billing", href: "%BILLING_LINK%" }
      )}`
    ),
  },
  {
    name: "Positives Transactional - Trial Ending",
    html: shell(
      `${header()}${cardIntro(
        "Trial ending soon",
        "Your trial ends soon, %FIRSTNAME%.",
        `
          <p style="margin:0 0 16px;font-family:${BRAND.fontBody};font-size:15px;color:${BRAND.mutedFg};line-height:1.65;">
            Your free trial runs through <strong style="color:${BRAND.foreground};">%TRIAL_END_DATE%</strong>.
          </p>
          <p style="margin:0;font-family:${BRAND.fontBody};font-size:15px;color:${BRAND.mutedFg};line-height:1.65;">
            To keep access uninterrupted, confirm your payment method now.
          </p>
        `,
        { label: "Update Billing", href: "%BILLING_LINK%" }
      )}`
    ),
  },
  {
    name: "Positives Transactional - Tier Changed",
    html: shell(
      `${header()}${cardIntro(
        "Plan updated",
        "Your membership has been updated.",
        `
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.muted};border:1px solid ${BRAND.border};border-radius:${BRAND.radius};margin-top:4px;">
            <tr>
              <td style="padding:20px 24px;font-family:${BRAND.fontBody};font-size:14px;color:${BRAND.foreground};line-height:1.7;">
                Previous tier: <strong>%PREVIOUS_TIER%</strong><br>
                New tier: <strong>%NEW_TIER%</strong><br>
                Plan: <strong>%PLAN_NAME%</strong>
              </td>
            </tr>
          </table>
          <p style="margin:18px 0 0;font-family:${BRAND.fontBody};font-size:14px;color:${BRAND.mutedFg};line-height:1.65;">
            If you did not request this change, reply to this email and we will help.
          </p>
        `
      )}`
    ),
  },
  {
    name: "Positives Transactional - Cancellation Confirmation",
    html: shell(
      `${header()}${cardIntro(
        "Membership update",
        "Your membership has been canceled.",
        `
          <p style="margin:0 0 16px;font-family:${BRAND.fontBody};font-size:15px;color:${BRAND.mutedFg};line-height:1.65;">
            We are sorry to see you go. Your account will remain available through the end of your current billing period.
          </p>
          <p style="margin:0;font-family:${BRAND.fontBody};font-size:15px;color:${BRAND.mutedFg};line-height:1.65;">
            If you change your mind, you can always come back.
          </p>
        `,
        { label: "Open Positives", href: "https://positives.life/account" }
      )}`
    ),
  },
  {
    name: "Positives Transactional - Affiliate Welcome",
    html: shell(
      `${header()}${cardIntro(
        "Affiliate",
        "Welcome to the affiliate program, %FIRSTNAME%.",
        `
          <p style="margin:0 0 16px;font-family:${BRAND.fontBody};font-size:15px;color:${BRAND.mutedFg};line-height:1.65;">
            Your FirstPromoter referral link is ready. Use it whenever you share Positives with your audience.
          </p>
          ${infoCard(`
            <p style="margin:0 0 6px;font-family:${BRAND.fontHeading};font-size:13px;font-weight:700;color:${BRAND.foreground};">Your link</p>
            <p style="margin:0;font-family:${BRAND.fontBody};font-size:13px;color:${BRAND.mutedFg};line-height:1.6;word-break:break-all;">
              %FIRSTPROMOTER_LINK%
            </p>
          `)}
        `,
        { label: "Open Affiliate Portal", href: "%FIRSTPROMOTER_PORTAL_URL%" }
      )}`
    ),
  },
];

async function api(path, options = {}) {
  const response = await fetch(`${API_URL}/api/3${path}`, {
    ...options,
    headers: {
      "Api-Token": API_KEY,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${response.status} ${response.statusText}: ${text}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

async function main() {
  const existing = await api("/templates?limit=200");
  const names = new Set((existing.templates ?? []).map((template) => template.name));

  for (const template of templates) {
    if (names.has(template.name)) {
      console.log(`skip ${template.name}`);
      continue;
    }

    const created = await api("/templates", {
      method: "POST",
      body: JSON.stringify({
        template: {
          name: template.name,
          content: template.html,
        },
      }),
    });

    console.log(`created ${template.name} -> ${created.template.id}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
