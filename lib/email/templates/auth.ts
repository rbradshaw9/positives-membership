import {
  B,
  ctaButton,
  divider,
  emailHeader,
  emailWrapper,
  infoCard,
  transactionalEmailFooter,
} from "../brand";

export type AuthEmailKind =
  | "magic_link"
  | "recovery"
  | "invite"
  | "email_change_current"
  | "email_change_new";

type AuthEmailTemplateData = {
  kind: AuthEmailKind;
  firstName: string;
  confirmUrl: string;
  code?: string;
};

function getTemplateCopy(kind: AuthEmailKind) {
  switch (kind) {
    case "recovery":
      return {
        eyebrow: "Password reset",
        heading: "Reset your password",
        intro:
          "Use the secure link below to choose a new password and get back to your practice.",
        cta: "Choose a new password →",
        outro:
          "If you didn’t ask to reset your password, you can ignore this email.",
      };
    case "invite":
      return {
        eyebrow: "Invitation",
        heading: "You’re invited to Positives",
        intro:
          "Use the secure link below to accept your invitation and step into the Positives practice.",
        cta: "Accept invitation →",
        outro:
          "If this invitation wasn’t meant for you, you can ignore this email.",
      };
    case "email_change_current":
      return {
        eyebrow: "Email change",
        heading: "Confirm your current email",
        intro:
          "We received a request to change the email address on your Positives account. Confirm your current email to continue.",
        cta: "Confirm current email →",
        outro:
          "If you didn’t request this change, do not click the button and contact support.",
      };
    case "email_change_new":
      return {
        eyebrow: "Email change",
        heading: "Confirm your new email",
        intro:
          "Confirm this email address to finish updating your Positives account.",
        cta: "Confirm new email →",
        outro:
          "If you didn’t request this change, you can ignore this email.",
      };
    case "magic_link":
    default:
      return {
        eyebrow: "Sign in",
        heading: "Your sign-in link is ready",
        intro:
          "Use the secure link below to sign in to Positives and return to your practice.",
        cta: "Sign in to Positives →",
        outro:
          "For security, this link should only be used by you and will expire automatically.",
      };
  }
}

export function authEmailHtml({
  kind,
  firstName,
  confirmUrl,
  code,
}: AuthEmailTemplateData): string {
  const copy = getTemplateCopy(kind);

  const body = `
    ${emailHeader()}

    <tr>
      <td style="background:${B.card};padding:40px 40px 30px;">
        <p style="margin:0 0 8px;font-family:${B.fontBody};font-size:11px;font-weight:700;color:${B.primary};letter-spacing:0.12em;text-transform:uppercase;">${copy.eyebrow}</p>
        <h1 style="margin:0 0 18px;font-family:${B.fontHeading};font-size:28px;font-weight:700;color:${B.foreground};line-height:1.2;letter-spacing:-0.02em;">
          ${copy.heading}, ${firstName}.
        </h1>
        <p style="margin:0 0 16px;font-family:${B.fontBody};font-size:15px;color:${B.mutedFg};line-height:1.65;">
          ${copy.intro}
        </p>
        <div style="margin:28px 0 18px;">
          ${ctaButton(copy.cta, confirmUrl)}
        </div>
        <p style="margin:0;font-family:${B.fontBody};font-size:13px;color:${B.mutedFg};line-height:1.6;">
          ${copy.outro}
        </p>
        <div style="height:20px;"></div>
        ${infoCard(`
          <p style="margin:0 0 6px;font-family:${B.fontHeading};font-size:13px;font-weight:700;color:${B.foreground};letter-spacing:-0.01em;">
            Security note
          </p>
          <p style="margin:0;font-family:${B.fontBody};font-size:13px;color:${B.mutedFg};line-height:1.6;">
            Open this link on the same device where you want to sign in. If the button doesn&apos;t work, you can paste this URL into your browser:<br />
            <span style="word-break:break-all;color:${B.foreground};">${confirmUrl}</span>
          </p>
          ${code ? `<p style="margin:12px 0 0;font-family:${B.fontBody};font-size:12px;color:${B.mutedFg};line-height:1.6;">Reference code: <strong style="color:${B.foreground};">${code}</strong></p>` : ""}
        `)}
      </td>
    </tr>

    ${divider()}
    ${transactionalEmailFooter()}
  `;

  return emailWrapper(
    body,
    kind === "recovery"
      ? "Reset your Positives password."
      : "Your secure Positives sign-in link is ready."
  );
}

export function authEmailText({
  kind,
  firstName,
  confirmUrl,
  code,
}: AuthEmailTemplateData): string {
  const copy = getTemplateCopy(kind);

  return `${copy.heading}, ${firstName}.

${copy.intro}

${copy.cta}
${confirmUrl}

${copy.outro}
${code ? `\nReference code: ${code}\n` : ""}

— The Positives Team
positives.life`;
}
