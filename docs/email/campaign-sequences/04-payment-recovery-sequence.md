# Campaign Sequence 04: Payment Recovery

## Automation purpose

Protect revenue while keeping the tone calm and helpful.

## Trigger

- `payment_failed`

## Email 1: Action Needed On Your Billing

- Delivery:
  - `Postmark transactional`
- Timing:
  - immediately
- Subject:
  - `Action needed: update your payment method`
- Preview:
  - `We could not process your payment, but your access is still active for now.`
- CTA:
  - `Update Payment Method`
- CTA link:
  - `%BILLING_LINK%`

### Draft copy

Hi %FIRSTNAME%,

We were not able to process your latest Positives payment.

This usually means the card on file needs to be updated. Your access is still
active for the moment, and it should only take a minute to fix.

Button:
`Update Payment Method`

If you need help, reply to this email and we’ll help.

## Email 2: Billing Reminder

- Delivery:
  - `Postmark transactional`
- Timing:
  - 3 days later if unresolved
- Subject:
  - `Your Positives payment still needs attention`
- Preview:
  - `A quick reminder to update your card and keep access uninterrupted.`
- CTA:
  - `Update Payment Method`
- CTA link:
  - `%BILLING_LINK%`

### Draft copy

Hi %FIRSTNAME%,

Just a quick reminder that your Positives payment method still needs attention.

Updating it now should keep your access uninterrupted.

Button:
`Update Payment Method`

If you already took care of this, you can ignore this email.

## Email 3: Final Billing Reminder

- Delivery:
  - `Postmark transactional`
- Timing:
  - 7 days later if unresolved
- Subject:
  - `Final reminder before access is paused`
- Preview:
  - `Update your billing details to avoid interruption.`
- CTA:
  - `Fix Billing`
- CTA link:
  - `%BILLING_LINK%`

### Draft copy

Hi %FIRSTNAME%,

We still have not been able to process your Positives payment.

If your payment details are not updated soon, your membership access may be
paused.

Button:
`Fix Billing`

We’d love to keep your practice uninterrupted.
