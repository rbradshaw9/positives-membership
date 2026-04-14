# Positives ActiveCampaign Automation Build Sheet

Date: 2026-04-14
Owner: Ryan + Codex

This document is the practical build sheet for wiring the Positives email system
 inside ActiveCampaign.

Use it alongside:

- `docs/email/campaign-sequences/*.md`
- `docs/email/transactional-campaigns/*.md`
- `docs/email/activecampaign-automation-map.md`

## Naming conventions

### Automation names

Use this format for automations:

- `POS | C01 | Welcome And Access`
- `POS | C02 | Trial Lifecycle`

### Template names

Use this format for templates:

- `POS C01-E01 PM Welcome to Positives`
- `POS C01-E02 AC Your Membership Is Ready`

Where:

- `POS` = Positives
- `C##` = campaign number
- `E##` = email number
- `PM` = send with `Send transactional email (Postmark)`
- `AC` = send with standard `Send email`

## Tag summary

### Current trigger tags

- `welcome_ready`
- `trial_started`
- `trial_ending`
- `payment_failed`
- `tier_changed`
- `affiliate`
- `canceled`

- `first_login_complete`

### Tier tags

- `level_1`
- `level_2`
- `level_3`
- `level_4`

### Current lifecycle field

- `FIRST_LOGIN_AT`

### Recommended later

- `first_listen_complete`
- `first_journal_entry`
- `first_event_attended`
- `affiliate_payout_ready`
- `access_restored`
- `membership_reactivated`

## Postmark tag summary

Use these tags on the `PM` email steps:

- `welcome`
- `trial_started`
- `trial_ending`
- `trial_ending_final`
- `payment_failed`
- `payment_failed_reminder`
- `payment_failed_final`
- `plan_upgrade`
- `plan_downgrade`
- `cancellation_confirmed`
- `cancellation_ending`
- `affiliate_welcome`

## Build rules

- `PM` templates:
  - use `Send transactional email (Postmark)`
- `AC` templates:
  - use standard `Send email`
- `Supabase SMTP` emails:
  - do not build in ActiveCampaign

### Important AC builder note

For standard `Send email`, ActiveCampaign may not show the same reusable
template picker you see for transactional / Postmark emails.

Instead, it often gives you:

- `Create a new email`
- `Start from an existing email`
- `Select an email in this automation`

That is normal.

Recommended workflow:

1. build the first `AC` email inside the automation
2. give it the exact identifier from this build sheet
3. for later emails, duplicate from an existing automation email and edit it

## Trigger behavior rules

For tag-triggered automations, there are two separate questions:

1. Can the contact re-enter this automation later?
   - controlled by `Runs once` vs `Runs multiple times`
2. Will adding the tag again create a fresh trigger event?
   - usually only if the tag was removed first and then re-added later

### Rule of thumb

- `State tags` should usually stay on the contact while true
  - examples:
    - `level_1`
    - `level_2`
    - `level_3`
    - `level_4`
    - `past_due`
    - `canceled`
    - `affiliate`
- `Trigger tags` should usually be removed after they have served their
  purpose
  - examples:
    - `welcome_ready`
    - `trial_started`
    - `trial_ending`
    - `payment_failed`
    - `tier_changed`

### Important practical note

If you want a tag-triggered automation to be able to fire again later for a new
real lifecycle event, you usually need both:

- automation set to `Runs multiple times`
- the trigger tag removed and later re-applied

If the tag stays on the contact, a later “add tag” event usually will not act
like a fresh trigger.

## Lifecycle model and edge cases

### Durable milestone vs reusable lifecycle trigger

`first_login_complete` should be treated as a durable milestone, not a reusable
trigger tag.

That means:

- do `not` remove `first_login_complete`
- do `not` expect it to fire again when a former member comes back later
- do use it to answer:
  - has this person ever successfully entered the protected member app?
  - should they skip the first-time access reminders?

If a member leaves and later comes back, that is a `different lifecycle event`.
Use a new trigger for that event instead of trying to reuse
`first_login_complete`.

### Recommended comeback / restoration triggers

- `access_restored`
  - use when a member lost access because of billing failure or account pause
    and now has active access again
