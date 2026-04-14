# Transactional Campaign 06: Cancellation

## Purpose

Handle cancellations clearly and respectfully.

This campaign should:

- confirm the cancellation
- explain how long access remains
- reduce support confusion
- leave the door open for a return without pushing hard

## Owner

`ActiveCampaign + Postmark`

## Trigger

- Cancellation event from Stripe / app
- Existing app sync already applies `canceled`
- Recommended new merge field:
  - `ACCESS_END_DATE`

## Required merge fields

- `%FIRSTNAME%`
- `%ACCESS_END_DATE%` if added

## Recommended sequence

### Email 1: Cancellation Confirmation

- Timing:
  - immediately
- Subject:
  - `Your Positives membership has been canceled`
- Preview:
  - `Your access will remain available through your current billing period.`
- CTA:
  - `Open Positives`

### Optional Email 2: Access Ending Soon

- Timing:
  - 3 days before access ends
- Subject:
  - `Your Positives access ends soon`
- Preview:
  - `A quick reminder before your membership access ends.`
- CTA:
  - `Reactivate Membership`

### Optional Email 3: Access Ended

- Timing:
  - the day access ends
- Subject:
  - `Your Positives access has ended`
- Preview:
  - `You can return whenever you’re ready.`
- CTA:
  - `Rejoin Positives`

## Body outline

### Cancellation confirmation

- Confirm the cancellation happened.
- Explain the access window clearly.
- Reassure the member that they can return later.

### Access ending soon

- Simple reminder.
- Mention what they will lose access to.

### Access ended

- Keep this gentle and brief.
- Invite them back without pressure.

## Launch recommendation

- Required:
  - Email 1
- Optional:
  - Email 2
  - Email 3

## Notes

- Email 2 and 3 are helpful, but they are not launch blockers.
- If we build them, keep them operational first and winback second.
