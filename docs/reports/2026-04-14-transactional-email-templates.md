# Positives Transactional Email Templates (ActiveCampaign + Postmark)

Date: 2026-04-14
Owner: Codex

These templates are designed for **ActiveCampaign Transactional Email (Postmark)**.
They use the Positives brand tone (calm, supportive, clear) and avoid marketing language.

## ActiveCampaign template names

These are the clean raw-HTML templates now created in ActiveCampaign:

- `Positives Transactional - Welcome`
- `Positives Transactional - Trial Started`
- `Positives Transactional - Payment Receipt`
- `Positives Transactional - Payment Failed Day 0`
- `Positives Transactional - Payment Failed Day 3`
- `Positives Transactional - Payment Failed Final`
- `Positives Transactional - Trial Ending`
- `Positives Transactional - Tier Changed`
- `Positives Transactional - Cancellation Confirmation`
- `Positives Transactional - Affiliate Welcome`

## Brand styling notes

- Warm ivory background
- Deep charcoal text
- Muted sage CTA
- Generous spacing and readable type

## Base styling tokens (inline)

- Background: `#F7F3EE`
- Card background: `#FFFFFF`
- Text: `#2F2A24`
- Muted text: `#6E665C`
- Accent: `#7B8A73`
- Button: `#6F7C6A`

---

## 1) Welcome

**Postmark tag:** `welcome`

**Subject:** Welcome to Positives

**HTML**
```html
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#F7F3EE;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F3EE;padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:92%;background:#FFFFFF;border-radius:16px;">
            <tr>
              <td style="padding:32px 40px 8px 40px;font-family:Georgia,'Times New Roman',serif;color:#2F2A24;font-size:24px;line-height:1.3;">
                Positives
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px 16px 40px;font-family:Georgia,'Times New Roman',serif;color:#2F2A24;font-size:28px;line-height:1.35;">
                Welcome, %FIRSTNAME%
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px 20px 40px;font-family:Helvetica,Arial,sans-serif;color:#2F2A24;font-size:16px;line-height:1.6;">
                We’re glad you’re here. Your plan is <strong>%PLAN_NAME%</strong>. Positives is a simple daily practice to help you reset, refocus, and build steady momentum.
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px 28px 40px;">
                <a href="%LOGIN_LINK%" style="display:inline-block;background:#6F7C6A;color:#FFFFFF;text-decoration:none;font-family:Helvetica,Arial,sans-serif;font-size:16px;font-weight:600;padding:12px 20px;border-radius:10px;">
                  Open Positives
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px 28px 40px;font-family:Helvetica,Arial,sans-serif;color:#6E665C;font-size:14px;line-height:1.6;">
                If you need anything, reply to this email and we’ll help.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

**Text**
```text
Welcome, %FIRSTNAME%

We’re glad you’re here. Your plan is %PLAN_NAME%. Positives is a simple daily practice to help you reset, refocus, and build steady momentum.

Open Positives: %LOGIN_LINK%

If you need anything, reply to this email and we’ll help.
```

---

## 2) Trial Started

**Postmark tag:** `trial_started`

**Subject:** Your Positives trial has started

**HTML**
```html
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#F7F3EE;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F3EE;padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:92%;background:#FFFFFF;border-radius:16px;">
            <tr>
              <td style="padding:32px 40px 8px 40px;font-family:Georgia,'Times New Roman',serif;color:#2F2A24;font-size:24px;line-height:1.3;">
                Positives
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px 16px 40px;font-family:Georgia,'Times New Roman',serif;color:#2F2A24;font-size:28px;line-height:1.35;">
                Your trial is active
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px 20px 40px;font-family:Helvetica,Arial,sans-serif;color:#2F2A24;font-size:16px;line-height:1.6;">
                Your trial ends on <strong>%TRIAL_END_DATE%</strong>. You can start today with a short daily practice.
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px 28px 40px;">
                <a href="%LOGIN_LINK%" style="display:inline-block;background:#6F7C6A;color:#FFFFFF;text-decoration:none;font-family:Helvetica,Arial,sans-serif;font-size:16px;font-weight:600;padding:12px 20px;border-radius:10px;">
                  Open Positives
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px 28px 40px;font-family:Helvetica,Arial,sans-serif;color:#6E665C;font-size:14px;line-height:1.6;">
                If you have questions, reply to this email.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

