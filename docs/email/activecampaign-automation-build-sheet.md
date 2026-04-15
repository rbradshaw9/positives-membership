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
- `POS C01-E02 AC Come Back to Today's Practice`

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
- `access_restored`
- `membership_reactivated`
- `event_reminder_24h`
- `event_reminder_1h`
- `event_replay_ready`
- `coaching_reminder_24h`
- `coaching_reminder_1h`
- `coaching_replay_ready`
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
- `ACCESS_RESTORED_AT`
- `REACTIVATED_AT`
- `CANCELED_AT`
- `PAID_THROUGH_AT`
- `NEXT_EVENT_TITLE`
- `NEXT_EVENT_STARTS_AT`
- `NEXT_EVENT_JOIN_URL`
- `NEXT_EVENT_REPLAY_URL`
- `NEXT_EVENT_TIER`
- `NEXT_EVENT_TYPE`

### Recommended later

- `first_listen_complete`
- `first_journal_entry`
- `first_event_attended`
- `affiliate_payout_ready`
- `sms_opted_in`

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
- `access_restored`
- `access_restored_followup`
- `membership_reactivated`
- `membership_reactivated_resume`
- `event_24h`
- `event_1h`
- `event_replay`
- `coaching_24h`
- `coaching_1h`
- `coaching_replay`

## Build rules

- `PM` templates:
  - use `Send transactional email (Postmark)`
- `AC` templates:
  - use standard `Send email`
- `Supabase SMTP` emails:
  - do not build in ActiveCampaign

## Subject and preheader reference

Use these exact subjects and preheaders when building the emails in
ActiveCampaign. For `PM` templates, the preheader is already embedded in the
template HTML. For `AC` emails, add the preheader manually when ActiveCampaign
asks for preview text.

