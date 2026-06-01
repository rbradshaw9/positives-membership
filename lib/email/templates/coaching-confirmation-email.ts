import {
  B,
  ctaButton,
  emailHeader,
  emailWrapper,
  infoCard,
  transactionalEmailFooter,
} from "@/lib/email/brand";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// ─── Confirmation email ───────────────────────────────────────────────────────

export type CoachingConfirmationEmailInput = {
  recipientEmail: string;
  memberName: string | null;
  coachName: string;
  scheduledAt: string;       // human-readable, already in member's timezone
  durationMinutes: number;
  joinUrl: string;           // Zoom join URL when available
  cancelUrl: string;         // e.g. https://positives.life/account/coaching (cancel from there)
  calendarUrl?: string;
};

export function renderCoachingConfirmationEmail(
  input: CoachingConfirmationEmailInput
): { subject: string; html: string; text: string } {
  const safeName = escapeHtml(input.memberName || "there");
  const safeCoach = escapeHtml(input.coachName);
  const safeDate = escapeHtml(input.scheduledAt);
  const safeDuration = `${input.durationMinutes} minutes`;

  const subject = `Your coaching session with ${input.coachName} is confirmed`;
  const preheader = `${safeDate} · ${safeDuration} · Join on Zoom.`;

  const sessionCard = infoCard(`
    <p style="margin:0 0 10px;font-family:${B.fontBody};font-size:13px;font-weight:700;color:${B.foreground};text-transform:uppercase;letter-spacing:0.12em;">Session details</p>
    <p style="margin:0 0 8px;font-family:${B.fontHeading};font-size:18px;line-height:1.35;color:${B.foreground};font-weight:700;">Coaching Session with ${safeCoach}</p>
    <p style="margin:0 0 6px;font-family:${B.fontBody};font-size:14px;line-height:1.65;color:${B.mutedFg};">${safeDate}</p>
    <p style="margin:0;font-family:${B.fontBody};font-size:14px;line-height:1.65;color:${B.mutedFg};">Duration: ${safeDuration}</p>
  `);

  const html = emailWrapper(
    `
    ${emailHeader()}
    <tr>
      <td class="email-padding" style="background:${B.card};padding:38px 42px 18px;">
        <p style="margin:0 0 12px;font-family:${B.fontBody};font-size:12px;font-weight:700;color:${B.primary};text-transform:uppercase;letter-spacing:0.16em;">Session confirmed</p>
        <h1 class="email-h1" style="margin:0 0 16px;font-family:${B.fontHeading};font-size:24px;line-height:1.25;color:${B.foreground};letter-spacing:-0.02em;">You&rsquo;re booked, ${safeName}.</h1>
        <p style="margin:0;font-family:${B.fontBody};font-size:15px;line-height:1.75;color:${B.mutedFg};">Your coaching session is confirmed. When it&rsquo;s time, click the button below to join on Zoom.</p>
      </td>
    </tr>
    <tr>
      <td class="email-padding" style="background:${B.card};padding:12px 42px 18px;">${sessionCard}</td>
    </tr>
    <tr>
      <td class="email-padding" style="background:${B.card};padding:8px 42px 30px;">
        ${ctaButton("Join Zoom Session", input.joinUrl)}
        <p style="margin:18px 0 0;font-family:${B.fontBody};font-size:12px;line-height:1.7;color:${B.mutedFg};">
          Need to cancel? <a href="${input.cancelUrl}" style="color:${B.primary};font-weight:700;text-decoration:none;">Manage your session</a> from your coaching dashboard. Cancellations more than 24 hours in advance will restore your session credit.
          ${input.calendarUrl ? `<br><a href="${input.calendarUrl}" style="color:${B.primary};font-weight:700;text-decoration:none;">Download calendar invite</a>` : ""}
        </p>
      </td>
    </tr>
    ${transactionalEmailFooter()}
  `,
    preheader,
  );

  const text = [
    `You're booked, ${input.memberName || "there"}.`,
    "",
    `Coaching Session with ${input.coachName}`,
    input.scheduledAt,
    `Duration: ${safeDuration}`,
    "",
    `Join your Zoom session: ${input.joinUrl}`,
    input.calendarUrl ? `Calendar invite: ${input.calendarUrl}` : "",
    "",
    `Need to cancel? Visit ${input.cancelUrl} — cancellations 24+ hours in advance restore your session credit.`,
    "",
    `This confirmation was sent to ${input.recipientEmail}.`,
  ].join("\n");

  return { subject, html, text };
}

