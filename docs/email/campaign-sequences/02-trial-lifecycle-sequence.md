# Campaign Sequence 02: Trial Lifecycle

## Automation purpose

Handle the operational trial experience clearly and calmly.

## Trigger

- trial purchase / trial start
- trial ending

## Email 1: Your Trial Has Started

- Delivery:
  - `Postmark transactional`
- Timing:
  - immediately
- Subject:
  - `Your Positives trial has started`
- Preview:
  - `You have full access now. Start with today’s practice.`
- CTA:
  - `Open Positives`
- CTA link:
  - `%LOGIN_LINK%`

### Draft copy

Hi %FIRSTNAME%,

Your Positives trial is now active.

You have full access through `%TRIAL_END_DATE%`, and the best way to begin is
simply to start with today’s practice.

There’s nothing to catch up on. Just come in, press play, and begin there.

Button:
`Open Positives`

If you need help, reply to this email and we’ll help.

## Email 2: Your Trial Ends Soon

- Delivery:
  - `Postmark transactional`
- Timing:
  - 72 hours before trial end
- Subject:
  - `Your Positives trial ends soon`
- Preview:
  - `Review your billing details before your trial ends.`
- CTA:
  - `Update Billing`
- CTA link:
  - `%BILLING_LINK%`

### Draft copy

Hi %FIRSTNAME%,

Your Positives trial runs through `%TRIAL_END_DATE%`.

If you want uninterrupted access, now is a good time to make sure your billing
details are ready.

Button:
`Update Billing`

If you’ve already taken care of it, you’re all set.

## Email 3: Final Trial Reminder

- Delivery:
  - `Postmark transactional`
- Timing:
  - 24 hours before trial end
- Subject:
  - `Final reminder before your trial ends`
- Preview:
  - `Keep access uninterrupted by confirming your payment method.`
- CTA:
  - `Update Billing`
- CTA link:
  - `%BILLING_LINK%`

### Draft copy

Hi %FIRSTNAME%,

This is a final reminder that your Positives trial ends on `%TRIAL_END_DATE%`.

If you want your access to continue without interruption, please confirm your
payment details now.

Button:
`Update Billing`

If you decide Positives is not for you right now, no action is needed.
