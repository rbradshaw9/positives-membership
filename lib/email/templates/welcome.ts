/**
 * lib/email/templates/welcome.ts
 *
 * Welcome email sent immediately after a successful L1 checkout.
 * Triggered from the Stripe webhook: checkout.session.completed
 */

export type WelcomeEmailData = {
  firstName: string;
  loginUrl: string;
};

export function welcomeEmailHtml({ firstName, loginUrl }: WelcomeEmailData): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to Positives</title>
</head>
<body style="margin:0;padding:0;background:#FAFAF8;font-family:'Georgia',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FAFAF8;padding:48px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 2px 24px rgba(18,20,23,0.06);">

          <!-- Header -->
          <tr>
            <td style="background:#121417;padding:36px 48px;text-align:center;">
              <p style="margin:0;font-family:'Georgia',serif;font-size:22px;font-weight:700;color:#FAFAF8;letter-spacing:0.06em;text-transform:uppercase;">POSITIVES</p>
              <p style="margin:8px 0 0;font-size:13px;color:#9AA0A8;letter-spacing:0.08em;text-transform:uppercase;">by Dr. Paul</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:48px 48px 36px;">
              <p style="margin:0 0 24px;font-size:28px;color:#121417;line-height:1.3;font-weight:700;">
                Welcome, ${firstName}.
              </p>
              <p style="margin:0 0 20px;font-size:16px;color:#4A4E57;line-height:1.7;">
                You've just made a decision that your future self will thank you for. Positives is a daily practice — not a passive program. Each morning you'll receive a message from Dr. Paul to anchor your mindset before the day begins.
              </p>
              <p style="margin:0 0 32px;font-size:16px;color:#4A4E57;line-height:1.7;">
                Your first daily audio is waiting for you inside.
              </p>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#121417;border-radius:9999px;padding:0;">
                    <a href="${loginUrl}" style="display:inline-block;padding:16px 36px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:15px;font-weight:600;color:#FAFAF8;text-decoration:none;letter-spacing:0.02em;">
                      Start Your Practice →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 48px;">
              <hr style="border:none;border-top:1px solid #EDEAE5;margin:0;" />
            </td>
          </tr>

          <!-- What to expect -->
          <tr>
            <td style="padding:32px 48px;">
              <p style="margin:0 0 16px;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#9AA0A8;font-family:'Helvetica Neue',Arial,sans-serif;">What to expect</p>
              <table cellpadding="0" cellspacing="0" width="100%">
                ${[
                  ["Daily Audio", "A short, powerful message from Dr. Paul to start your day."],
                  ["Weekly Practice", "A guiding principle each week to carry into your life."],
                  ["Monthly Theme", "A deeper focus area to work on throughout the month."],
                ].map(([title, desc]) => `
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #F4F1ED;">
                    <p style="margin:0;font-size:14px;font-weight:600;color:#121417;">${title}</p>
                    <p style="margin:4px 0 0;font-size:13px;color:#9AA0A8;line-height:1.5;">${desc}</p>
                  </td>
                </tr>`).join("")}
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#F7F4F0;padding:24px 48px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#B0A89E;line-height:1.6;">
                You're receiving this because you joined Positives.<br />
                Questions? Reply to this email — a real human will respond.<br />
                <a href="https://positives.com/account" style="color:#B0A89E;">Manage your account</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function welcomeEmailText({ firstName, loginUrl }: WelcomeEmailData): string {
  return `Welcome to Positives, ${firstName}.

You've made a decision that your future self will thank you for.

Your first daily audio is waiting:
${loginUrl}

What to expect:
- Daily Audio: A short, powerful message from Dr. Paul each morning
- Weekly Practice: A guiding principle to carry into your week
- Monthly Theme: A deeper focus area for the month

Questions? Just reply to this email.

— The Positives Team`;
}