| Template | Subject | Preheader |
|---|---|---|
| `POS C01-E01 PM Welcome to Positives` | `Welcome to Positives` | `Your membership is live. Start with today’s practice.` |
| `POS C01-E02 AC Come Back to Today's Practice` | `Come back to today’s practice` | `A few quiet minutes is enough to keep the rhythm going.` |
| `POS C01-E03 AC Make Positives Stick` | `A simple way to make Positives stick` | `Start with Today, stay close to This Week, and let the habit build.` |
| `POS C02-E01 PM Your Trial Has Started` | `Your Positives trial has started` | `You have full access now. Start with today’s practice.` |
| `POS C02-E02 PM Your Trial Ends Soon` | `Your Positives trial ends soon` | `Review your billing details before your trial ends.` |
| `POS C02-E03 PM Final Trial Reminder` | `Final reminder before your trial ends` | `Keep access uninterrupted by confirming your payment method.` |
| `POS C03-E01 PM Your Access Has Been Restored` | `Your Positives access has been restored` | `Your Positives access is active again.` |
| `POS C03-E02 PM Pick Up Where You Left Off` | `Pick up where you left off` | `A gentle nudge back into your daily practice.` |
| `POS C04-E01 PM Action Needed on Your Billing` | `Action needed: update your payment method` | `We could not process your payment, but your access is still active for now.` |
| `POS C04-E02 PM Billing Reminder` | `Your Positives payment still needs attention` | `A quick reminder to update your card and keep access uninterrupted.` |
| `POS C04-E03 PM Final Billing Reminder` | `Final reminder before access is paused` | `Update your billing details to avoid interruption.` |
| `POS C05-E01 PM Upgrade Confirmation` | `Your Positives plan has been upgraded` | `Your membership now includes additional access.` |
| `POS C05-E02 PM Downgrade Confirmation` | `Your Positives plan has changed` | `Here’s a summary of your updated membership.` |
| `POS C06-E01 PM Cancellation Confirmation` | `Your Positives membership has been canceled` | `Your access will remain available through your current billing period.` |
| `POS C06-E02 PM Access Ending Soon` | `Your Positives access ends soon` | `A quick reminder before your membership access ends.` |
| `POS C07-E01 PM Affiliate Welcome` | `Welcome to the Positives affiliate program` | `Your referral portal and share link are ready.` |
| `POS C07-E02 AC Finish Your Payout Setup` | `Complete your affiliate payout setup` | `Add your payout details so commissions can be paid correctly.` |
| `POS C07-E03 AC Your Link Is Ready to Share` | `Your Positives referral link is ready to share` | `A quick reminder with your Positives referral link.` |
| `POS C08-E01 PM Welcome Back to Positives` | `Welcome back to Positives` | `Your membership is active again. Welcome back.` |
| `POS C08-E02 PM Here’s the Easiest Place to Resume` | `Here’s the easiest place to resume` | `Start with Today and resume from there.` |
| `POS C09-E01 AC You're In, Here's Where to Start` | `You’re in. Here’s where to start` | `A simple way to use Positives well from day one.` |
| `POS C09-E02 AC The Best Way to Use Positives` | `The easiest way to get value from Positives` | `Keep it simple: return daily, not perfectly.` |
| `POS C09-E03A AC Level 1 Orientation` | `Make the most of your Positives membership` | `Daily practice, library access, and private reflection tools are ready.` |
| `POS C09-E03B AC Level 2 Orientation` | `Your events access is ready` | `You can now join live member events and revisit replays.` |
| `POS C09-E03C AC Level 3 Orientation` | `Your coaching access is ready` | `Your membership includes live coaching and replay access.` |
| `POS C10-A1 AC Keep the Practice Going` | `A simple way to keep your practice going` | `Consistency matters more than intensity.` |
| `POS C10-A2 AC Add Live Events` | `Want more support around the practice?` | `Live events can help you stay connected and engaged.` |
| `POS C10-A3 AC Invitation to Upgrade` | `If you’re ready for the next level of support` | `Here’s what Membership + Events adds.` |
| `POS C10-B1 AC You May Be Ready for More Support` | `You may be ready for more direct support` | `If events are helping, coaching may be the next fit.` |
| `POS C10-B2 AC What Coaching Circle Adds` | `What Coaching Circle adds` | `Live coaching can help you stay closer to the work.` |
| `POS C10-C1 AC Come Back to Today's Practice` | `Come back to today’s practice` | `You do not need to catch up. Just return.` |
| `POS C10-C2 AC A Gentle Reset` | `A gentle way to reset` | `A few quiet minutes is enough to begin again.` |
| `POS R01-E01 PM Event Tomorrow` | `Reminder: %NEXT_EVENT_TITLE% is tomorrow` | `Your Positives event is coming up tomorrow.` |
| `POS R02-E01 PM Event Starting Soon` | `Starting soon: %NEXT_EVENT_TITLE%` | `Your Positives event starts soon.` |
| `POS R03-E01 PM Event Replay Ready` | `Replay ready: %NEXT_EVENT_TITLE%` | `The replay is ready when you are.` |
| `POS R04-E01 PM Coaching Tomorrow` | `Reminder: %NEXT_EVENT_TITLE% is tomorrow` | `Your coaching session is coming up tomorrow.` |
| `POS R05-E01 PM Coaching Starting Soon` | `Starting soon: %NEXT_EVENT_TITLE%` | `Your coaching session starts soon.` |
| `POS R06-E01 PM Coaching Replay Ready` | `Replay ready: %NEXT_EVENT_TITLE%` | `The coaching replay is ready when you are.` |

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
    - `tier_changed`

### Payment recovery exception

`payment_failed` starts the payment recovery automation, but it should remain
on the contact while billing is still unresolved.

- the app should remove `payment_failed` when payment is recovered or the
  billing issue is otherwise closed
- the automation should use the tag as a pull-out condition between reminders
- do not remove it immediately after Email 1, or the later recovery reminders
  will think the problem is fixed

### Important practical note

If you want a tag-triggered automation to be able to fire again later for a new
real lifecycle event, you usually need both:

- automation set to `Runs multiple times`
- the trigger tag removed and later re-applied

