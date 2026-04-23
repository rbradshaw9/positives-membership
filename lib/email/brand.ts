/**
 * lib/email/brand.ts
 *
 * Shared inline-CSS brand tokens for all email templates.
 * Email clients don't load external CSS or Google Fonts — everything must be
 * inlined. Web-safe fallbacks are chosen to match the Positives visual feel.
 *
 * Tokens sourced from .agents/skills/brand-identity/resources/design-tokens.json
 *
 * Deliverability upgrades:
 * - emailPreheader()   — hidden inbox preview text (huge open-rate impact)
 * - Mobile CSS in <head> — works in Gmail App, Apple Mail, Outlook iOS
 * - memberEmailFooter() — CAN-SPAM address + member unsubscribe link
 * - transactionalEmailFooter() — support/account footer without unsubscribe
 * - infoCard()        — branded highlight block for key info
 */

export const B = {
  // Colors
  primary: "#2EC4B6",
  primaryHover: "#1A9E92",
  secondary: "#44A8D8",
  foreground: "#09090B",
  background: "#FAFAFA",
  card: "#FFFFFF",
  muted: "#F4F4F5",
  mutedFg: "#52525B",
  border: "#E4E4E7",
  surfaceDark: "#0A0A0A",
  surfaceShell: "#111215",

  // Gradients (inline-safe linear-gradient)
  gradient: "linear-gradient(135deg, #2EC4B6 0%, #44A8D8 100%)",

  // Typography — email-safe stacks matching brand fonts
  fontHeading: "'Montserrat', 'Helvetica Neue', Arial, sans-serif",
  fontBody: "'Poppins', 'Helvetica Neue', Arial, sans-serif",

  // Radii
  radiusSm: "12px",
  radius: "16px",
  radiusLg: "20px",
  radiusPill: "9999px",

  // Shadows (used sparingly — not all clients render box-shadow)
  shadow: "0 4px 24px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04)",
} as const;

/** Physical mailing address — CAN-SPAM requires this in every email. */
const MAILING_ADDRESS =
  process.env.EMAIL_MAILING_ADDRESS ?? "Positives · PO Box 1234 · Salt Lake City, UT 84101";

/**
 * Preheader text — the snippet shown in inbox preview before the email is opened.
 * Keep under 85 chars. HUGE open-rate impact.
 * Padding characters prevent inbox clients bleeding in body text after the snippet.
 */
export function emailPreheader(text: string): string {
  const padding = "&zwnj;&nbsp;".repeat(40);
  return `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${text} ${padding}</div>`;
}

/** Shared email wrapper — consistent outer container with mobile CSS + preheader. */
export function emailWrapper(content: string, preheader = ""): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
  <style>
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; }
      .email-padding { padding-left: 20px !important; padding-right: 20px !important; }
      .email-h1 { font-size: 20px !important; }
      .cta-btn { display: block !important; text-align: center !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:${B.background};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  ${preheader ? emailPreheader(preheader) : ""}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
    style="background:${B.background};min-height:100vh;">
    <tr>
      <td align="center" style="padding:40px 16px 56px;">
        <table role="presentation" class="email-container" width="100%" cellpadding="0"
          cellspacing="0" border="0" style="max-width:580px;">
          ${content}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Standard email header — gradient bar + wordmark + accent line. */
export function emailHeader(): string {
  return `
  <!-- Header -->
  <tr>
    <td style="background:${B.gradient};border-radius:${B.radius} ${B.radius} 0 0;padding:32px 40px;text-align:center;">
      <p style="margin:0;font-family:${B.fontHeading};font-size:24px;font-weight:800;color:#FFFFFF;letter-spacing:0.06em;text-transform:uppercase;line-height:1;">POSITIVES</p>
    </td>
  </tr>
  <!-- Thin shimmer accent bar -->
  <tr>
    <td style="background:linear-gradient(90deg,#2EC4B6,#44A8D8,#2EC4B6);height:3px;padding:0;font-size:0;line-height:0;">&nbsp;</td>
  </tr>`;
}

/**
 * Standard email footer — CAN-SPAM compliant.
 * Includes: account link, unsubscribe link, physical mailing address.
 * Required by Gmail/Yahoo bulk sender rules (Feb 2024).
 */
export function memberEmailFooter(
  accountUrl = "https://positives.life/account",
  unsubscribeUrl?: string,
): string {
  return `
  <!-- Footer -->
  <tr>
    <td style="background:${B.muted};border-radius:0 0 ${B.radius} ${B.radius};padding:24px 40px;text-align:center;">
      <p style="margin:0 0 10px;font-family:${B.fontBody};font-size:12px;color:${B.mutedFg};line-height:1.7;">
        You&rsquo;re receiving this because you&rsquo;re a Positives member.<br />
        Questions? Reply to this email &mdash; a real human will respond.
      </p>
      <p style="margin:0 0 10px;font-family:${B.fontBody};font-size:11px;color:${B.mutedFg};line-height:1.6;">
        <a href="${accountUrl}" style="color:${B.primary};text-decoration:none;font-weight:600;">Manage account</a>
        ${
          unsubscribeUrl
            ? `&nbsp;&middot;&nbsp;
        <a href="${unsubscribeUrl}" style="color:${B.mutedFg};text-decoration:underline;">Unsubscribe</a>`
            : ""
        }
      </p>
      <p style="margin:0;font-family:${B.fontBody};font-size:10px;color:#A1A1AA;line-height:1.5;">
        ${MAILING_ADDRESS}
      </p>
    </td>
  </tr>`;
}

export function transactionalEmailFooter(accountUrl = "https://positives.life/account"): string {
  return `
  <!-- Footer -->
  <tr>
    <td style="background:${B.muted};border-radius:0 0 ${B.radius} ${B.radius};padding:24px 40px;text-align:center;">
      <p style="margin:0 0 10px;font-family:${B.fontBody};font-size:12px;color:${B.mutedFg};line-height:1.7;">
        This email is about a secure action on your Positives account.<br />
        Questions? Reply to this email &mdash; a real human will respond.
      </p>
      <p style="margin:0 0 10px;font-family:${B.fontBody};font-size:11px;color:${B.mutedFg};line-height:1.6;">
        <a href="${accountUrl}" style="color:${B.primary};text-decoration:none;font-weight:600;">Manage account</a>
      </p>
      <p style="margin:0;font-family:${B.fontBody};font-size:10px;color:#A1A1AA;line-height:1.5;">
        ${MAILING_ADDRESS}
      </p>
    </td>
  </tr>`;
}

/** Primary pill CTA button. */
export function ctaButton(label: string, url: string): string {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td style="background:${B.gradient};border-radius:${B.radiusPill};mso-padding-alt:0;box-shadow:0 4px 16px rgba(46,196,182,0.32);">
        <a href="${url}" class="cta-btn"
          style="display:inline-block;padding:15px 36px;font-family:${B.fontBody};font-size:15px;font-weight:700;color:#FFFFFF;text-decoration:none;letter-spacing:0.02em;white-space:nowrap;">${label}</a>
      </td>
    </tr>
  </table>`;
}

/** Divider line. */
export function divider(): string {
  return `<tr><td style="padding:0 40px;"><hr style="border:none;border-top:1px solid ${B.border};margin:0;" /></td></tr>`;
}

/** Info card — muted background with primary left border. Good for stats, key details. */
export function infoCard(content: string): string {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
    <tr>
      <td style="background:${B.muted};border-radius:${B.radiusSm};border-left:4px solid ${B.primary};padding:18px 20px;">
        ${content}
      </td>
    </tr>
  </table>`;
}