// ─── Cancellation email ───────────────────────────────────────────────────────

export type CoachingCancellationEmailInput = {
  recipientEmail: string;
  memberName: string | null;
  coachName: string;
  scheduledAt: string;
  sessionRestored: boolean;   // was the session credit returned?
};

export function renderCoachingCancellationEmail(
  input: CoachingCancellationEmailInput
): { subject: string; html: string; text: string } {
  const safeName = escapeHtml(input.memberName || "there");
  const safeCoach = escapeHtml(input.coachName);
  const safeDate = escapeHtml(input.scheduledAt);

  const subject = `Your coaching session has been canceled`;
  const preheader = input.sessionRestored
    ? "Your session credit has been returned to your balance."
    : "Your session has been canceled.";

  const noteCard = infoCard(`
    <p style="margin:0 0 10px;font-family:${B.fontBody};font-size:13px;font-weight:700;color:${B.foreground};text-transform:uppercase;letter-spacing:0.12em;">Canceled session</p>
    <p style="margin:0 0 8px;font-family:${B.fontHeading};font-size:16px;line-height:1.35;color:${B.foreground};font-weight:700;">Coaching Session with ${safeCoach}</p>
    <p style="margin:0 0 8px;font-family:${B.fontBody};font-size:14px;line-height:1.65;color:${B.mutedFg};">${safeDate}</p>
    <p style="margin:0;font-family:${B.fontBody};font-size:14px;line-height:1.65;color:${input.sessionRestored ? B.primary : B.mutedFg};font-weight:${input.sessionRestored ? "700" : "400"};">
      ${input.sessionRestored
        ? "✓ Your session credit has been returned to your balance."
        : "This session was within the 24-hour window — your credit was not restored."}
    </p>
  `);

  const html = emailWrapper(
    `
    ${emailHeader()}
    <tr>
      <td class="email-padding" style="background:${B.card};padding:38px 42px 18px;">
        <p style="margin:0 0 12px;font-family:${B.fontBody};font-size:12px;font-weight:700;color:${B.mutedFg};text-transform:uppercase;letter-spacing:0.16em;">Session canceled</p>
        <h1 class="email-h1" style="margin:0 0 16px;font-family:${B.fontHeading};font-size:24px;line-height:1.25;color:${B.foreground};letter-spacing:-0.02em;">Session canceled, ${safeName}.</h1>
        <p style="margin:0;font-family:${B.fontBody};font-size:15px;line-height:1.75;color:${B.mutedFg};">
          ${input.sessionRestored
            ? "Your session has been canceled and your session credit has been returned to your balance. Book again whenever you&rsquo;re ready."
            : "Your session has been canceled. Cancellations within 24 hours of the session do not restore the session credit."}
        </p>
      </td>
    </tr>
    <tr>
      <td class="email-padding" style="background:${B.card};padding:12px 42px 18px;">${noteCard}</td>
    </tr>
    <tr>
      <td class="email-padding" style="background:${B.card};padding:8px 42px 30px;">
        ${ctaButton("Book another session", "https://positives.life/account/coaching")}
      </td>
    </tr>
    ${transactionalEmailFooter()}
  `,
    preheader,
  );

  const text = [
    `Session canceled, ${input.memberName || "there"}.`,
    "",
    `Coaching Session with ${input.coachName}`,
    input.scheduledAt,
    "",
    input.sessionRestored
      ? "Your session credit has been returned to your balance."
      : "This session was within the 24-hour window — your credit was not restored.",
    "",
    "Book another session: https://positives.life/account/coaching",
    "",
    `This notification was sent to ${input.recipientEmail}.`,
  ].join("\n");

  return { subject, html, text };
}

// ─── Coach new booking notification ──────────────────────────────────────────

export type CoachBookingNotificationInput = {
  recipientEmail: string;  // coach's email
  coachName: string;
  memberName: string | null;
  memberEmail: string;
  scheduledAt: string;
  durationMinutes: number;
  memberIntake: string | null;
  sessionUrl: string;      // Positives booking detail URL
  joinUrl: string | null;  // Zoom join URL when available
  calendarUrl?: string;
};