If the tag stays on the contact, a later “add tag” event usually will not act
like a fresh trigger.

## Live reminder model

### Current repo truth

- Level 2 `Events` and Level 3 `Coaching` are both currently stored as
  `coaching_call` content rows
- The app decides whether a reminder is treated as `event` or `coaching`
  based on `tier_min`
  - `level_2` -> `event`
  - `level_3` / `level_4` -> `coaching`
- Reminder automations should use `PM` / Postmark transactional delivery

### Reminder trigger behavior

- reminder triggers should run `Multiple times`
- the app applies the trigger tag when the reminder window opens
- the automation removes the trigger tag after send
- the app keeps a durable dispatch log so the same member/session/window does
  not retrigger on the next cron pass

## Build readiness and activation order

### Build / activate now

These are safe to build now because the app already owns the needed lifecycle
or reminder trigger state:

- `POS | C01 | Welcome And Access`
- `POS | C02 | Trial Lifecycle`
- `POS | C03 | Access Restored`
- `POS | C04 | Payment Recovery`
- `POS | C05 | Plan Change`
- `POS | C06 | Cancellation`
- `POS | C07 | Affiliate Onboarding`
- `POS | C08 | Membership Reactivated`
- `POS | R01 | Level 2 Event Reminder - 24h`
- `POS | R02 | Level 2 Event Reminder - 1h`
- `POS | R03 | Level 2 Replay Ready`
- `POS | R04 | Level 3 Coaching Reminder - 24h`
- `POS | R05 | Level 3 Coaching Reminder - 1h`
- `POS | R06 | Level 3 Replay Ready`

### Build later / do not activate yet

These templates can exist, but the automations should stay off until the app is
writing the behavioral trigger tags reliably:

- `POS | C09 | Post-Login Orientation`
  - defer for now because `C01` is now the first-week welcome and momentum flow
  - use later for deeper orientation or tier education if needed
- `POS | C10A | Level 1 -> Level 2 Progression`
- `POS | C10B | Level 2 -> Level 3 Progression`
- `POS | C10C | Inactivity Rescue`
  - wait until `first_listen_complete`, `first_journal_entry`,
    `first_event_attended`, and inactivity triggers are app-owned
- `POS | S01 | Post-Purchase SMS Welcome`
  - wait until Stripe Checkout SMS consent is wired and synced to AC
  - use only for contacts with `sms_opted_in`

### SMS status

Immediate post-purchase SMS would be a good touchpoint, but do not turn it on
from Stripe phone collection alone.

- Stripe currently collects a phone number for the contact profile
- phone collection is not the same as SMS marketing consent
- collect SMS consent inside Stripe Checkout so there is no additional step
- recommended implementation:
  - keep `phone_number_collection.enabled = true`
  - add a Checkout `custom_fields` dropdown with key `sms_consent`
  - use a required selection with:
    - `yes_sms`: `Yes, text me my access link and Positives updates. Msg/data rates may apply. Reply STOP to opt out.`
    - `no_sms`: `No thanks`
  - do not preselect `yes_sms`
- do not rely only on Stripe `consent_collection.promotions` for SMS because it
  is generic promotional consent and may not give us SMS-specific wording
- when the webhook sees `sms_consent = yes_sms` and a phone number exists, the
  app should set:
  - `sms_opted_in`
  - `SMS_OPTED_IN_AT`
  - `SMS_OPT_IN_SOURCE`
  - `SMS_OPT_IN_COPY`
- once consent exists, add a short purchase SMS automation:
  - trigger: `welcome_ready` or `trial_started` plus `sms_opted_in`
  - timing: immediately after purchase
  - copy: `Welcome to Positives. Your membership is ready: %LOGIN_LINK%. Reply STOP to opt out.`
- if the member chooses `no_sms` or leaves phone blank, do not add the SMS tag
  and do not send SMS

## Lifecycle model and edge cases

### Durable milestone vs reusable lifecycle trigger

`first_login_complete` should be treated as a durable milestone, not a reusable
trigger tag.

That means:

