# Campaign Sequence 06: Cancellation

## Automation purpose

Confirm cancellation respectfully and reduce support confusion.

## Trigger

- cancellation event

## Email 1: Cancellation Confirmation

- Delivery:
  - `Postmark transactional`
- Timing:
  - immediately
- Subject:
  - `Your Positives membership has been canceled`
- Preview:
  - `Your access will remain available through your current billing period.`
- CTA:
  - `Open Positives`
- CTA link:
  - `https://positives.life/account`

### Draft copy

Hi %FIRSTNAME%,

This email confirms that your Positives membership has been canceled.

Your access will remain available through the rest of your current billing
period.

Button:
`Open Positives`

We’re grateful you were here. If you change your mind later, you’re always
welcome back.

## Email 2: Access Ending Soon

- Delivery:
  - `Postmark transactional`
- Timing:
  - 3 days before access ends
- Subject:
  - `Your Positives access ends soon`
- Preview:
  - `A quick reminder before your membership access ends.`
- CTA:
  - `Rejoin Positives`
- CTA link:
  - `https://positives.life/join`

### Draft copy

Hi %FIRSTNAME%,

Just a quick reminder that your Positives access will end soon.

If you’d like to continue your membership without interruption, you can rejoin
any time.

Button:
`Rejoin Positives`

Thank you again for being part of Positives.
