# Transactional Campaign 04: Payment Recovery

## Purpose

Protect recurring revenue without creating unnecessary panic.

This campaign should:

- explain the failed charge clearly
- give the member a one-click path to update billing
- escalate gently across a small sequence

## Owner

`ActiveCampaign + Postmark`

## Trigger

- App sets:
  - `payment_failed` tag
  - `BILLING_LINK`
- App may also keep:
  - `past_due` tag for state tracking

## Required merge fields

- `%FIRSTNAME%`
- `%BILLING_LINK%`

## CTA destination

- `%BILLING_LINK%`

This must be the signed Positives billing recovery URL that redirects into the
Stripe billing portal.

## Recommended sequence

### Email 1: Payment Failed

- Timing:
  - immediately
- Subject:
  - `Action needed: update your payment method`
- Preview:
  - `We could not process your payment, but your access is still active for now.`
- CTA:
  - `Update Payment Method`

### Email 2: Billing Reminder

- Timing:
  - 3 days later if unresolved
- Subject:
  - `Your Positives payment still needs attention`
- Preview:
  - `A quick reminder to update your card and keep access uninterrupted.`
- CTA:
  - `Update Payment Method`

### Email 3: Final Billing Reminder

- Timing:
  - 7 days later if unresolved
- Subject:
  - `Final reminder before access is paused`
- Preview:
  - `Update your billing details to avoid interruption.`
- CTA:
  - `Fix Billing`

### Optional Email 4: Access Paused

- Timing:
  - after membership is actually paused or canceled for nonpayment
- Subject:
  - `Your Positives access has been paused`
- Preview:
  - `You can restore access by updating your billing details.`
- CTA:
  - `Restore Access`

## Body outline

### Email 1

- Explain the charge did not go through.
- Reassure them that this is usually a card-update issue.
- Keep tone calm.

### Email 2

- Short reminder.
- Emphasize uninterrupted access.

### Email 3

- Clearer urgency.
- Explain that access may be paused soon.

### Email 4

- Confirm the account is paused.
- Explain the path back in.

## Launch recommendation

- Required:
  - Email 1
  - Email 2
  - Email 3
- Optional:
  - Email 4

## Notes

- This is the most important revenue-protection sequence after receipts.
- Do not make it aggressive or shame-based.
