# Transactional Campaign 05: Plan Change

## Purpose

Confirm upgrades and downgrades so members are never confused about what
changed.

## Owner

`ActiveCampaign + Postmark`

## Trigger

- App sets:
  - `tier_changed` tag
  - `PREVIOUS_TIER`
  - `NEW_TIER`
  - `PLAN_NAME`

## Required merge fields

- `%FIRSTNAME%`
- `%PREVIOUS_TIER%`
- `%NEW_TIER%`
- `%PLAN_NAME%`

## Recommended sequence

### Email 1: Upgrade Confirmation

- Timing:
  - immediately when a higher tier takes effect
- Subject:
  - `Your Positives plan has been upgraded`
- Preview:
  - `Your membership now includes additional access.`
- CTA:
  - `Open Positives`

### Email 2: Downgrade Confirmation

- Timing:
  - immediately when a downgrade is confirmed or scheduled
- Subject:
  - `Your Positives plan has changed`
- Preview:
  - `Here’s a summary of your updated membership.`
- CTA:
  - `Open Positives`

### Optional Email 3: Downgrade Effective Soon

- Timing:
  - 3 days before downgrade takes effect, if there is a delayed effective date
- Subject:
  - `Your plan change takes effect soon`
- Preview:
  - `A quick reminder about your upcoming membership change.`
- CTA:
  - `Review Account`

## Body outline

### Upgrade

- Confirm the new tier.
- Highlight new access simply.
- Avoid sounding like a sales email.

### Downgrade

- Confirm the new tier.
- Clarify when the change takes effect if delayed.
- Keep tone calm and factual.

## Launch recommendation

- Required:
  - one transactional confirmation flow
- Better version:
  - split upgrade and downgrade into separate templates

## Notes

- This can start as one shared template if needed.
- Longer term, separate upgrade and downgrade templates will feel better.
