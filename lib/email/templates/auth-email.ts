import {
  B,
  ctaButton,
  emailHeader,
  emailWrapper,
  infoCard,
  transactionalEmailFooter,
} from "@/lib/email/brand";

type AuthEmailAction =
  | "signup"
  | "magiclink"
  | "recovery"
  | "invite"
  | "email_change"
  | string;

export type AuthEmailTemplateInput = {
  actionType: AuthEmailAction;
  actionUrl: string;
  email: string;
  code?: string | null;
};

export type AuthEmailTemplate = {
  subject: string;
  html: string;
  text: string;
};

function copyForAction(actionType: AuthEmailAction) {
  switch (actionType) {
    case "recovery":
      return {
        subject: "Reset your Positives password",
        preheader: "Use this secure link to reset your Positives password.",
        heading: "Reset your password",
        intro:
          "Use the secure link below to choose a new password for your Positives account.",
        button: "Reset password",
        detail:
          "If you did not request this, you can safely ignore this email. Your password will not change unless this link is used.",
      };
    case "invite":
      return {
        subject: "You have been invited to Positives",
        preheader: "Accept your invitation and begin your Positives practice.",
        heading: "Your Positives invitation is ready",
        intro:
          "Use the secure link below to accept your invitation and begin your daily practice.",
        button: "Accept invitation",
        detail:
          "This link is unique to your email address. If you were not expecting an invitation, you can safely ignore this email.",
      };
    case "signup":
      return {
        subject: "Confirm your Positives account",
        preheader: "Confirm your email and start using Positives.",
        heading: "Confirm your email",
        intro:
          "Use the secure link below to confirm your email and start using Positives.",
        button: "Confirm email",
        detail:
          "This keeps your account secure and makes sure we are sending account messages to the right place.",
      };
    case "email_change":
      return {
        subject: "Confirm your Positives email change",
        preheader: "Use this secure link to confirm your email change.",
        heading: "Confirm your email change",
        intro:
          "Use the secure link below to confirm this email address for your Positives account.",
        button: "Confirm email change",
        detail:
          "If you did not request this change, do not click the link and contact support.",
      };
    case "magiclink":
    default:
      return {
        subject: "Your Positives sign-in link",
        preheader: "Use this secure link to continue to your practice.",
        heading: "Continue to your practice",
        intro:
          "Use the secure link below to sign in to Positives and continue your daily practice.",
        button: "Sign in to Positives",
        detail:
          "If you did not request this link, you can safely ignore this email. The link will expire automatically.",
      };
  }
}

export function renderAuthEmail(input: AuthEmailTemplateInput): AuthEmailTemplate {
  const copy = copyForAction(input.actionType);
  const codeCard = input.code
    ? infoCard(`
        <p style="margin:0 0 8px;font-family:${B.fontBody};font-size:12px;color:${B.mutedFg};font-weight:700;text-transform:uppercase;letter-spacing:0.12em;">Security code</p>
        <p style="margin:0;font-family:'SFMono-Regular',Consolas,'Liberation Mono',monospace;font-size:28px;font-weight:800;letter-spacing:0.18em;color:${B.foreground};">${input.code}</p>
        <p style="margin:10px 0 0;font-family:${B.fontBody};font-size:12px;line-height:1.6;color:${B.mutedFg};">You can use this code if your email app has trouble opening the button.</p>
      `)
    : "";

  const html = emailWrapper(
    `
    ${emailHeader()}
    <tr>
      <td class="email-padding" style="background:${B.card};padding:38px 42px 18px;">
        <p style="margin:0 0 12px;font-family:${B.fontBody};font-size:12px;font-weight:700;color:${B.primary};text-transform:uppercase;letter-spacing:0.16em;">Secure account access</p>
        <h1 class="email-h1" style="margin:0 0 16px;font-family:${B.fontHeading};font-size:24px;line-height:1.2;color:${B.foreground};letter-spacing:-0.02em;">${copy.heading}</h1>
        <p style="margin:0;font-family:${B.fontBody};font-size:15px;line-height:1.75;color:${B.mutedFg};">${copy.intro}</p>
      </td>
    </tr>
    <tr>
      <td class="email-padding" style="background:${B.card};padding:14px 42px 28px;">
        ${ctaButton(copy.button, input.actionUrl)}
      </td>
    </tr>
    ${
      codeCard
        ? `<tr><td class="email-padding" style="background:${B.card};padding:0 42px 26px;">${codeCard}</td></tr>`
        : ""
    }
    <tr>
      <td class="email-padding" style="background:${B.card};padding:0 42px 36px;">
        <p style="margin:0;font-family:${B.fontBody};font-size:13px;line-height:1.7;color:${B.mutedFg};">${copy.detail}</p>
        <p style="margin:18px 0 0;font-family:${B.fontBody};font-size:12px;line-height:1.6;color:#A1A1AA;">Having trouble with the button? Copy and paste this link into your browser:<br /><span style="word-break:break-all;color:${B.mutedFg};">${input.actionUrl}</span></p>
      </td>
    </tr>
    ${transactionalEmailFooter()}
  `,
    copy.preheader,
  );

  const text = [
    copy.heading,
    "",
    copy.intro,
    "",
    input.actionUrl,
    "",
    input.code ? `Security code: ${input.code}` : "",
    input.code ? "" : "",
    copy.detail,
    "",
    `This secure email was sent to ${input.email}.`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    subject: copy.subject,
    html,
    text,
  };
}
