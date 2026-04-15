# ActiveCampaign Template Audit

Date: 2026-04-15

## Status

The ActiveCampaign template library has been cleaned up around the current
`POS C##/R##` naming system.

- Current `POS ...` templates in ActiveCampaign: `38`
- Missing current templates: `0`
- Legacy `Positives Transactional - ...` templates: `0`
- Receipt templates: `0`
- Rewardful references: `0`
- JSON-wrapped / broken HTML templates: `0`

## Current Source Of Truth

Use:

- `scripts/sync-activecampaign-sequence-templates.mjs`
- `docs/email/activecampaign-automation-build-sheet.md`
- `docs/email/activecampaign-automation-map.md`

Do not recreate the old `Positives Transactional - ...` template family.

## Template Set

### Core Lifecycle

- `POS C01-E01 PM Welcome to Positives`
- `POS C01-E02 AC Your Membership Is Ready`
- `POS C01-E03 AC Need Help Getting In`
- `POS C02-E01 PM Your Trial Has Started`
- `POS C02-E02 PM Your Trial Ends Soon`
- `POS C02-E03 PM Final Trial Reminder`
- `POS C03-E01 PM Your Access Has Been Restored`
- `POS C03-E02 PM Pick Up Where You Left Off`
- `POS C04-E01 PM Action Needed on Your Billing`
- `POS C04-E02 PM Billing Reminder`
- `POS C04-E03 PM Final Billing Reminder`
- `POS C05-E01 PM Upgrade Confirmation`
- `POS C05-E02 PM Downgrade Confirmation`
- `POS C06-E01 PM Cancellation Confirmation`
- `POS C06-E02 PM Access Ending Soon`
- `POS C07-E01 PM Affiliate Welcome`
- `POS C07-E02 AC Finish Your Payout Setup`
- `POS C07-E03 AC Your Link Is Ready to Share`
- `POS C08-E01 PM Welcome Back to Positives`
- `POS C08-E02 PM Here’s the Easiest Place to Resume`
- `POS C09-E01 AC You're In, Here's Where to Start`
- `POS C09-E02 AC The Best Way to Use Positives`
- `POS C09-E03A AC Level 1 Orientation`
- `POS C09-E03B AC Level 2 Orientation`
- `POS C09-E03C AC Level 3 Orientation`

### Progression And Retention

- `POS C10-A1 AC Keep the Practice Going`
- `POS C10-A2 AC Add Live Events`
- `POS C10-A3 AC Invitation to Upgrade`
- `POS C10-B1 AC You May Be Ready for More Support`
- `POS C10-B2 AC What Coaching Circle Adds`
- `POS C10-C1 AC Come Back to Today's Practice`
- `POS C10-C2 AC A Gentle Reset`

### Live Session Reminders

- `POS R01-E01 PM Event Tomorrow`
- `POS R02-E01 PM Event Starting Soon`
- `POS R03-E01 PM Event Replay Ready`
- `POS R04-E01 PM Coaching Tomorrow`
- `POS R05-E01 PM Coaching Starting Soon`
- `POS R06-E01 PM Coaching Replay Ready`

## Link And Merge Field Notes

- Affiliate templates use `%FIRSTPROMOTER_LINK%` for the trackable referral
  link.
- Affiliate portal buttons use `%FIRSTPROMOTER_PORTAL_URL%`, but the app
  populates that field with the Positives in-app portal:
  `https://positives.life/account/affiliate`.
- Reminder templates use the current session fields:
  `%NEXT_EVENT_TITLE%`, `%NEXT_EVENT_STARTS_AT%`,
  `%NEXT_EVENT_JOIN_URL%`, and `%NEXT_EVENT_REPLAY_URL%`.
- Access-restored and membership-reactivated templates use `%LOGIN_LINK%`.

## Operational Notes

- `PM` templates are selected from the `Send transactional email (Postmark)`
  action.
- `AC` emails may need to be created inside the automation builder because
  ActiveCampaign does not always expose saved templates in the same picker for
  standard automation emails.
- The old standalone transactional template sync script was removed so it
  cannot recreate the legacy receipt or old template names.