- do `not` remove `first_login_complete`
- do `not` expect it to fire again when a former member comes back later
- do use it to answer:
  - has this person ever successfully entered the protected member app?
  - should they be treated as a returning member later?

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
- App may also apply very quickly:
  - app applies `first_login_complete`
  - app removes `welcome_ready`
- Important:
  - do not use `first_login_complete` to skip the main welcome sequence

#### Brand-new trial member who has never logged in

- App applies:
  - `trial_started`
- Automation:
  - `POS | C02 | Trial Lifecycle`
- App may also apply very quickly:
  - app applies `first_login_complete`
  - app removes `trial_started`
- Important:
  - do not use `first_login_complete` to skip the trial-start email

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
  - post-purchase welcome/access trigger
  - also acts as a rescue trigger if instant login does not complete
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
  - do `not` segment this automation out by `first_login_complete`
  - checkout may auto-log the member into `/today` quickly after purchase
  - the first welcome/access email should still send even if instant login
    succeeds

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

Welcome the new member, reinforce the daily practice rhythm, and give them easy
ways to return to Positives during their first few days.

### Important first-login timing note

The checkout success page can automatically verify the member and redirect them
to `/today`. When they reach the protected member app, the app applies
`first_login_complete`.

Because of that, `first_login_complete` should not be used to stop the main
welcome sequence. It should be used for reporting and context only. A member
who auto-logged in still benefits from the first-week welcome emails because
the real goal is not merely “log in once”; it is “return and begin the
practice.”

If you want a small rescue path for people who truly never made it in, create a
separate access-help branch. Do not make the whole welcome sequence depend on
the absence of `first_login_complete`.

### Steps

#### Email 1

- Template:
  - `POS C01-E01 PM Welcome to Positives`
- Subject:
  - `Welcome to Positives`
- Preheader:
  - `Your membership is live. Start with today’s practice.`
- Delivery:
  - `PM`
- Postmark tag:
  - `welcome`
- Timing:
  - immediately

#### Delay

- wait `1 day`

#### Email 2

- Template:
  - `POS C01-E02 AC Come Back to Today's Practice`
- Subject:
  - `Come back to today’s practice`
- Preheader:
  - `A few quiet minutes is enough to keep the rhythm going.`
- Delivery:
  - `AC`
- Postmark tag:
  - none
- Condition:
  - send to all active new members

#### Delay

- wait `2 days`

#### Email 3

- Template:
  - `POS C01-E03 AC Make Positives Stick`
- Subject:
  - `A simple way to make Positives stick`
- Preheader:
  - `Start with Today, stay close to This Week, and let the habit build.`
- Delivery:
  - `AC`
- Postmark tag:
  - none
- Condition:
  - send to all active new members

#### Optional reporting goal

- Goal name:
  - `Member First Login`
- Goal condition:
  - `first_login_complete` exists
- Use:
  - reporting/context only
- Caution:
  - do not use this goal to skip the main welcome sequence

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
  - for `trial_started`: do `not` exclude contacts who already have
    `first_login_complete`
  - for `trial_ending`: member is not `canceled`

### Trigger tag handling

- `trial_started`
  - type: `trigger tag`
  - remove after use: `yes`
  - who removes it: `app`
  - current behavior: removed when `first_login_complete` is synced
  - caution: do not depend on this tag for later waits because it may be
    removed quickly after checkout auto-login
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
- Preheader:
  - `You have full access now. Start with today’s practice.`
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
- Preheader:
  - `Review your billing details before your trial ends.`
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
- Preheader:
  - `Keep access uninterrupted by confirming your payment method.`
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
  - `recovery trigger / unresolved-billing marker`
- Remove after use:
  - `no, keep while unresolved`
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
- Preheader:
  - `We could not process your payment, but your access is still active for now.`
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
- Preheader:
  - `A quick reminder to update your card and keep access uninterrupted.`
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
- Preheader:
  - `Update your billing details to avoid interruption.`
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
- Preheader:
  - `Your membership now includes additional access.`
