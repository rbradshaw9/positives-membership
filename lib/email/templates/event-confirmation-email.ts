import {
  B,
  ctaButton,
  emailHeader,
  emailWrapper,
  infoCard,
  transactionalEmailFooter,
} from "@/lib/email/brand";

export type EventConfirmationEmailInput = {
  recipientEmail: string;
  attendeeName: string | null;
  eventTitle: string;
  eventDate: string;
  eventLocation: string;
  registrationLabel: string;
  attendeeNumber: string;
  securityCode: string;
  actionUrl: string;
  calendarUrl: string;
};

export type EventConfirmationEmail = {
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

export function renderEventConfirmationEmail(input: EventConfirmationEmailInput): EventConfirmationEmail {
  const safeTitle = escapeHtml(input.eventTitle);
  const safeName = escapeHtml(input.attendeeName || "there");
  const subject = `Your event confirmation: ${input.eventTitle}`;
  const preheader = `${input.eventTitle} is confirmed. Keep this email handy for check-in.`;
  const details = infoCard(`
    <p style="margin:0 0 10px;font-family:${B.fontBody};font-size:13px;font-weight:700;color:${B.foreground};text-transform:uppercase;letter-spacing:0.12em;">Event details</p>
    <p style="margin:0 0 8px;font-family:${B.fontHeading};font-size:18px;line-height:1.35;color:${B.foreground};font-weight:700;">${safeTitle}</p>
    <p style="margin:0 0 8px;font-family:${B.fontBody};font-size:14px;line-height:1.65;color:${B.mutedFg};">${escapeHtml(input.eventDate)}</p>
    <p style="margin:0;font-family:${B.fontBody};font-size:14px;line-height:1.65;color:${B.mutedFg};">${escapeHtml(input.eventLocation)}</p>
  `);
  const ticketDetails = infoCard(`
    <p style="margin:0 0 10px;font-family:${B.fontBody};font-size:13px;font-weight:700;color:${B.foreground};text-transform:uppercase;letter-spacing:0.12em;">Check-in details</p>
    <p style="margin:0 0 8px;font-family:${B.fontBody};font-size:14px;line-height:1.65;color:${B.mutedFg};">Registration: <strong style="color:${B.foreground};">${escapeHtml(input.registrationLabel)}</strong></p>
    <p style="margin:0 0 8px;font-family:${B.fontBody};font-size:14px;line-height:1.65;color:${B.mutedFg};">Attendee: <strong style="color:${B.foreground};">${escapeHtml(input.attendeeName || "Registered attendee")}</strong></p>
    <p style="margin:0 0 8px;font-family:${B.fontBody};font-size:14px;line-height:1.65;color:${B.mutedFg};">Attendee number: <strong style="color:${B.foreground};">${escapeHtml(input.attendeeNumber)}</strong></p>
    <p style="margin:0;font-family:${B.fontBody};font-size:14px;line-height:1.65;color:${B.mutedFg};">Security code: <strong style="color:${B.foreground};font-family:${B.fontHeading};letter-spacing:0.08em;">${escapeHtml(input.securityCode)}</strong></p>
  `);

  const html = emailWrapper(
    `
    ${emailHeader()}
    <tr>
      <td class="email-padding" style="background:${B.card};padding:38px 42px 18px;">
        <p style="margin:0 0 12px;font-family:${B.fontBody};font-size:12px;font-weight:700;color:${B.primary};text-transform:uppercase;letter-spacing:0.16em;">Event confirmation</p>
        <h1 class="email-h1" style="margin:0 0 16px;font-family:${B.fontHeading};font-size:24px;line-height:1.25;color:${B.foreground};letter-spacing:-0.02em;">You&rsquo;re confirmed, ${safeName}.</h1>
        <p style="margin:0;font-family:${B.fontBody};font-size:15px;line-height:1.75;color:${B.mutedFg};">Your spot is saved. Keep this email handy for check-in, and come back to the event page for the live link, replay, or updates.</p>
      </td>
    </tr>
    <tr>
      <td class="email-padding" style="background:${B.card};padding:12px 42px 18px;">${details}</td>
    </tr>
    <tr>
      <td class="email-padding" style="background:${B.card};padding:0 42px 20px;">${ticketDetails}</td>
    </tr>
    <tr>
      <td class="email-padding" style="background:${B.card};padding:8px 42px 30px;">
        ${ctaButton("View event", input.actionUrl)}
        <p style="margin:18px 0 0;font-family:${B.fontBody};font-size:12px;line-height:1.7;color:${B.mutedFg};">
          Add it to your calendar: <a href="${input.calendarUrl}" style="color:${B.primary};font-weight:700;text-decoration:none;">Download calendar file</a>
        </p>
      </td>
    </tr>
    ${transactionalEmailFooter()}
  `,
    preheader,
  );

  const text = [
    `You're confirmed for ${input.eventTitle}.`,
    "",
    input.eventDate,
    input.eventLocation,
    "",
    `Registration: ${input.registrationLabel}`,
    `Attendee: ${input.attendeeName || "Registered attendee"}`,
    `Attendee number: ${input.attendeeNumber}`,
    `Security code: ${input.securityCode}`,
    "",
    `View event: ${input.actionUrl}`,
    `Calendar: ${input.calendarUrl}`,
    "",
    `This event confirmation was sent to ${input.recipientEmail}.`,
  ].join("\n");

  return { subject, html, text };
}
