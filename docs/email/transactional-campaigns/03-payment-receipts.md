# Transactional Campaign 03: Receipt Policy

## Purpose

Document the current billing-email decision so we do not accidentally build a
duplicate receipt flow.

## Owner

`No app-owned receipt campaign for now`

## Current decision

- Positives does **not** send payment receipt emails for now.
- We do **not** build a receipt automation in ActiveCampaign.
- We do **not** send a separate branded receipt email from the app.

## Why

- Receipt emails can become an unnecessary reminder that a member was charged.
- On recurring memberships, that can create avoidable cancellation or refund
  attention.
- Positives emails should focus on:
  - access
  - onboarding
  - billing problems
  - plan changes
  - cancellation clarity

## Recommended system behavior

### Positives should send

- welcome / access
- trial lifecycle
- payment recovery
- plan changes
- cancellation confirmation
- affiliate onboarding

### Positives should not send

- recurring renewal receipts
- branded charge confirmations
- duplicate invoice emails

## Stripe policy

If receipts are ever needed, Stripe should be the system of record.

For now, the recommendation is:

- no dedicated receipt campaign planning
- no ActiveCampaign receipt automation
- revisit later only if support, accounting, or compliance needs make receipts
  necessary

## Related app events

The app may still track successful payment internally for analytics or billing
state, but that does not need to produce a member-facing receipt email.

## Launch recommendation

- Do not build a receipt email campaign.
- Focus that effort on welcome, orientation, payment recovery, and
  post-login progression instead.

## Notes

- If this changes later, let Stripe own receipts first.
- If we ever add a successful-payment email from Positives, it should be a
  clear product/lifecycle message, not a duplicate financial receipt.
