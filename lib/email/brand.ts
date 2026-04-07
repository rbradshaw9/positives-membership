/**
 * lib/email/brand.ts
 *
 * Shared inline-CSS brand tokens for all email templates.
 * Email clients don't load external CSS or Google Fonts — everything must be
 * inlined. Web-safe fallbacks are chosen to match the Positives visual feel.
 *
 * Tokens sourced from .agents/skills/brand-identity/resources/design-tokens.json
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

  // Shadows — email-safe (not all clients render box-shadow, used sparingly)
  shadow: "0 4px 24px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04)",
} as const;

/** Shared email wrapper — provides consistent outer container for all templates. */
export function emailWrapper(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background:${B.background};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${B.background};min-height:100vh;">
    <tr>
      <td align="center" style="padding:40px 16px 56px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
          ${content}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Standard email header with gradient bar and wordmark. */
export function emailHeader(): string {
  return `
  <!-- Header -->
  <tr>
    <td style="background:${B.gradient};border-radius:${B.radius} ${B.radius} 0 0;padding:28px 40px;text-align:center;">
      <p style="margin:0;font-family:${B.fontHeading};font-size:22px;font-weight:700;color:#FFFFFF;letter-spacing:0.04em;text-transform:uppercase;line-height:1;">POSITIVES</p>
      <p style="margin:6px 0 0;font-family:${B.fontBody};font-size:11px;color:rgba(255,255,255,0.75);letter-spacing:0.12em;text-transform:uppercase;">by Dr. Paul</p>
    </td>
  </tr>`;
}

/** Standard email footer with unsubscribe/manage link. */
export function emailFooter(accountUrl = "https://positives.life/account"): string {
  return `
  <!-- Footer -->
  <tr>
    <td style="background:${B.muted};border-radius:0 0 ${B.radius} ${B.radius};padding:20px 40px;text-align:center;">
      <p style="margin:0;font-family:${B.fontBody};font-size:11px;color:${B.mutedFg};line-height:1.6;">
        You're receiving this because you're a Positives member.<br />
        Questions? Reply to this email — a real human will respond.<br />
        <a href="${accountUrl}" style="color:${B.primary};text-decoration:none;">Manage your account</a>
      </p>
    </td>
  </tr>`;
}

/** Primary pill CTA button — matches btn-primary class. */
export function ctaButton(label: string, url: string): string {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td style="background:${B.gradient};border-radius:${B.radiusPill};mso-padding-alt:0;">
        <a href="${url}" style="display:inline-block;padding:14px 32px;font-family:${B.fontBody};font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;letter-spacing:0.01em;white-space:nowrap;">${label}</a>
      </td>
    </tr>
  </table>`;
}

/** Divider line matching border color. */
export function divider(): string {
  return `<tr><td style="padding:0 40px;"><hr style="border:none;border-top:1px solid ${B.border};margin:0;" /></td></tr>`;
}