- `membership_reactivated`
  - use when a formerly canceled / inactive member buys again later

These should start a lighter `welcome back` or `access restored` automation,
not the first-time `Welcome And Access` flow.

### Scenario matrix

#### Brand-new member who has never logged in

- App applies:
  - `welcome_ready`
- Automation:
  - `POS | C01 | Welcome And Access`
- Exit:
  - app applies `first_login_complete`
  - app removes `welcome_ready`

#### Brand-new trial member who has never logged in

- App applies:
  - `trial_started`
- Automation:
  - `POS | C02 | Trial Lifecycle`
- Exit from access reminders:
  - app applies `first_login_complete`
  - app removes `trial_started`

#### Existing member whose card fails but access is later restored

- App applies:
  - `payment_failed`
- Automation:
  - `POS | C04 | Payment Recovery`
- On recovery:
  - app removes `payment_failed`
  - app may apply `access_restored`
- Do `not` reuse:
  - `first_login_complete`
  - `welcome_ready`

#### Former member who canceled and later buys again

- App applies:
  - `membership_reactivated`
- Automation:
  - recommended future `welcome back` / `reactivated member` flow
- Do `not` expect:
  - `first_login_complete` to fire again

#### Member unsubscribed from standard marketing email

- `PM` transactional emails should still send when operationally necessary
- `AC` standard emails may be suppressed depending on list status / consent
- This especially affects:
  - post-login orientation
  - progression / upsell
  - inactivity rescue

### Practical recommendation

Keep these meanings distinct:

- `first_login_complete`
  - lifetime milestone
- `welcome_ready`
  - first-time access reminder trigger
- `trial_started`
  - first-time trial access trigger
- `access_restored`
  - member got access back after interruption
- `membership_reactivated`
  - former member returned later as a paying member

## Automation 01

### Title

`POS | C01 | Welcome And Access`

### Trigger tag

- `welcome_ready`

### Trigger settings

- Runs:
  - `Multiple times`
- Segment on entry:
  - `first_login_complete` does not exist
  - this automation is only for first-time members who have never completed a
    protected member login

### Trigger tag handling

- Tag type:
  - `trigger tag`
- Remove after use:
  - `yes`
- Who removes it:
  - `app`
- Current behavior:
  - removed when `first_login_complete` is synced

### Why

- This automation should be reusable for a future true re-subscribe event.
- It should not keep restarting during the same membership lifecycle.
- If a former member returns later, use `membership_reactivated` or
  `access_restored` instead of forcing them back through the first-time welcome
  sequence.

### Goal

Get a new member to first login.

### Steps

#### Email 1

- Template:
  - `POS C01-E01 PM Welcome to Positives`
- Subject:
  - `Welcome to Positives`
- Delivery:
  - `PM`
- Postmark tag:
  - `welcome`
- Timing:
  - immediately

#### Delay

- wait `1 day` or until `first_login_complete`

#### Pull-out

- if `first_login_complete` is added, end automation immediately

#### Email 2

- Template:
  - `POS C01-E02 AC Your Membership Is Ready`
- Subject:
  - `Your Positives membership is ready`
- Delivery:
  - `AC`
- Postmark tag:
  - none
- Condition:
  - only if `first_login_complete` is still absent

#### Delay

- wait `2 days` or until `first_login_complete`

#### Pull-out

- if `first_login_complete` is added, end automation immediately

#### Email 3

- Template:
  - `POS C01-E03 AC Need Help Getting In`
- Subject:
  - `Need help getting into Positives?`
- Delivery:
  - `AC`
- Postmark tag:
  - none
- Condition:
  - only if `first_login_complete` is still absent

## Automation 02

### Title

`POS | C02 | Trial Lifecycle`

### Trigger tags

- `trial_started`
- `trial_ending`

### Trigger settings

- Runs:
  - `Multiple times`
- Segment on entry:
  - for `trial_started`: `first_login_complete` does not exist
  - for `trial_ending`: member is not `canceled`

### Trigger tag handling

- `trial_started`
  - type: `trigger tag`
  - remove after use: `yes`
  - who removes it: `app`
  - current behavior: removed when `first_login_complete` is synced
