# Campaign Sequence 07: Affiliate Onboarding

## Automation purpose

Help a newly approved affiliate understand where to go and what to do next.

## Trigger

- `affiliate`

## Email 1: Welcome To The Affiliate Program

- Delivery:
  - `Postmark transactional`
- Timing:
  - immediately
- Subject:
  - `Welcome to the Positives affiliate program`
- Preview:
  - `Your referral portal and share link are ready.`
- CTA:
  - `Open Affiliate Portal`
- CTA link:
  - `%FIRSTPROMOTER_PORTAL_URL%`

### Draft copy

Hi %FIRSTNAME%,

Welcome to the Positives affiliate program.

Your referral link is ready to use:

`%FIRSTPROMOTER_LINK%`

Your next step is to open the affiliate portal and make sure everything looks
right there.

Button:
`Open Affiliate Portal`

## Email 2: Finish Your Payout Setup

- Delivery:
  - `Standard ActiveCampaign`
- Timing:
  - 1 day later if payout setup is incomplete
- Subject:
  - `Complete your affiliate payout setup`
- Preview:
  - `Add your payout details so commissions can be paid correctly.`
- CTA:
  - `Finish Setup`
- CTA link:
  - `%FIRSTPROMOTER_PORTAL_URL%`

### Draft copy

Hi %FIRSTNAME%,

One quick reminder: make sure your payout details are complete inside the
affiliate portal.

That will make it much easier for commissions to be handled cleanly once your
referrals start coming in.

Button:
`Finish Setup`

## Email 3: Your Link Is Ready To Share

- Delivery:
  - `Standard ActiveCampaign`
- Timing:
  - 3 days later
- Subject:
  - `Your Positives referral link is ready to share`
- Preview:
  - `A quick reminder with your Positives referral link.`
- CTA:
  - `Open Affiliate Portal`
- CTA link:
  - `%FIRSTPROMOTER_PORTAL_URL%`

### Draft copy

Hi %FIRSTNAME%,

Just a reminder that your Positives referral link is ready whenever you want to
start sharing it:

`%FIRSTPROMOTER_LINK%`

If you want your stats, resources, or setup details, head back to the affiliate
portal.

Button:
`Open Affiliate Portal`