- Delivery:
  - `PM`
- Postmark tag:
  - `plan_upgrade`

#### Downgrade path

- Template:
  - `POS C05-E02 PM Downgrade Confirmation`
- Subject:
  - `Your Positives plan has changed`
- Preheader:
  - `Here’s a summary of your updated membership.`
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
- Preheader:
  - `Your access will remain available through your current billing period.`
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
- Preheader:
  - `A quick reminder before your membership access ends.`
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
- Preheader:
  - `Your referral portal and share link are ready.`
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
- Preheader:
  - `Add your payout details so commissions can be paid correctly.`
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
- Preheader:
  - `A quick reminder with your Positives referral link.`
- Delivery:
  - `AC`
- Postmark tag:
  - none

## Automation 09

### Title

`POS | C09 | Post-Login Orientation`

### Current recommendation

Do `not` activate this automation at the same time as the revised `C01 Welcome
And Access` sequence unless you intentionally want a second onboarding stream.

For launch, treat `C01` as the primary first-week welcome/momentum sequence.
Keep `C09` as a later, optional deeper orientation sequence or rebuild it as a
tier-specific education flow after the first week.

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
- Preheader:
  - `A simple way to use Positives well from day one.`
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
- Preheader:
  - `Keep it simple: return daily, not perfectly.`
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
- Preheader:
  - `Daily practice, library access, and private reflection tools are ready.`
- Delivery:
  - `AC`
- Postmark tag:
  - none

##### Level 2

- Template:
  - `POS C09-E03B AC Level 2 Orientation`
- Subject:
  - `Your events access is ready`
- Preheader:
  - `You can now join live member events and revisit replays.`
- Delivery:
  - `AC`
- Postmark tag:
  - none

##### Level 3

- Template:
  - `POS C09-E03C AC Level 3 Orientation`
- Subject:
  - `Your coaching access is ready`
- Preheader:
  - `Your membership includes live coaching and replay access.`
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
- Preheader:
  - `Consistency matters more than intensity.`
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
- Preheader:
  - `Live events can help you stay connected and engaged.`
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
- Preheader:
  - `Here’s what Membership + Events adds.`
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
- Preheader:
  - `If events are helping, coaching may be the next fit.`
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
- Preheader:
  - `Live coaching can help you stay closer to the work.`
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
- Preheader:
  - `You do not need to catch up. Just return.`
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
- Preheader:
  - `A few quiet minutes is enough to begin again.`
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

## Automation 03

### Title

`POS | C03 | Access Restored`

### Trigger tag

- `access_restored`

### Trigger settings

- Runs:
  - `Multiple times`
- Segment on entry:
  - member is active or trialing

### Trigger tag handling

- Tag type:
  - `trigger tag`
- Remove after use:
  - `yes`
- Who removes it:
  - `automation`

### Goal

Confirm that access is back and send the member back to Today.

### Steps

#### Email 1

- Template:
  - `POS C03-E01 PM Your Access Has Been Restored`
- Subject:
  - `Your Positives access has been restored`
- Preheader:
  - `Your Positives access is active again.`
- Delivery:
  - `PM`
- Postmark tag:
  - `access_restored`

#### Delay

- wait `2 days`

#### Pull-out

- if `first_listen_complete` or `first_journal_entry` exists, end

#### Email 2

- Template:
  - `POS C03-E02 PM Pick Up Where You Left Off`
- Subject:
  - `Pick up where you left off`
- Preheader:
  - `A gentle nudge back into your daily practice.`
- Delivery:
  - `PM`
- Postmark tag:
  - `access_restored_followup`

## Automation 08

### Title

`POS | C08 | Membership Reactivated`

### Trigger tag

- `membership_reactivated`

### Trigger settings

- Runs:
  - `Multiple times`
- Segment on entry:
  - optional: `first_login_complete` exists

### Trigger tag handling

- Tag type:
  - `trigger tag`
- Remove after use:
  - `yes`
- Who removes it:
  - `automation`

### Goal

