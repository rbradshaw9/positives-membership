# Transactional Campaign 02: Trial Lifecycle

## Purpose

Handle the operational side of trial membership clearly and calmly.

This campaign should help trial members:

- understand that access is live
- know when the trial ends
- avoid surprise billing
- update payment details if needed

## Owner

`ActiveCampaign + Postmark`

## Triggers

### Trial start

- App sets:
  - `trial_started` tag
  - `LOGIN_LINK`
  - `PLAN_NAME`
  - `TRIAL_END_DATE`

### Trial ending

- App sets:
  - `trial_ending` tag
  - `TRIAL_END_DATE`
  - `BILLING_LINK`

## Required merge fields

- `%FIRSTNAME%`
- `%PLAN_NAME%`
- `%LOGIN_LINK%`
- `%TRIAL_END_DATE%`
- `%BILLING_LINK%`

## CTA destinations

- Trial started:
  - `%LOGIN_LINK%`
- Trial ending:
  - `%BILLING_LINK%`

## Recommended sequence

### Email 1: Trial Started

- Timing:
  - immediately
- Subject:
  - `Your Positives trial has started`
- Preview:
  - `You have full access now. Start with today’s practice.`
- CTA:
  - `Open Positives`

### Email 2: Trial Ending Soon

- Timing:
  - 72 hours before trial end if timing is available, otherwise when
    `trial_ending` first fires
- Subject:
  - `Your Positives trial ends soon`
- Preview:
  - `Review your billing details before your trial ends.`
- CTA:
  - `Update Billing`

### Email 3: Final Trial Reminder

- Timing:
  - 24 hours before trial end
- Subject:
  - `Final reminder before your trial ends`
- Preview:
  - `Keep access uninterrupted by confirming your payment method.`
- CTA:
  - `Update Billing`

## Body outline

### Email 1

- Confirm access.
- Name the plan.
- Tell them when the trial ends.
- Direct them to `Today`.

### Email 2

- Tell them the exact trial end date.
- Explain that billing starts unless they cancel or update details.
- Link directly to billing.

### Email 3

- Keep it calm but clearer about urgency.
- Reinforce uninterrupted access.
- Link directly to billing.

## Launch recommendation

- Required:
  - Email 1
  - Email 2
- Recommended:
  - Email 3

## Notes

- Trial reminders should remain operational, not salesy.
- If the trial converts successfully, the member should naturally move into the
  receipt flow rather than another trial email.
