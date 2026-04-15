#!/usr/bin/env node

/**
 * Create review-approved Positives email templates in ActiveCampaign.
 *
 * Important API quirk:
 * - POST /templates with raw HTML creates clean templates.
 * - PUT /templates/:id can wrap content in a JSON blob inside AC.
 *
 * This script only creates missing templates and never updates existing ones.
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
  radius: "18px",
  radiusSm: "12px",
  radiusPill: "9999px",
  fontHeading: "Montserrat, 'Helvetica Neue', Arial, sans-serif",
  fontBody: "Poppins, 'Helvetica Neue', Arial, sans-serif",
  gradient: "linear-gradient(135deg, #2EC4B6 0%, #44A8D8 100%)",
};

const GOOGLE_FONTS =
  '<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800&family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">';

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function preheader(text) {
  return `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(
    text
  )}</div>`;
}

function shell({ preview, body }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    ${GOOGLE_FONTS}
  </head>
  <body style="margin:0;padding:0;background:${BRAND.background};">
    ${preheader(preview)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.background};padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;">
            ${body}
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function header(kicker) {
  return `
    <tr>
      <td style="background:${BRAND.gradient};border-radius:${BRAND.radius} ${BRAND.radius} 0 0;padding:30px 36px;text-align:center;">
        <p style="margin:0;font-family:${BRAND.fontHeading};font-size:24px;font-weight:800;color:#FFFFFF;letter-spacing:0.08em;text-transform:uppercase;line-height:1;">POSITIVES</p>
        <p style="margin:8px 0 0;font-family:${BRAND.fontBody};font-size:11px;color:rgba(255,255,255,0.88);letter-spacing:0.14em;text-transform:uppercase;">${escapeHtml(
          kicker
        )}</p>
      </td>
    </tr>
    <tr>
      <td style="background:linear-gradient(90deg,#2EC4B6,#44A8D8,#2EC4B6);height:3px;font-size:0;line-height:0;">&nbsp;</td>
    </tr>`;
}

function button(label, href) {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="background:${BRAND.gradient};border-radius:${BRAND.radiusPill};box-shadow:0 4px 16px rgba(46,196,182,0.22);">
          <a href="${href}" style="display:inline-block;padding:15px 34px;font-family:${BRAND.fontBody};font-size:15px;font-weight:700;color:#FFFFFF;text-decoration:none;letter-spacing:0.01em;">${escapeHtml(
            label
          )}</a>
        </td>
      </tr>
    </table>`;
}

function paragraph(text, strong = false) {
  return `<p style="margin:0 0 16px;font-family:${BRAND.fontBody};font-size:${
    strong ? "16px" : "15px"
  };font-weight:${strong ? "600" : "400"};color:${BRAND.mutedFg};line-height:1.7;">${text}</p>`;
}

function bullets(items) {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 18px;">
      ${items
        .map(
          (item) => `
        <tr>
          <td style="padding:6px 0;font-family:${BRAND.fontBody};font-size:15px;color:${BRAND.foreground};line-height:1.6;">
            <span style="color:${BRAND.primary};font-weight:700;">•</span> ${item}
          </td>
        </tr>`
        )
        .join("")}
    </table>`;
}

function infoBox(content) {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0 22px;">
      <tr>
        <td style="background:${BRAND.muted};border-left:4px solid ${BRAND.primary};border-radius:${BRAND.radiusSm};padding:18px 20px;">
          ${content}
        </td>
      </tr>
    </table>`;
}

function warning(text) {
  return `
    <tr>
      <td style="background:${BRAND.warningBg};border-left:4px solid ${BRAND.warningBorder};padding:14px 40px;">
        <p style="margin:0;font-family:${BRAND.fontBody};font-size:13px;font-weight:600;color:${BRAND.warningText};">${text}</p>
      </td>
    </tr>`;
}

function card({ kicker, title, paragraphs = [], bulletItems = [], info = "", cta }) {
  return `
    <tr>
      <td style="background:${BRAND.card};padding:40px 40px 32px;">
        <p style="margin:0 0 8px;font-family:${BRAND.fontBody};font-size:11px;font-weight:700;color:${BRAND.primary};letter-spacing:0.12em;text-transform:uppercase;">${escapeHtml(
          kicker
        )}</p>
        <h1 style="margin:0 0 18px;font-family:${BRAND.fontHeading};font-size:30px;font-weight:700;color:${BRAND.foreground};line-height:1.2;letter-spacing:-0.02em;">${title}</h1>
        ${paragraphs.map((item) => paragraph(item)).join("")}
        ${bulletItems.length ? bullets(bulletItems) : ""}
        ${info ? infoBox(info) : ""}
        ${
          cta
            ? `<div style="padding-top:8px;">${button(cta.label, cta.href)}</div>`
            : ""
        }
      </td>
    </tr>
    <tr>
      <td style="background:${BRAND.card};border-radius:0 0 ${BRAND.radius} ${BRAND.radius};padding:0 40px 34px;">
        <p style="margin:0;font-family:${BRAND.fontBody};font-size:13px;color:${BRAND.mutedFg};line-height:1.6;">If you need help, reply to this email and we’ll help.</p>
      </td>
    </tr>`;
}

function buildTemplate({ preview, kicker, warningText, title, paragraphs, bulletItems, info, cta }) {
  return shell({
    preview,
    body: `${header(kicker)}${warningText ? warning(warningText) : ""}${card({
      kicker,
      title,
      paragraphs,
      bulletItems,
      info,
      cta,
    })}`,
  });
}

const templates = [
  {
    name: "POS C01-E01 PM Welcome to Positives",
    html: buildTemplate({
      preview: "Your membership is live. Start with today’s practice.",
      kicker: "Welcome",
      title: "Welcome to Positives.",
      paragraphs: [
        "Hi %FIRSTNAME%,",
        "Your membership is live, and your first step is simple: open Positives and start with today’s practice.",
        "You do not need to catch up or complete anything perfectly. Just begin with today.",
      ],
      bulletItems: ["Today", "This Week", "This Month"],
      cta: { label: "Open Positives", href: "%LOGIN_LINK%" },
    }),
  },
  {
    name: "POS C01-E02 AC Come Back to Today's Practice",
    html: buildTemplate({
      preview: "A few quiet minutes is enough to keep the rhythm going.",
      kicker: "First week",
      title: "Come back to today’s practice.",
      paragraphs: [
        "Hi %FIRSTNAME%,",
        "The value of Positives comes from returning, not from doing everything at once.",
        "Come back to today’s practice when you have a few quiet minutes. That is enough to keep the rhythm going.",
      ],
      cta: { label: "Open Positives", href: "%LOGIN_LINK%" },
    }),
  },
  {
    name: "POS C01-E03 AC Make Positives Stick",
    html: buildTemplate({
      preview: "Start with Today, stay close to This Week, and let the habit build.",
      kicker: "Practice rhythm",
      title: "A simple way to make Positives stick.",
      paragraphs: [
        "Hi %FIRSTNAME%,",
        "The simplest rhythm is this: start with Today, stay close to This Week, and let This Month give the practice a larger direction.",
        "You do not need to be perfect. Just keep returning.",
      ],
      cta: { label: "Open Positives", href: "%LOGIN_LINK%" },
    }),
  },
  {
    name: "POS C02-E01 PM Your Trial Has Started",
    html: buildTemplate({
      preview: "You have full access now. Start with today’s practice.",
      kicker: "Trial started",
      title: "Your Positives trial is now active.",
      paragraphs: [
        "Hi %FIRSTNAME%,",
        "You have full access through %TRIAL_END_DATE%, and the best way to begin is simply to start with today’s practice.",
        "There’s nothing to catch up on. Just come in, press play, and begin there.",
      ],
      cta: { label: "Open Positives", href: "%LOGIN_LINK%" },
    }),
  },
  {
    name: "POS C02-E02 PM Your Trial Ends Soon",
    html: buildTemplate({
      preview: "Review your billing details before your trial ends.",
      kicker: "Trial ending",
      title: "Your trial ends soon.",
      paragraphs: [
        "Hi %FIRSTNAME%,",
        "Your Positives trial runs through %TRIAL_END_DATE%.",
        "If you want uninterrupted access, now is a good time to make sure your billing details are ready.",
      ],
      cta: { label: "Update Billing", href: "%BILLING_LINK%" },
    }),
  },
  {
    name: "POS C02-E03 PM Final Trial Reminder",
    html: buildTemplate({
      preview: "Keep access uninterrupted by confirming your payment method.",
      kicker: "Final reminder",
      title: "Final reminder before your trial ends.",
      paragraphs: [
        "Hi %FIRSTNAME%,",
        "This is a final reminder that your Positives trial ends on %TRIAL_END_DATE%.",
        "If you want your access to continue without interruption, please confirm your payment details now.",
      ],
      cta: { label: "Update Billing", href: "%BILLING_LINK%" },
    }),
  },
  {
    name: "POS C03-E01 PM Your Access Has Been Restored",
    html: buildTemplate({
      preview: "Your Positives access is active again.",
      kicker: "Access restored",
      title: "Your access has been restored.",
      paragraphs: [
        "Hi %FIRSTNAME%,",
        "Your Positives access is active again.",
        "The easiest way back in is to start with today’s practice. You do not need to catch up or restart from the beginning.",
      ],
      info: `
        <p style="margin:0;font-family:${BRAND.fontBody};font-size:13px;color:${BRAND.mutedFg};line-height:1.6;">
          Restored on <strong style="color:${BRAND.foreground};">%ACCESS_RESTORED_AT%</strong>
        </p>
      `,
      cta: { label: "Return to Positives", href: "%LOGIN_LINK%" },
    }),
  },
  {
    name: "POS C03-E02 PM Pick Up Where You Left Off",
    html: buildTemplate({
      preview: "A gentle nudge back into your daily practice.",
      kicker: "Pick up again",
      title: "Pick up where you left off.",
      paragraphs: [
        "Hi %FIRSTNAME%,",
        "Now that your access is restored, the best next step is simple: come back to Today.",
        "A few quiet minutes is enough to reconnect with the practice.",
      ],
      cta: { label: "Open Today", href: "%LOGIN_LINK%" },
    }),
  },
  {
    name: "POS C04-E01 PM Action Needed on Your Billing",
    html: buildTemplate({
      preview: "We could not process your payment, but your access is still active for now.",
      kicker: "Billing",
      warningText: "Action needed — your payment did not go through.",
      title: "We could not process your payment.",
      paragraphs: [
        "Hi %FIRSTNAME%,",
        "This usually means the card on file needs to be updated. Your access is still active for the moment, and it should only take a minute to fix.",
      ],
      cta: { label: "Update Payment Method", href: "%BILLING_LINK%" },
    }),
  },
  {
    name: "POS C04-E02 PM Billing Reminder",
    html: buildTemplate({
      preview: "A quick reminder to update your card and keep access uninterrupted.",
      kicker: "Billing reminder",
      warningText: "Your payment method still needs attention.",
      title: "A quick billing reminder.",
      paragraphs: [
        "Hi %FIRSTNAME%,",
        "Your Positives payment method still needs attention.",
        "Updating it now should keep your access uninterrupted.",
      ],
      cta: { label: "Update Payment Method", href: "%BILLING_LINK%" },
    }),
  },
  {
    name: "POS C04-E03 PM Final Billing Reminder",
    html: buildTemplate({
      preview: "Update your billing details to avoid interruption.",
      kicker: "Final billing reminder",
      warningText: "Final billing reminder before access may be paused.",
      title: "Final reminder before access is paused.",
      paragraphs: [
        "Hi %FIRSTNAME%,",
        "We still have not been able to process your Positives payment.",
        "If your payment details are not updated soon, your membership access may be paused.",
      ],
      cta: { label: "Fix Billing", href: "%BILLING_LINK%" },
    }),
  },
  {
    name: "POS C05-E01 PM Upgrade Confirmation",
    html: buildTemplate({
      preview: "Your membership now includes additional access.",
      kicker: "Plan updated",
      title: "Your Positives plan has been upgraded.",
      paragraphs: [
        "Hi %FIRSTNAME%,",
        "Your membership has moved from %PREVIOUS_TIER% to %NEW_TIER%.",
        "Your new access is ready now inside the member platform.",
      ],
      cta: { label: "Open Positives", href: "https://positives.life/today" },
    }),
  },
  {
    name: "POS C05-E02 PM Downgrade Confirmation",
    html: buildTemplate({
      preview: "Here’s a summary of your updated membership.",
      kicker: "Plan updated",
      title: "Your Positives plan has changed.",
      paragraphs: [
        "Hi %FIRSTNAME%,",
        "Your membership has moved from %PREVIOUS_TIER% to %NEW_TIER%.",
        "You can review your account any time inside Positives.",
      ],
      cta: { label: "Open Positives", href: "https://positives.life/account" },
    }),
  },
  {
    name: "POS C06-E01 PM Cancellation Confirmation",
    html: buildTemplate({
      preview: "Your access will remain available through your current billing period.",
      kicker: "Membership update",
      title: "Your membership has been canceled.",
      paragraphs: [
        "Hi %FIRSTNAME%,",
        "This email confirms that your Positives membership has been canceled.",
        "Your access will remain available through the rest of your current billing period.",
        "We’re grateful you were here. If you change your mind later, you’re always welcome back.",
      ],
      cta: { label: "Open Positives", href: "https://positives.life/account" },
    }),
  },
  {
    name: "POS C06-E02 PM Access Ending Soon",
    html: buildTemplate({
      preview: "A quick reminder before your membership access ends.",
      kicker: "Access ending soon",
      title: "Your Positives access ends soon.",
      paragraphs: [
        "Hi %FIRSTNAME%,",
        "Just a quick reminder that your Positives access will end soon.",
        "If you’d like to continue your membership without interruption, you can rejoin any time.",
      ],
      cta: { label: "Rejoin Positives", href: "https://positives.life/join" },
    }),
  },
  {
    name: "POS C08-E01 PM Welcome Back to Positives",
    html: buildTemplate({
      preview: "Your membership is active again. Welcome back.",
      kicker: "Welcome back",
      title: "Welcome back to Positives.",
      paragraphs: [
        "Hi %FIRSTNAME%,",
        "Your membership is active again, and we’re glad to have you back.",
        "Since you’ve been here before, there’s no need for a big restart. Just return to today’s practice and let the rhythm meet you there.",
      ],
      info: `
        <p style="margin:0;font-family:${BRAND.fontBody};font-size:13px;color:${BRAND.mutedFg};line-height:1.6;">
          Reactivated on <strong style="color:${BRAND.foreground};">%REACTIVATED_AT%</strong>
        </p>
      `,
      cta: { label: "Open Positives", href: "%LOGIN_LINK%" },
    }),
  },
  {
    name: "POS C08-E02 PM Here’s the Easiest Place to Resume",
    html: buildTemplate({
      preview: "Start with Today and resume from there.",
      kicker: "Resume gently",
      title: "Here’s the easiest place to resume.",
      paragraphs: [
        "Hi %FIRSTNAME%,",
        "If you’re wondering where to begin again, keep it very simple: start with Today.",
        "You can explore the weekly and monthly pieces after that, but today’s practice is the doorway back in.",
      ],
      cta: { label: "Go to Today", href: "%LOGIN_LINK%" },
    }),
  },
  {
    name: "POS C07-E01 PM Affiliate Welcome",
    html: buildTemplate({
      preview: "Your referral portal and share link are ready.",
      kicker: "Affiliate",
      title: "Welcome to the affiliate program.",
      paragraphs: [
        "Hi %FIRSTNAME%,",
        "Your referral link is ready to use whenever you share Positives.",
      ],
      info: `
        <p style="margin:0 0 6px;font-family:${BRAND.fontHeading};font-size:13px;font-weight:700;color:${BRAND.foreground};">Your referral link</p>
        <p style="margin:0;font-family:${BRAND.fontBody};font-size:13px;color:${BRAND.mutedFg};line-height:1.6;word-break:break-all;">%FIRSTPROMOTER_LINK%</p>
      `,
      cta: { label: "Open Affiliate Portal", href: "%FIRSTPROMOTER_PORTAL_URL%" },
    }),
  },
  {
    name: "POS C07-E02 AC Finish Your Payout Setup",
    html: buildTemplate({
      preview: "Add your payout details so commissions can be paid correctly.",
      kicker: "Affiliate follow-up",
      title: "Complete your payout setup.",
      paragraphs: [
        "Hi %FIRSTNAME%,",
        "Make sure your payout details are complete inside the affiliate portal.",
        "That will make it much easier for commissions to be handled cleanly once your referrals start coming in.",
      ],
      cta: { label: "Finish Setup", href: "%FIRSTPROMOTER_PORTAL_URL%" },
    }),
  },
  {
    name: "POS C07-E03 AC Your Link Is Ready to Share",
    html: buildTemplate({
      preview: "A quick reminder with your Positives referral link.",
      kicker: "Affiliate reminder",
      title: "Your referral link is ready to share.",
      paragraphs: [
        "Hi %FIRSTNAME%,",
        "Just a reminder that your Positives referral link is ready whenever you want to start sharing it.",
      ],
      info: `
        <p style="margin:0;font-family:${BRAND.fontBody};font-size:13px;color:${BRAND.mutedFg};line-height:1.6;word-break:break-all;">%FIRSTPROMOTER_LINK%</p>
      `,
      cta: { label: "Open Affiliate Portal", href: "%FIRSTPROMOTER_PORTAL_URL%" },
    }),
  },
  {
    name: "POS C09-E01 AC You're In, Here's Where to Start",
    html: buildTemplate({
      preview: "A simple way to use Positives well from day one.",
      kicker: "Orientation",
      title: "You’re in. Here’s where to start.",
      paragraphs: [
        "Hi %FIRSTNAME%,",
        "The simplest way to use Positives is this: start with Today, stay close to This Week, and let This Month give your practice a larger direction.",
        "You do not need to do everything. You just need to return.",
      ],
      bulletItems: ["Start with Today", "Stay close to This Week", "Let This Month guide the bigger rhythm"],
      cta: { label: "Go to Today", href: "https://positives.life/today" },
    }),
  },
  {
    name: "POS C09-E02 AC The Best Way to Use Positives",
    html: buildTemplate({
      preview: "Keep it simple: return daily, not perfectly.",
      kicker: "Orientation",
      title: "The easiest way to get value from Positives.",
      paragraphs: [
        "Hi %FIRSTNAME%,",
        "The best way to get value from Positives is not to do more. It’s to come back more consistently.",
        "Even a few quiet minutes with today’s practice can reset the tone of your day.",
        "If you miss a day, just return the next day. Positives is a practice, not a program to complete.",
      ],
      cta: { label: "Open Positives", href: "https://positives.life/today" },
    }),
  },
  {
    name: "POS C09-E03A AC Level 1 Orientation",
    html: buildTemplate({
      preview: "Daily practice, library access, and private reflection tools are ready.",
      kicker: "Membership orientation",
      title: "Make the most of your Positives membership.",
      paragraphs: [
        "Hi %FIRSTNAME%,",
        "Along with today’s practice, your membership gives you a growing library of past sessions and a private place to reflect as you go.",
        "If you haven’t explored those yet, that’s a great next step.",
      ],
      cta: { label: "Explore Your Library", href: "https://positives.life/library" },
    }),
  },
  {
    name: "POS C09-E03B AC Level 2 Orientation",
    html: buildTemplate({
      preview: "You can now join live member events and revisit replays.",
      kicker: "Events orientation",
      title: "Your events access is ready.",
      paragraphs: [
        "Hi %FIRSTNAME%,",
        "Your membership includes access to Positives events.",
        "That means you can join live sessions when they’re scheduled and return to replays when you want to revisit them.",
      ],
      cta: { label: "Open Events", href: "https://positives.life/events" },
    }),
  },
  {
    name: "POS C09-E03C AC Level 3 Orientation",
    html: buildTemplate({
      preview: "Your membership includes live coaching and replay access.",
      kicker: "Coaching orientation",
      title: "Your coaching access is ready.",
      paragraphs: [
        "Hi %FIRSTNAME%,",
        "Your membership includes live coaching access.",
        "When you’re ready, head into the coaching area to see what’s coming up and what you can revisit.",
      ],
      cta: { label: "Open Coaching", href: "https://positives.life/coaching" },
    }),
  },
  {
    name: "POS C10-A1 AC Keep the Practice Going",
    html: buildTemplate({
      preview: "Consistency matters more than intensity.",
      kicker: "Progression",
      title: "A simple way to keep your practice going.",
      paragraphs: [
        "Hi %FIRSTNAME%,",
        "You’re already doing the most important part: returning to the practice.",
        "The next step is not to do more all at once. It’s simply to keep the rhythm going and let the daily work compound.",
      ],
      cta: { label: "Return to Today", href: "https://positives.life/today" },
    }),
  },
  {
    name: "POS C10-A2 AC Add Live Events",
    html: buildTemplate({
      preview: "Live events can help you stay connected and engaged.",
      kicker: "Next level",
      title: "Want more support around the practice?",
      paragraphs: [
        "Hi %FIRSTNAME%,",
        "If you want more support around your Positives practice, the next best step is live event access.",
        "That gives you a way to stay connected to the work in a more active rhythm.",
      ],
      cta: { label: "See Membership + Events", href: "https://positives.life/join" },
    }),
  },
  {
    name: "POS C10-A3 AC Invitation to Upgrade",
    html: buildTemplate({
      preview: "Here’s what Membership + Events adds.",
      kicker: "Upgrade invitation",
      title: "If you’re ready for the next level of support.",
      paragraphs: [
        "Hi %FIRSTNAME%,",
        "If the daily practice is helping and you want a little more structure and support, Membership + Events is the natural next step.",
        "You can take a look any time and decide if it fits what you need right now.",
      ],
      cta: { label: "Explore the Next Level", href: "https://positives.life/join" },
    }),
  },
  {
    name: "POS C10-B1 AC You May Be Ready for More Support",
    html: buildTemplate({
      preview: "If events are helping, coaching may be the next fit.",
      kicker: "Coaching invitation",
      title: "You may be ready for more direct support.",
      paragraphs: [
        "Hi %FIRSTNAME%,",
        "If you’re already using the event side of Positives, you may be ready for a more direct layer of support.",
        "That’s where Coaching Circle comes in.",
      ],
      cta: { label: "See Coaching Circle", href: "https://positives.life/join" },
    }),
  },
  {
    name: "POS C10-B2 AC What Coaching Circle Adds",
    html: buildTemplate({
      preview: "Live coaching can help you stay closer to the work.",
      kicker: "Coaching invitation",
      title: "What Coaching Circle adds.",
      paragraphs: [
        "Hi %FIRSTNAME%,",
        "Coaching Circle is designed for members who want to go deeper with live support, direct guidance, and the accountability of returning in real time.",
        "If that feels like the right next step, you can explore it here.",
      ],
      cta: { label: "Explore Coaching Circle", href: "https://positives.life/join" },
    }),
  },
  {
    name: "POS R01-E01 PM Event Tomorrow",
    html: buildTemplate({
      preview: "Your Positives event is coming up tomorrow.",
      kicker: "Event reminder",
      title: "%NEXT_EVENT_TITLE% is tomorrow.",
      paragraphs: [
        "Hi %FIRSTNAME%,",
        "This is a quick reminder that your Positives event is coming up tomorrow.",
        "Come as you are. You’ll have the join link below when it’s time.",
      ],
      info: `
        <p style="margin:0 0 6px;font-family:${BRAND.fontHeading};font-size:13px;font-weight:700;color:${BRAND.foreground};">Session time</p>
        <p style="margin:0;font-family:${BRAND.fontBody};font-size:13px;color:${BRAND.mutedFg};line-height:1.6;">%NEXT_EVENT_STARTS_AT%</p>
      `,
      cta: { label: "Join Event", href: "%NEXT_EVENT_JOIN_URL%" },
    }),
  },
  {
    name: "POS R02-E01 PM Event Starting Soon",
    html: buildTemplate({
      preview: "Your Positives event starts soon.",
      kicker: "Starting soon",
      title: "%NEXT_EVENT_TITLE% starts soon.",
      paragraphs: [
        "Hi %FIRSTNAME%,",
        "Your Positives event starts in about an hour.",
        "Use the link below when you’re ready to join.",
      ],
      info: `
        <p style="margin:0 0 6px;font-family:${BRAND.fontHeading};font-size:13px;font-weight:700;color:${BRAND.foreground};">Session time</p>
        <p style="margin:0;font-family:${BRAND.fontBody};font-size:13px;color:${BRAND.mutedFg};line-height:1.6;">%NEXT_EVENT_STARTS_AT%</p>
      `,
      cta: { label: "Join Event", href: "%NEXT_EVENT_JOIN_URL%" },
    }),
  },
  {
    name: "POS R03-E01 PM Event Replay Ready",
    html: buildTemplate({
      preview: "The replay is ready when you are.",
      kicker: "Replay ready",
      title: "The replay is ready: %NEXT_EVENT_TITLE%.",
      paragraphs: [
        "Hi %FIRSTNAME%,",
        "The replay for %NEXT_EVENT_TITLE% is ready.",
        "If you missed the live session or want to revisit it, you can watch it now.",
      ],
      cta: { label: "Watch Replay", href: "%NEXT_EVENT_REPLAY_URL%" },
    }),
  },
  {
    name: "POS R04-E01 PM Coaching Tomorrow",
    html: buildTemplate({
      preview: "Your coaching session is coming up tomorrow.",
      kicker: "Coaching reminder",
      title: "%NEXT_EVENT_TITLE% is tomorrow.",
      paragraphs: [
        "Hi %FIRSTNAME%,",
        "This is a quick reminder that your Positives coaching session is coming up tomorrow.",
        "Bring whatever is most useful to work through. You don’t need to prepare anything perfectly.",
      ],
      info: `
        <p style="margin:0 0 6px;font-family:${BRAND.fontHeading};font-size:13px;font-weight:700;color:${BRAND.foreground};">Session time</p>
        <p style="margin:0;font-family:${BRAND.fontBody};font-size:13px;color:${BRAND.mutedFg};line-height:1.6;">%NEXT_EVENT_STARTS_AT%</p>
      `,
      cta: { label: "Join Coaching", href: "%NEXT_EVENT_JOIN_URL%" },
    }),
  },
  {
    name: "POS R05-E01 PM Coaching Starting Soon",
    html: buildTemplate({
      preview: "Your coaching session starts soon.",
      kicker: "Starting soon",
      title: "%NEXT_EVENT_TITLE% starts soon.",
      paragraphs: [
        "Hi %FIRSTNAME%,",
        "Your Positives coaching session starts in about an hour.",
        "Use the link below when you’re ready to join.",
      ],
      info: `
        <p style="margin:0 0 6px;font-family:${BRAND.fontHeading};font-size:13px;font-weight:700;color:${BRAND.foreground};">Session time</p>
        <p style="margin:0;font-family:${BRAND.fontBody};font-size:13px;color:${BRAND.mutedFg};line-height:1.6;">%NEXT_EVENT_STARTS_AT%</p>
      `,
      cta: { label: "Join Coaching", href: "%NEXT_EVENT_JOIN_URL%" },
    }),
  },
  {
    name: "POS R06-E01 PM Coaching Replay Ready",
    html: buildTemplate({
      preview: "The coaching replay is ready when you are.",
      kicker: "Replay ready",
      title: "The replay is ready: %NEXT_EVENT_TITLE%.",
      paragraphs: [
        "Hi %FIRSTNAME%,",
        "The replay for %NEXT_EVENT_TITLE% is ready.",
        "If you couldn’t attend live or want to review it again, you can watch it now.",
      ],
      cta: { label: "Watch Replay", href: "%NEXT_EVENT_REPLAY_URL%" },
    }),
  },
  {
    name: "POS C10-C1 AC Come Back to Today's Practice",
    html: buildTemplate({
      preview: "You do not need to catch up. Just return.",
      kicker: "Return",
      title: "Come back to today’s practice.",
      paragraphs: [
        "Hi %FIRSTNAME%,",
        "If you’ve been away for a bit, that’s okay.",
        "You do not need to catch up in Positives. The easiest way back in is simply to return to today’s practice.",
      ],
      cta: { label: "Return to Today", href: "https://positives.life/today" },
    }),
  },
  {
    name: "POS C10-C2 AC A Gentle Reset",
    html: buildTemplate({
      preview: "A few quiet minutes is enough to begin again.",
      kicker: "Return",
      title: "A gentle way to reset.",
      paragraphs: [
        "Hi %FIRSTNAME%,",
        "Sometimes the best reset is a very small one.",
        "You don’t need a perfect streak or a fresh start. You just need one honest step back into the practice.",
      ],
      cta: { label: "Open Positives", href: "https://positives.life/today" },
    }),
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
  const existing = await api("/templates?limit=250");
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