**Text**
```text
Your trial is active.

Your trial ends on %TRIAL_END_DATE%. You can start today with a short daily practice.

Open Positives: %LOGIN_LINK%

If you have questions, reply to this email.
```

---

## 3) Payment Receipt

**Postmark tag:** `payment_succeeded`

**Subject:** Your Positives receipt

**HTML**
```html
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#F7F3EE;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F3EE;padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:92%;background:#FFFFFF;border-radius:16px;">
            <tr>
              <td style="padding:32px 40px 8px 40px;font-family:Georgia,'Times New Roman',serif;color:#2F2A24;font-size:24px;line-height:1.3;">
                Positives
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px 16px 40px;font-family:Georgia,'Times New Roman',serif;color:#2F2A24;font-size:28px;line-height:1.35;">
                Payment received
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px 16px 40px;font-family:Helvetica,Arial,sans-serif;color:#2F2A24;font-size:16px;line-height:1.6;">
                Thank you. Here are your receipt details:
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px 20px 40px;font-family:Helvetica,Arial,sans-serif;color:#2F2A24;font-size:15px;line-height:1.6;">
                Amount: <strong>%AMOUNT_PAID%</strong><br>
                Invoice: <strong>%INVOICE_NUMBER%</strong><br>
                Next billing date: <strong>%NEXT_BILLING_DATE%</strong>
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px 28px 40px;">
                <a href="%INVOICE_URL%" style="display:inline-block;background:#6F7C6A;color:#FFFFFF;text-decoration:none;font-family:Helvetica,Arial,sans-serif;font-size:16px;font-weight:600;padding:12px 20px;border-radius:10px;">
                  View invoice
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px 28px 40px;font-family:Helvetica,Arial,sans-serif;color:#6E665C;font-size:14px;line-height:1.6;">
                Questions? Reply to this email and we’ll help.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

**Text**
```text
Payment received.

Amount: %AMOUNT_PAID%
Invoice: %INVOICE_NUMBER%
Next billing date: %NEXT_BILLING_DATE%

View invoice: %INVOICE_URL%

Questions? Reply to this email and we’ll help.
```

---

## 4) Payment Failed

**Postmark tag:** `payment_failed`

**Subject:** Action needed: update your payment method

**HTML**
```html
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#F7F3EE;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F3EE;padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:92%;background:#FFFFFF;border-radius:16px;">
            <tr>
              <td style="padding:32px 40px 8px 40px;font-family:Georgia,'Times New Roman',serif;color:#2F2A24;font-size:24px;line-height:1.3;">
                Positives
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px 16px 40px;font-family:Georgia,'Times New Roman',serif;color:#2F2A24;font-size:28px;line-height:1.35;">
                Payment needs attention
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px 20px 40px;font-family:Helvetica,Arial,sans-serif;color:#2F2A24;font-size:16px;line-height:1.6;">
                We couldn’t process your most recent payment. Your access stays active while you update your card.
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px 28px 40px;">
                <a href="%BILLING_LINK%" style="display:inline-block;background:#6F7C6A;color:#FFFFFF;text-decoration:none;font-family:Helvetica,Arial,sans-serif;font-size:16px;font-weight:600;padding:12px 20px;border-radius:10px;">
                  Update payment method
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px 28px 40px;font-family:Helvetica,Arial,sans-serif;color:#6E665C;font-size:14px;line-height:1.6;">
                If you need help, reply to this email.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

**Text**
```text
Payment needs attention.

We couldn’t process your most recent payment. Your access stays active while you update your card.

Update payment method: %BILLING_LINK%

If you need help, reply to this email.
```

---

## 5) Trial Ending

**Postmark tag:** `trial_ending`

**Subject:** Your Positives trial ends soon