- `trial_ending`
  - type: `trigger tag`
  - remove after use: `recommended`
  - who removes it: `automation or app`

### Why

- Trial start should be reusable for a future new trial lifecycle only if that
  ever becomes a real path.
- Trial ending should not repeatedly retrigger from stale tag state.

### Goal

Handle trial access and trial-end reminders.

### Branch A: Trial started

#### Email 1

- Template:
  - `POS C02-E01 PM Your Trial Has Started`
- Subject:
  - `Your Positives trial has started`
- Delivery:
  - `PM`
- Postmark tag:
  - `trial_started`
- Timing:
  - immediately

### Branch B: Trial ending

#### Email 2

- Template:
  - `POS C02-E02 PM Your Trial Ends Soon`
- Subject:
  - `Your Positives trial ends soon`
- Delivery:
  - `PM`
- Postmark tag:
  - `trial_ending`
- Timing:
  - when `trial_ending` is added

#### Delay

- wait `2 days`

#### Pull-out

- if `canceled` exists, end

#### Email 3

- Template:
  - `POS C02-E03 PM Final Trial Reminder`
- Subject:
  - `Final reminder before your trial ends`
- Delivery:
  - `PM`
- Postmark tag:
  - `trial_ending_final`
- Condition:
  - only if still active

## Automation 04

### Title

`POS | C04 | Payment Recovery`

### Trigger tag

- `payment_failed`

### Trigger settings

- Runs:
  - `Multiple times`
- Segment on entry:
  - `past_due` exists

### Trigger tag handling

- Tag type:
  - `trigger tag`
- Remove after use:
  - `yes`
- Who removes it:
  - `app`
- Current behavior:
  - removed when payment is recovered

### Why

- A contact may have multiple failed-payment events across their lifetime.
- This automation should be reusable for each real future payment failure.

### Goal

Recover failed payments without creating unnecessary friction.

### Steps

#### Email 1

- Template:
  - `POS C04-E01 PM Action Needed on Your Billing`
- Subject:
  - `Action needed: update your payment method`
- Delivery:
  - `PM`
- Postmark tag:
  - `payment_failed`
- Timing:
  - immediately

#### Delay

- wait `3 days` or until `payment_failed` is removed

#### Pull-out

- if `payment_failed` is removed, end

#### Email 2

- Template:
  - `POS C04-E02 PM Billing Reminder`
- Subject:
  - `Your Positives payment still needs attention`
- Delivery:
  - `PM`
- Postmark tag:
  - `payment_failed_reminder`
- Condition:
  - only if still tagged `payment_failed`

#### Delay

- wait `4 days` or until `payment_failed` is removed

#### Pull-out

- if `payment_failed` is removed, end

#### Email 3

- Template:
  - `POS C04-E03 PM Final Billing Reminder`
- Subject:
  - `Final reminder before access is paused`
- Delivery:
  - `PM`
- Postmark tag:
  - `payment_failed_final`
- Condition:
  - only if still tagged `payment_failed`

## Automation 05

### Title

`POS | C05 | Plan Change`

### Trigger tag

- `tier_changed`

### Trigger settings

- Runs:
  - `Multiple times`
- Segment on entry:
  - optional: `PREVIOUS_TIER` is not blank and `NEW_TIER` is not blank

### Trigger tag handling

- Tag type:
  - `trigger tag`
- Remove after use:
  - `yes`
- Who removes it:
  - `recommended: automation or app`
- Current behavior:
  - not yet automatically removed in code

### Why

- Members may change plans more than once.
- This automation should re-fire for each real new plan change.

### Goal

Confirm upgrades and downgrades clearly.

### Steps

#### Upgrade path

- Template:
  - `POS C05-E01 PM Upgrade Confirmation`
- Subject:
  - `Your Positives plan has been upgraded`
- Delivery:
  - `PM`
- Postmark tag:
  - `plan_upgrade`

#### Downgrade path

- Template:
  - `POS C05-E02 PM Downgrade Confirmation`
- Subject:
  - `Your Positives plan has changed`
- Delivery:
  - `PM`
- Postmark tag:
  - `plan_downgrade`

## Automation 06

### Title

`POS | C06 | Cancellation`

