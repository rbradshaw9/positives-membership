# Transactional Campaign 07: Affiliate Onboarding

## Purpose

Help a newly approved affiliate understand:

- where their portal lives
- what referral link to use
- what they need to do next

## Owner

`ActiveCampaign + Postmark`

## Trigger

- App sets:
  - `affiliate` tag
  - affiliate link field
  - affiliate portal field

## Required merge fields

- `%FIRSTNAME%`
- `%FIRSTPROMOTER_LINK%`
- `%FIRSTPROMOTER_PORTAL_URL%`

## Important portal rule

Even if the field name stays `FIRSTPROMOTER_PORTAL_URL`, the value should point
to the `Positives member affiliate portal page`, not directly to FirstPromoter.

Recommended value:

- `https://positives.life/account/affiliate`

## CTA destination

- `%FIRSTPROMOTER_PORTAL_URL%`

## Recommended sequence

### Email 1: Affiliate Welcome

- Timing:
  - immediately after affiliate setup
- Subject:
  - `Welcome to the Positives affiliate program`
- Preview:
  - `Your referral portal and share link are ready.`
- CTA:
  - `Open Affiliate Portal`

### Email 2: Payout Setup Reminder

- Timing:
  - 24 hours later if payout details are still missing
- Subject:
  - `Complete your affiliate payout setup`
- Preview:
  - `Add your payout details so commissions can be paid correctly.`
- CTA:
  - `Finish Setup`

### Optional Email 3: First Share Prompt

- Timing:
  - 3 days later
- Subject:
  - `Your referral link is ready to share`
- Preview:
  - `A quick reminder with your Positives referral link.`
- CTA:
  - `Open Affiliate Portal`

## Body outline

### Email 1

- Welcome them.
- Tell them their link is ready.
- Show the link in plain text.
- Send them to the Positives affiliate portal page.

### Email 2

- Explain that payout details need to be completed.
- Link them back to the Positives affiliate portal page.

### Email 3

- Keep it short.
- Resurface the link.

## Launch recommendation

- Required:
  - Email 1
- Strongly recommended:
  - Email 2
- Optional:
  - Email 3

## Notes

- This campaign should never send someone to a dead-end JSON route.
- The Positives portal page should be the stable destination.