Welcome a returning member back without treating them like a brand-new member.

### Steps

#### Email 1

- Template:
  - `POS C08-E01 PM Welcome Back to Positives`
- Subject:
  - `Welcome back to Positives`
- Preheader:
  - `Your membership is active again. Welcome back.`
- Delivery:
  - `PM`
- Postmark tag:
  - `membership_reactivated`

#### Delay

- wait `2 days`

#### Email 2

- Template:
  - `POS C08-E02 PM Here’s the Easiest Place to Resume`
- Subject:
  - `Here’s the easiest place to resume`
- Preheader:
  - `Start with Today and resume from there.`
- Delivery:
  - `PM`
- Postmark tag:
  - `membership_reactivated_resume`

## Automation R01

### Title

`POS | R01 | Level 2 Event Reminder - 24h`

### Trigger tag

- `event_reminder_24h`

### Trigger settings

- Runs:
  - `Multiple times`

### Goal

Send the operational day-before reminder for the nearest Level 2 event.

### Steps

#### Email 1

- Template:
  - `POS R01-E01 PM Event Tomorrow`
- Subject:
  - `Reminder: %NEXT_EVENT_TITLE% is tomorrow`
- Preheader:
  - `Your Positives event is coming up tomorrow.`
- Delivery:
  - `PM`
- Postmark tag:
  - `event_24h`

## Automation R02

### Title

`POS | R02 | Level 2 Event Reminder - 1h`

### Trigger tag

- `event_reminder_1h`

### Trigger settings

- Runs:
  - `Multiple times`

### Steps

#### Email 1

- Template:
  - `POS R02-E01 PM Event Starting Soon`
- Subject:
  - `Starting soon: %NEXT_EVENT_TITLE%`
- Preheader:
  - `Your Positives event starts soon.`
- Delivery:
  - `PM`
- Postmark tag:
  - `event_1h`

## Automation R03

### Title

`POS | R03 | Level 2 Replay Ready`

### Trigger tag

- `event_replay_ready`

### Trigger settings

- Runs:
  - `Multiple times`

### Steps

#### Email 1

- Template:
  - `POS R03-E01 PM Event Replay Ready`
- Subject:
  - `Replay ready: %NEXT_EVENT_TITLE%`
- Preheader:
  - `The replay is ready when you are.`
- Delivery:
  - `PM`
- Postmark tag:
  - `event_replay`

## Automation R04

### Title

`POS | R04 | Level 3 Coaching Reminder - 24h`

### Trigger tag

- `coaching_reminder_24h`

### Trigger settings

- Runs:
  - `Multiple times`

### Steps

#### Email 1

- Template:
  - `POS R04-E01 PM Coaching Tomorrow`
- Subject:
  - `Reminder: %NEXT_EVENT_TITLE% is tomorrow`
- Preheader:
  - `Your coaching session is coming up tomorrow.`
- Delivery:
  - `PM`
- Postmark tag:
  - `coaching_24h`

## Automation R05

### Title

`POS | R05 | Level 3 Coaching Reminder - 1h`

### Trigger tag

- `coaching_reminder_1h`

### Trigger settings

- Runs:
  - `Multiple times`

### Steps

#### Email 1

- Template:
  - `POS R05-E01 PM Coaching Starting Soon`
- Subject:
  - `Starting soon: %NEXT_EVENT_TITLE%`
- Preheader:
  - `Your coaching session starts soon.`
- Delivery:
  - `PM`
- Postmark tag:
  - `coaching_1h`

## Automation R06

### Title

`POS | R06 | Level 3 Replay Ready`

### Trigger tag

- `coaching_replay_ready`

### Trigger settings

- Runs:
  - `Multiple times`

### Steps

#### Email 1

- Template:
  - `POS R06-E01 PM Coaching Replay Ready`
- Subject:
  - `Replay ready: %NEXT_EVENT_TITLE%`
- Preheader:
  - `The coaching replay is ready when you are.`
- Delivery:
  - `PM`
- Postmark tag:
  - `coaching_replay`