### Trigger tag

- `canceled`

### Trigger settings

- Runs:
  - `Multiple times`
- Segment on entry:
  - optional: `canceled` exists

### Trigger tag handling

- Tag type:
  - mostly `state tag`
- Remove after use:
  - only if the member reactivates later
- Who removes it:
  - `app` on reactivation if applicable

### Why

- `canceled` describes a contact state, not just a one-time event.

### Goal

Confirm cancellation and optionally remind before access ends.

### Steps

#### Email 1

- Template:
  - `POS C06-E01 PM Cancellation Confirmation`
- Subject:
  - `Your Positives membership has been canceled`
- Delivery:
  - `PM`
- Postmark tag:
  - `cancellation_confirmed`
- Timing:
  - immediately

#### Optional Email 2

- Template:
  - `POS C06-E02 PM Access Ending Soon`
- Subject:
  - `Your Positives access ends soon`
- Delivery:
  - `PM`
- Postmark tag:
  - `cancellation_ending`
- Timing:
  - only use if you can time it correctly based on access end date

## Automation 07

### Title

`POS | C07 | Affiliate Onboarding`

### Trigger tag

- `affiliate`

### Trigger settings

- Runs:
  - `Multiple times`
- Segment on entry:
  - optional: affiliate portal field is not blank

### Trigger tag handling

- Tag type:
  - mostly `state tag`
- Remove after use:
  - usually `no`
- Why:
  - `affiliate` is useful as an ongoing audience/state tag

### Important note

- If you ever want affiliate onboarding to run again only for a fresh affiliate
  lifecycle, use a separate trigger tag rather than relying on `affiliate`
  itself.

### Goal

Welcome a new affiliate and guide them to setup and sharing.

### Steps

#### Email 1

- Template:
  - `POS C07-E01 PM Affiliate Welcome`
- Subject:
  - `Welcome to the Positives affiliate program`
- Delivery:
  - `PM`
- Postmark tag:
  - `affiliate_welcome`
- Timing:
  - immediately

#### Delay

- wait `1 day`

#### Optional pull-out

- if `affiliate_payout_ready` exists later, end the follow-up branch

#### Email 2

- Template:
  - `POS C07-E02 AC Finish Your Payout Setup`
- Subject:
  - `Complete your affiliate payout setup`
- Delivery:
  - `AC`
- Postmark tag:
  - none
- Condition:
  - only if payout setup is not complete

#### Delay

- wait `2 days`

#### Pull-out

- if `affiliate_payout_ready` exists, end

#### Email 3

- Template:
  - `POS C07-E03 AC Your Link Is Ready to Share`
- Subject:
  - `Your Positives referral link is ready to share`
- Delivery:
  - `AC`
- Postmark tag:
  - none

## Automation 09

### Title

`POS | C09 | Post-Login Orientation`

### Trigger tag

- `first_login_complete`

### Trigger settings

- Runs:
  - `Once`
- Segment on entry:
  - none required

### Trigger tag handling

- Tag type:
  - `trigger + milestone tag`
- Remove after use:
  - usually `no`
- Why:
  - a member only has one first login
  - this tag is also useful as a durable milestone marker

### Goal

Teach members how to use Positives after they first get in.

### Steps

#### Email 1

- Template:
  - `POS C09-E01 AC You're In, Here's Where to Start`
- Subject:
  - `You’re in. Here’s where to start`
- Delivery:
  - `AC`
- Postmark tag:
  - none
- Timing:
  - immediately

#### Delay

- wait `2 days`

#### Email 2

- Template:
  - `POS C09-E02 AC The Best Way to Use Positives`
- Subject:
  - `The easiest way to get value from Positives`
- Delivery:
  - `AC`
- Postmark tag:
  - none

#### Delay

- wait `3 days`

#### Tier split

##### Level 1

- Template:
  - `POS C09-E03A AC Level 1 Orientation`
- Subject:
  - `Make the most of your Positives membership`
- Delivery:
  - `AC`
- Postmark tag:
  - none

##### Level 2

- Template:
  - `POS C09-E03B AC Level 2 Orientation`
- Subject:
  - `Your events access is ready`
- Delivery:
  - `AC`