export function renderCoachBookingNotificationEmail(
  input: CoachBookingNotificationInput
): { subject: string; html: string; text: string } {
  const safeMember = escapeHtml(input.memberName ?? "A member");
  const safeDate = escapeHtml(input.scheduledAt);
  const safeDuration = `${input.durationMinutes} minutes`;

  const subject = `New session booked — ${safeMember}, ${input.scheduledAt}`;
  const preheader = `${safeMember} has booked a coaching session with you.`;

  const detailsCard = infoCard(`
    <p style="margin:0 0 10px;font-family:${B.fontBody};font-size:13px;font-weight:700;color:${B.foreground};text-transform:uppercase;letter-spacing:0.12em;">Session details</p>
    <p style="margin:0 0 8px;font-family:${B.fontHeading};font-size:18px;line-height:1.35;color:${B.foreground};font-weight:700;">${safeMember}</p>
    <p style="margin:0 0 6px;font-family:${B.fontBody};font-size:14px;line-height:1.65;color:${B.mutedFg};">${safeDate}</p>
    <p style="margin:0 0 6px;font-family:${B.fontBody};font-size:14px;line-height:1.65;color:${B.mutedFg};">Duration: ${safeDuration}</p>
    <p style="margin:0;font-family:${B.fontBody};font-size:14px;line-height:1.65;color:${B.mutedFg};">Member email: ${escapeHtml(input.memberEmail)}</p>
  `);

  const intakeCard = input.memberIntake ? infoCard(`
    <p style="margin:0 0 10px;font-family:${B.fontBody};font-size:13px;font-weight:700;color:${B.foreground};text-transform:uppercase;letter-spacing:0.12em;">Pre-session notes from member</p>
    <p style="margin:0;font-family:${B.fontBody};font-size:14px;line-height:1.75;color:${B.mutedFg};">${escapeHtml(input.memberIntake)}</p>
  `) : "";

  const html = emailWrapper(
    `
    ${emailHeader()}
    <tr>
      <td class="email-padding" style="background:${B.card};padding:38px 42px 18px;">
        <p style="margin:0 0 12px;font-family:${B.fontBody};font-size:12px;font-weight:700;color:${B.primary};text-transform:uppercase;letter-spacing:0.16em;">New booking</p>
        <h1 class="email-h1" style="margin:0 0 16px;font-family:${B.fontHeading};font-size:24px;line-height:1.25;color:${B.foreground};letter-spacing:-0.02em;">You have a new session, ${escapeHtml(input.coachName.split(" ")[0])}.</h1>
        <p style="margin:0;font-family:${B.fontBody};font-size:15px;line-height:1.75;color:${B.mutedFg};">${safeMember} has booked a session with you. Check the details below and be ready to join at the scheduled time.</p>
      </td>
    </tr>
    <tr>
      <td class="email-padding" style="background:${B.card};padding:12px 42px 18px;">${detailsCard}</td>
    </tr>
    ${intakeCard ? `<tr><td class="email-padding" style="background:${B.card};padding:0 42px 18px;">${intakeCard}</td></tr>` : ""}
    <tr>
      <td class="email-padding" style="background:${B.card};padding:8px 42px 30px;">
        ${ctaButton(input.joinUrl ? "Join Zoom Session" : "View Session Details", input.joinUrl ?? input.sessionUrl)}
        <p style="margin:18px 0 0;font-family:${B.fontBody};font-size:12px;line-height:1.7;color:${B.mutedFg};">
          Booking details: <a href="${input.sessionUrl}" style="color:${B.primary};font-weight:700;text-decoration:none;">Open in Positives</a>
          ${input.calendarUrl ? `<br><a href="${input.calendarUrl}" style="color:${B.primary};font-weight:700;text-decoration:none;">Download calendar invite</a>` : ""}
        </p>
      </td>
    </tr>
    ${transactionalEmailFooter()}
  `,
    preheader,
  );

  const text = [
    `You have a new session, ${input.coachName}.`,
    "",
    `Member: ${input.memberName ?? "A member"} (${input.memberEmail})`,
    `When: ${input.scheduledAt}`,
    `Duration: ${safeDuration}`,
    "",
    input.memberIntake ? `Pre-session notes:\n${input.memberIntake}` : "No pre-session notes.",
    "",
    input.joinUrl ? `Join Zoom session: ${input.joinUrl}` : `Session details: ${input.sessionUrl}`,
    input.joinUrl ? `Booking details: ${input.sessionUrl}` : "",
    input.calendarUrl ? `Calendar invite: ${input.calendarUrl}` : "",
  ].join("\n");

  return { subject, html, text };
}
