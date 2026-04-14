# Campaign Sequence 05: Plan Change

## Automation purpose

Confirm upgrades and downgrades clearly.

## Trigger

- `tier_changed`

## Email 1: Upgrade Confirmation

- Delivery:
  - `Postmark transactional`
- Timing:
  - immediately on upgrade
- Subject:
  - `Your Positives plan has been upgraded`
- Preview:
  - `Your membership now includes additional access.`
- CTA:
  - `Open Positives`
- CTA link:
  - `https://positives.life/today`

### Draft copy

Hi %FIRSTNAME%,

Your Positives membership has been upgraded.

You’ve moved from `%PREVIOUS_TIER%` to `%NEW_TIER%`, and your current plan is
`%PLAN_NAME%`.

Your new access is ready now inside the member platform.

Button:
`Open Positives`

If you did not request this change, reply to this email and we’ll help.

## Email 2: Downgrade Confirmation

- Delivery:
  - `Postmark transactional`
- Timing:
  - immediately on downgrade
- Subject:
  - `Your Positives plan has changed`
- Preview:
  - `Here’s a summary of your updated membership.`
- CTA:
  - `Open Positives`
- CTA link:
  - `https://positives.life/account`

### Draft copy

Hi %FIRSTNAME%,

Your Positives membership has changed.

You’ve moved from `%PREVIOUS_TIER%` to `%NEW_TIER%`, and your current plan is
`%PLAN_NAME%`.

You can review your account any time inside Positives.

Button:
`Open Positives`

If this change was unexpected, reply to this email and we’ll help.