**HTML**
```html
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#F7F3EE;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F3EE;padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:92%;background:#FFFFFF;border-radius:16px;">
            <tr>
              <td style="padding:32px 40px 8px 40px;font-family:Georgia,'Times New Roman',serif;color:#2F2A24;font-size:24px;line-height:1.3;">
                Positives
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px 16px 40px;font-family:Georgia,'Times New Roman',serif;color:#2F2A24;font-size:28px;line-height:1.35;">
                Your trial ends soon
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px 20px 40px;font-family:Helvetica,Arial,sans-serif;color:#2F2A24;font-size:16px;line-height:1.6;">
                Your trial ends on <strong>%TRIAL_END_DATE%</strong>. To keep access uninterrupted, please confirm your payment method.
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px 28px 40px;">
                <a href="%BILLING_LINK%" style="display:inline-block;background:#6F7C6A;color:#FFFFFF;text-decoration:none;font-family:Helvetica,Arial,sans-serif;font-size:16px;font-weight:600;padding:12px 20px;border-radius:10px;">
                  Update billing
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px 28px 40px;font-family:Helvetica,Arial,sans-serif;color:#6E665C;font-size:14px;line-height:1.6;">
                Questions? Reply to this email and we’ll help.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

**Text**
```text
Your trial ends soon.

Your trial ends on %TRIAL_END_DATE%. To keep access uninterrupted, please confirm your payment method.

Update billing: %BILLING_LINK%

Questions? Reply to this email and we’ll help.
```

---

## 6) Tier Changed

**Postmark tag:** `tier_changed`

**Subject:** Your Positives membership has been updated

**HTML**
```html
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#F7F3EE;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F3EE;padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:92%;background:#FFFFFF;border-radius:16px;">
            <tr>
              <td style="padding:32px 40px 8px 40px;font-family:Georgia,'Times New Roman',serif;color:#2F2A24;font-size:24px;line-height:1.3;">
                Positives
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px 16px 40px;font-family:Georgia,'Times New Roman',serif;color:#2F2A24;font-size:28px;line-height:1.35;">
                Membership updated
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px 20px 40px;font-family:Helvetica,Arial,sans-serif;color:#2F2A24;font-size:16px;line-height:1.6;">
                Your membership has been updated.
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px 20px 40px;font-family:Helvetica,Arial,sans-serif;color:#2F2A24;font-size:15px;line-height:1.6;">
                Previous tier: <strong>%PREVIOUS_TIER%</strong><br>
                New tier: <strong>%NEW_TIER%</strong><br>
                Plan: <strong>%PLAN_NAME%</strong>
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px 28px 40px;font-family:Helvetica,Arial,sans-serif;color:#6E665C;font-size:14px;line-height:1.6;">
                If you didn’t request this change, reply to this email.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

**Text**
```text
Membership updated.

Previous tier: %PREVIOUS_TIER%
New tier: %NEW_TIER%
Plan: %PLAN_NAME%

If you didn’t request this change, reply to this email.
```

---

## 7) Affiliate Welcome (FirstPromoter)

**Postmark tag:** `affiliate_welcome`

**Subject:** Welcome to Positives Affiliates

**HTML**
```html
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#F7F3EE;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F3EE;padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:92%;background:#FFFFFF;border-radius:16px;">
            <tr>
              <td style="padding:32px 40px 8px 40px;font-family:Georgia,'Times New Roman',serif;color:#2F2A24;font-size:24px;line-height:1.3;">
                Positives
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px 16px 40px;font-family:Georgia,'Times New Roman',serif;color:#2F2A24;font-size:28px;line-height:1.35;">
                Welcome to the affiliate program
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px 20px 40px;font-family:Helvetica,Arial,sans-serif;color:#2F2A24;font-size:16px;line-height:1.6;">
                We’re glad you’re here, %FIRSTNAME%. Your referral link is ready:
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px 20px 40px;font-family:Helvetica,Arial,sans-serif;color:#2F2A24;font-size:15px;line-height:1.6;">
                <strong>%FIRSTPROMOTER_LINK%</strong>
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px 28px 40px;">
                <a href="%FIRSTPROMOTER_PORTAL_URL%" style="display:inline-block;background:#6F7C6A;color:#FFFFFF;text-decoration:none;font-family:Helvetica,Arial,sans-serif;font-size:16px;font-weight:600;padding:12px 20px;border-radius:10px;">
                  Open affiliate portal
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px 28px 40px;font-family:Helvetica,Arial,sans-serif;color:#6E665C;font-size:14px;line-height:1.6;">
                If you need help, reply to this email and we’ll help.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

**Text**
```text
Welcome to the Positives affiliate program, %FIRSTNAME%.

Your referral link is ready:
%FIRSTPROMOTER_LINK%

Open affiliate portal: %FIRSTPROMOTER_PORTAL_URL%

If you need help, reply to this email and we’ll help.
```
