import {
  B,
  ctaButton,
  emailHeader,
  emailWrapper,
  infoCard,
  transactionalEmailFooter,
} from "@/lib/email/brand";

export type MembershipCancellationEmailInput = {
  recipientEmail: string;
  memberName: string | null;
  periodEndLabel: string | null;
  winbackCode: string;
  joinUrl: string;
};

export type MembershipCancellationEmail = {
  subject: string;
  html: string;
  text: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function renderMembershipCancellationEmail(
  input: MembershipCancellationEmailInput
): MembershipCancellationEmail {
  const safeName = escapeHtml(input.memberName || "there");
  const safeCode = escapeHtml(input.winbackCode);
  const subject = "Your Positives membership cancellation";
  const preheader = "Your membership is set to cancel. Here is a code if you want to return later.";
  const accessLine = input.periodEndLabel
    ? `Your access continues through ${input.periodEndLabel}.`
    : "Your access continues through the end of your current billing period.";

  const codeCard = infoCard(`
    <p style="margin:0 0 8px;font-family:${B.fontBody};font-size:13px;font-weight:700;color:${B.foreground};text-transform:uppercase;letter-spacing:0.12em;">Come back code</p>
    <p style="margin:0 0 8px;font-family:${B.fontHeading};font-size:24px;line-height:1.25;color:${B.foreground};font-weight:800;letter-spacing:0.08em;">${safeCode}</p>
    <p style="margin:0;font-family:${B.fontBody};font-size:14px;line-height:1.65;color:${B.mutedFg};">Use this at checkout for 50% off if you decide Positives is right for you again.</p>
  `);

  const html = emailWrapper(
    `
    ${emailHeader()}
    <tr>
      <td class="email-padding" style="background:${B.card};padding:38px 42px 18px;">
        <p style="margin:0 0 12px;font-family:${B.fontBody};font-size:12px;font-weight:700;color:${B.primary};text-transform:uppercase;letter-spacing:0.16em;">Membership update</p>
        <h1 class="email-h1" style="margin:0 0 16px;font-family:${B.fontHeading};font-size:24px;line-height:1.25;color:${B.foreground};letter-spacing:-0.02em;">Sorry to see you go, ${safeName}.</h1>
        <p style="margin:0;font-family:${B.fontBody};font-size:15px;line-height:1.75;color:${B.mutedFg};">${escapeHtml(accessLine)} Thank you for spending part of your practice with us.</p>
      </td>
    </tr>
    <tr>
      <td class="email-padding" style="background:${B.card};padding:12px 42px 18px;">${codeCard}</td>
    </tr>
    <tr>
      <td class="email-padding" style="background:${B.card};padding:8px 42px 30px;">
        ${ctaButton("Join again", input.joinUrl)}
      </td>
    </tr>
    ${transactionalEmailFooter()}
  `,
    preheader
  );

  const text = [
    `Sorry to see you go, ${input.memberName || "there"}.`,
    "",
    accessLine,
    "",
    `Come back code: ${input.winbackCode}`,
    `Use it at checkout for 50% off if you decide Positives is right for you again.`,
    "",
    `Join again: ${input.joinUrl}`,
    "",
    `This cancellation confirmation was sent to ${input.recipientEmail}.`,
  ].join("\n");

  return { subject, html, text };
}