- Postmark tag:
  - none

##### Level 3

- Template:
  - `POS C09-E03C AC Level 3 Orientation`
- Subject:
  - `Your coaching access is ready`
- Delivery:
  - `AC`
- Postmark tag:
  - none

#### Pull-out

- if `canceled` exists, end

## Automation 10A

### Title

`POS | C10A | Level 1 To Level 2 Progression`

### Trigger tag

- `first_listen_complete`

### Trigger settings

- Runs:
  - `Once`
- Segment on entry:
  - contact has `level_1`

### Trigger tag handling

- Tag type:
  - `trigger + milestone tag`
- Remove after use:
  - usually `no`
- Why:
  - this is a one-time milestone and useful as a durable engagement marker

### Entry condition

- must also have `level_1`

### Goal

Support progression from core membership to events.

### Steps

#### Email 1

- Template:
  - `POS C10-A1 AC Keep the Practice Going`
- Subject:
  - `A simple way to keep your practice going`
- Delivery:
  - `AC`
- Postmark tag:
  - none

#### Delay

- wait `4 days`

#### Pull-out

- if no longer `level_1`, end

#### Email 2

- Template:
  - `POS C10-A2 AC Add Live Events`
- Subject:
  - `Want more support around the practice?`
- Delivery:
  - `AC`
- Postmark tag:
  - none

#### Delay

- wait `5 days`

#### Pull-out

- if no longer `level_1`, end

#### Email 3

- Template:
  - `POS C10-A3 AC Invitation to Upgrade`
- Subject:
  - `If you’re ready for the next level of support`
- Delivery:
  - `AC`
- Postmark tag:
  - none

## Automation 10B

### Title

`POS | C10B | Level 2 To Level 3 Progression`

### Trigger tag

- `first_event_attended`

### Trigger settings

- Runs:
  - `Once`
- Segment on entry:
  - contact has `level_2`

### Trigger tag handling

- Tag type:
  - `trigger + milestone tag`
- Remove after use:
  - usually `no`
- Why:
  - this is a one-time milestone and useful as a durable engagement marker

### Entry condition

- must also have `level_2`

### Goal

Support progression from events to coaching.

### Steps

#### Email 1

- Template:
  - `POS C10-B1 AC You May Be Ready for More Support`
- Subject:
  - `You may be ready for more direct support`
- Delivery:
  - `AC`
- Postmark tag:
  - none

#### Delay

- wait `5 days`

#### Pull-out

- if no longer `level_2`, end

#### Email 2

- Template:
  - `POS C10-B2 AC What Coaching Circle Adds`
- Subject:
  - `What Coaching Circle adds`
- Delivery:
  - `AC`
- Postmark tag:
  - none

## Automation 10C

### Title

`POS | C10C | Inactivity Rescue`

### Trigger tag

- `first_login_complete`

### Entry delay

- wait `7 days`

### Entry condition

- no `first_listen_complete`
- no `first_journal_entry`

### Trigger settings

- Runs:
  - `Once`
- Segment on entry:
  - optional: `first_listen_complete` does not exist
  - optional: `first_journal_entry` does not exist

### Trigger tag handling

- Tag type:
  - `milestone tag`
- Remove after use:
  - `no`
- Why:
  - inactivity rescue is keyed off a milestone plus wait/conditions, not a
    reusable event tag

### Goal

Bring members back gently if they got in but did not really begin.

### Steps

#### Email 1

- Template:
  - `POS C10-C1 AC Come Back to Today's Practice`
- Subject:
  - `Come back to today’s practice`
- Delivery:
  - `AC`
- Postmark tag:
  - none

#### Delay

- wait `4 days`

#### Pull-out

- if engagement tag appears, end

#### Email 2

- Template:
  - `POS C10-C2 AC A Gentle Reset`
- Subject:
  - `A gentle way to reset`
- Delivery:
  - `AC`
- Postmark tag:
  - none

## Important note

`first_login_complete` is now wired in the app and synced to ActiveCampaign with
the `FIRST_LOGIN_AT` field. The next lifecycle triggers still to add later are:

- `first_listen_complete`
- `first_journal_entry`
- `first_event_attended`
