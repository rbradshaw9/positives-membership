# Positives ActiveCampaign Automation Map

Date: 2026-04-14
Owner: Ryan + Codex

This is the full operator map for building the Positives lifecycle automations in
ActiveCampaign.

Use this as the day-to-day wiring guide.

Related docs:

- `docs/email/activecampaign-automation-build-sheet.md`
- `docs/email/campaign-sequences/*.md`
- `docs/email/transactional-campaigns/*.md`

## Important ActiveCampaign UI note

### Transactional / Postmark emails

For `Send transactional email (Postmark)`, ActiveCampaign lets you choose from
saved templates directly in the action.

That is where the `PM` templates belong:

- `POS C01-E01 PM Welcome to Positives`
- `POS C02-E01 PM Your Trial Has Started`
- and the rest of the `PM` set

### Standard ActiveCampaign emails

For standard `Send email`, ActiveCampaign does `not` work the same way.

That screen usually gives you:

- `Create a new email`
- `Start from an existing email`
- `Select an email in this automation`

So yes: what you are seeing is normal.

The standard `AC` emails are not chosen from the same simple template dropdown
the way Postmark transactional templates are.

### Recommended standard-email workflow

For each `AC` step:

1. Click `Create a new email`
2. Start from scratch or from a saved design/template inside the editor
3. Name the email with the exact identifier from this doc
4. Build it once inside the automation
5. For later automations, use `Start from an existing email` to duplicate a
   prior AC email and then edit it

### Practical recommendation

Treat the `PM` emails as reusable template-driven emails.

Treat the `AC` emails as automation-owned emails that should still use the same
names, subjects, and copy, but may need to be created inside the automation
builder itself.

## Subject and preheader reference

Use these exact subjects and preheaders while wiring each automation. For `PM`
steps, the preheader is already embedded in the saved template. For `AC` steps,
enter the preheader as the standard ActiveCampaign preview text.

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

## Lifecycle model

### Durable milestone

- `first_login_complete`
  - keep on the contact
  - lifetime milestone
  - do not remove

### Reusable trigger tags

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

These should generally be removed after they have served their purpose so they
can be re-applied later for a true new lifecycle event.

### State tags

- `level_1`
- `level_2`
- `level_3`
- `level_4`
- `affiliate`
- `sms_opted_in`
- `canceled`
- `past_due`

These should remain on the contact while true.

## Live reminder model

- Live reminder automations are operational and should use `Postmark
  transactional` delivery inside ActiveCampaign
- The app writes current session fields and applies a reminder trigger tag
- Vercel Cron calls the reminder dispatcher every `15 minutes`
- The dispatcher uses a durable dispatch log so the same member/session/window
  cannot send twice
- Current repo truth:
  - both Level 2 `Events` and Level 3 `Coaching` are currently stored as
    `coaching_call` content rows
  - the app interprets `tier_min = level_2` as `event`
  - the app interprets `tier_min = level_3` / `level_4` as `coaching`

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

## Campaign map

## C01

### Automation

`POS | C01 | Welcome And Access`

### Purpose

Welcome the new member, reinforce the daily practice rhythm, and give them easy
ways to return to Positives during their first few days.

### Primary trigger

- `welcome_ready`

### Runs

- `Multiple times`

### Entry segment

- do `not` exclude contacts who already have `first_login_complete`
- checkout may auto-log the member into `/today` quickly after purchase
- the first welcome/access email should still send even when instant login
  succeeds

### Exit / pull-out rules

- do not use `first_login_complete` to pull contacts out of the main welcome
  sequence
- `first_login_complete` is useful for reporting/context, but instant-login
  buyers still need welcome/momentum emails
- app removes `welcome_ready`

### Tag handling

- `welcome_ready`
  - trigger tag
  - remove after use: `yes`
  - owner: `app`

### Steps

#### Step 1

- Email: `POS C01-E01 PM Welcome to Positives`
- Subject: `Welcome to Positives`
- Preheader: `Your membership is live. Start with today’s practice.`
- Delivery: `Postmark transactional`
- Postmark tag: `welcome`
- Timing: immediately
- CTA: `%LOGIN_LINK%`

#### Step 1 warning

- Do `not` put a jump-to-goal before this first email.
- If the member auto-logs in immediately after checkout, they may already have
  `first_login_complete` by the time ActiveCampaign evaluates the automation.
- The first welcome/access email is still useful as the member’s durable access
  email, so it should not be skipped.
- The same logic applies to the rest of the sequence: these are now welcome and
  momentum emails, not just login reminders.

#### Step 2

- Wait: `1 day`

#### Step 3

- Optional safety check:
  - if `canceled` exists, end
- Otherwise:
  - continue

#### Step 4

- Email: `POS C01-E02 AC Come Back to Today's Practice`
- Subject: `Come back to today’s practice`
- Preheader: `A few quiet minutes is enough to keep the rhythm going.`
- Delivery: `Standard ActiveCampaign`
- Timing: after first wait
- CTA: `%LOGIN_LINK%`

#### Step 5

- Wait: `2 days`

#### Step 6

- Optional safety check:
  - if `canceled` exists, end
- Otherwise:
  - continue

#### Step 7

- Email: `POS C01-E03 AC Make Positives Stick`
- Subject: `A simple way to make Positives stick`
- Preheader: `Start with Today, stay close to This Week, and let the habit build.`
- Delivery: `Standard ActiveCampaign`
- Timing: after second wait
- CTA: `%LOGIN_LINK%`

#### Optional reporting goal

- Goal name: `Member First Login`
- Goal condition: `first_login_complete` exists
- Use this for reporting/context only.
- Do not use this goal to pull contacts out of the main welcome sequence.

## C02

### Automation

`POS | C02 | Trial Lifecycle`

### Purpose

Handle trial access start and trial-end reminders.

### Primary triggers

- `trial_started`
- `trial_ending`

### Runs

- `Multiple times`

### Entry segments

- for `trial_started`
  - do `not` exclude contacts who already have `first_login_complete`
  - trial checkout may auto-log the member into `/today` quickly after purchase
  - the trial-start email should still send even when instant login succeeds
- for `trial_ending`
  - `canceled` does not exist

### Tag handling

- `trial_started`
  - trigger tag
  - remove after use: `yes`
  - owner: `app`
  - do not depend on this tag for later waits because the app may remove it
    quickly when first login is synced
- `trial_ending`
  - trigger tag
  - remove after use: `recommended`
  - owner: `app or automation`

### Branch A: Trial started

#### Step 1

- Email: `POS C02-E01 PM Your Trial Has Started`
- Subject: `Your Positives trial has started`
- Preheader: `You have full access now. Start with today’s practice.`
- Delivery: `Postmark transactional`
- Postmark tag: `trial_started`
- Timing: immediately
- CTA: `%LOGIN_LINK%`

### Branch B: Trial ending

#### Step 1

- Email: `POS C02-E02 PM Your Trial Ends Soon`
- Subject: `Your Positives trial ends soon`
- Preheader: `Review your billing details before your trial ends.`
- Delivery: `Postmark transactional`
- Postmark tag: `trial_ending`
- Timing: when `trial_ending` is added
- CTA: membership billing / upgrade path

#### Step 2

- Wait: `2 days`

#### Step 3

- If `canceled` exists:
  - end automation
- Else:
  - continue

#### Step 4

- Email: `POS C02-E03 PM Final Trial Reminder`
- Subject: `Final reminder before your trial ends`
- Preheader: `Keep access uninterrupted by confirming your payment method.`
- Delivery: `Postmark transactional`
- Postmark tag: `trial_ending_final`

## C04

### Automation

`POS | C04 | Payment Recovery`

### Purpose

Recover failed payments before access is paused.

### Primary trigger

- `payment_failed`

### Runs

- `Multiple times`

### Entry segment

- member is not `canceled`

### Tag handling

- `payment_failed`
  - recovery trigger / unresolved-billing marker
  - remove after use: `no`
  - owner: `app`
  - keep while billing is unresolved so later recovery steps can check it

### Exit / pull-out rules

- if `payment_failed` is removed, end automation
- if access is restored, optionally apply `access_restored`

### Steps

#### Step 1

- Email: `POS C04-E01 PM Action Needed on Your Billing`
- Subject: `Action needed: update your payment method`
- Preheader: `We could not process your payment, but your access is still active for now.`
- Delivery: `Postmark transactional`
- Postmark tag: `payment_failed`
- Timing: immediately
- CTA: `%BILLING_LINK%`

#### Step 2

- Wait: `3 days` or until `payment_failed` is removed

#### Step 3

- If `payment_failed` exists:
  - continue
- Else:
  - end automation

#### Step 4

- Email: `POS C04-E02 PM Billing Reminder`
- Subject: `Your Positives payment still needs attention`
- Preheader: `A quick reminder to update your card and keep access uninterrupted.`
- Delivery: `Postmark transactional`
- Postmark tag: `payment_failed_reminder`
- CTA: `%BILLING_LINK%`

#### Step 5

- Wait: `4 days` or until `payment_failed` is removed

#### Step 6

- If `payment_failed` exists:
  - continue
- Else:
  - end automation

#### Step 7

- Email: `POS C04-E03 PM Final Billing Reminder`
- Subject: `Final reminder before access is paused`
- Preheader: `Update your billing details to avoid interruption.`
- Delivery: `Postmark transactional`
- Postmark tag: `payment_failed_final`
- CTA: `%BILLING_LINK%`

## C05

### Automation

`POS | C05 | Plan Change`

### Purpose

Confirm upgrades and downgrades clearly.

### Primary trigger

- `tier_changed`

### Runs

- `Multiple times`

### Tag handling

- `tier_changed`
  - trigger tag
  - remove after use: `yes`
  - owner: `app or automation`

### Split logic

- if `%NEW_TIER%` is higher than `%PREVIOUS_TIER%`
  - use upgrade email
- else
  - use downgrade/change email

### Steps

#### Upgrade path

- Email: `POS C05-E01 PM Upgrade Confirmation`
- Subject: `Your Positives plan has been upgraded`
- Preheader: `Your membership now includes additional access.`
- Delivery: `Postmark transactional`
- Postmark tag: `plan_upgrade`

#### Downgrade path

- Email: `POS C05-E02 PM Downgrade Confirmation`
- Subject: `Your Positives plan has changed`
- Preheader: `Here’s a summary of your updated membership.`
- Delivery: `Postmark transactional`
- Postmark tag: `plan_downgrade`

## C06

### Automation

`POS | C06 | Cancellation`

### Purpose

Confirm cancellation and, if appropriate, remind the member when access ends.

### Primary trigger

- `canceled`

### Runs

- `Multiple times`

### Tag handling

- `canceled`
  - state tag
  - remove after use: `no`
  - owner: `app`

### Steps

#### Step 1

- Email: `POS C06-E01 PM Cancellation Confirmation`
- Subject: `Your Positives membership has been canceled`
- Preheader: `Your access will remain available through your current billing period.`
- Delivery: `Postmark transactional`
- Postmark tag: `cancellation_confirmed`

#### Optional Step 2

- Email: `POS C06-E02 PM Access Ending Soon`
- Subject: `Your Positives access ends soon`
- Preheader: `A quick reminder before your membership access ends.`
- Delivery: `Postmark transactional`
- Postmark tag: `cancellation_ending`
- Only use if you can correctly time against true access-end date

## C07

### Automation

`POS | C07 | Affiliate Onboarding`

### Purpose

Get a new affiliate set up and moving inside the Positives affiliate area.

### Primary trigger

- `affiliate`

### Runs

- `Multiple times` if you want re-entry later
- otherwise `Once` is acceptable

### Tag handling

- `affiliate`
  - mostly state tag
  - remove after use: `no`
  - owner: `app`

### Recommended later field / tag

- `affiliate_payout_ready`

### Steps

#### Step 1

- Email: `POS C07-E01 PM Affiliate Welcome`
- Subject: `Welcome to the Positives affiliate program`
- Preheader: `Your referral portal and share link are ready.`
- Delivery: `Postmark transactional`
- Postmark tag: `affiliate_welcome`
- CTA: `%FIRSTPROMOTER_PORTAL_URL%`

#### Step 2

- Wait: `1 day`

#### Step 3

- If `affiliate_payout_ready` exists:
  - end follow-up branch
- Else:
  - continue

#### Step 4

- Email: `POS C07-E02 AC Finish Your Payout Setup`
- Subject: `Complete your affiliate payout setup`
- Preheader: `Add your payout details so commissions can be paid correctly.`
- Delivery: `Standard ActiveCampaign`
- CTA: `%FIRSTPROMOTER_PORTAL_URL%`

#### Step 5

- Wait: `2 days`

#### Step 6

- If `affiliate_payout_ready` exists:
  - end
- Else:
  - continue

#### Step 7

- Email: `POS C07-E03 AC Your Link Is Ready to Share`
- Subject: `Your Positives referral link is ready to share`
- Preheader: `A quick reminder with your Positives referral link.`
- Delivery: `Standard ActiveCampaign`
- CTA: `%FIRSTPROMOTER_PORTAL_URL%`

## C09

### Automation

`POS | C09 | Post-Login Orientation`

### Current recommendation

Do `not` activate this automation at the same time as the revised `C01 Welcome
And Access` sequence unless you intentionally want a second onboarding stream.

For launch, treat `C01` as the primary first-week welcome/momentum sequence.
Keep `C09` as a later, optional deeper orientation sequence or rebuild it as a
tier-specific education flow after the first week.

### Purpose

Help a member understand how to use Positives after they successfully enter the
app for the first time.

### Primary trigger

- `first_login_complete`

### Runs

- `Once`

### Tag handling

- `first_login_complete`
  - durable milestone
  - remove after use: `no`
  - owner: `app`

### Exit / pull-out rules

- if `canceled` exists, end automation

### Steps

#### Step 1

- Email: `POS C09-E01 AC You're In, Here's Where to Start`
- Subject: `You’re in. Here’s where to start`
- Preheader: `A simple way to use Positives well from day one.`
- Delivery: `Standard ActiveCampaign`

#### Step 2

- Wait: `2 days`

#### Step 3

- Email: `POS C09-E02 AC The Best Way to Use Positives`
- Subject: `The easiest way to get value from Positives`
- Preheader: `Keep it simple: return daily, not perfectly.`
- Delivery: `Standard ActiveCampaign`

#### Step 4

- Wait: `3 days`

#### Step 5

- If/Else by tier tag

#### Step 6A

- Email: `POS C09-E03A AC Level 1 Orientation`
- Subject: `Make the most of your Positives membership`
- Preheader: `Daily practice, library access, and private reflection tools are ready.`
- Delivery: `Standard ActiveCampaign`

#### Step 6B

- Email: `POS C09-E03B AC Level 2 Orientation`
- Subject: `Your events access is ready`
- Preheader: `You can now join live member events and revisit replays.`
- Delivery: `Standard ActiveCampaign`

#### Step 6C

- Email: `POS C09-E03C AC Level 3 Orientation`
- Subject: `Your coaching access is ready`
- Preheader: `Your membership includes live coaching and replay access.`
- Delivery: `Standard ActiveCampaign`

## C10A

### Automation

`POS | C10A | Level 1 To Level 2 Progression`

### Purpose

Introduce Level 1 members to the value of live events after real engagement.

### Primary trigger

- `first_listen_complete`

### Runs

- `Once`

### Entry segment

- `level_1` exists

### Steps

#### Step 1

- Email: `POS C10-A1 AC Keep the Practice Going`
- Subject: `A simple way to keep your practice going`
- Preheader: `Consistency matters more than intensity.`
- Delivery: `Standard ActiveCampaign`

#### Step 2

- Wait: `4 days`

#### Step 3

- If `level_1` no longer exists:
  - end
- Else:
  - continue

#### Step 4

- Email: `POS C10-A2 AC Add Live Events`
- Subject: `Want more support around the practice?`
- Preheader: `Live events can help you stay connected and engaged.`
- Delivery: `Standard ActiveCampaign`

#### Step 5

- Wait: `5 days`

#### Step 6

- If `level_1` no longer exists:
  - end
- Else:
  - continue

#### Step 7

- Email: `POS C10-A3 AC Invitation to Upgrade`
- Subject: `If you’re ready for the next level of support`
- Preheader: `Here’s what Membership + Events adds.`
- Delivery: `Standard ActiveCampaign`

## C10B

### Automation

`POS | C10B | Level 2 To Level 3 Progression`

### Purpose

Invite engaged Level 2 members toward Coaching Circle.

### Primary trigger

- `first_event_attended`

### Runs

- `Once`

### Entry segment

- `level_2` exists

### Steps

#### Step 1

- Email: `POS C10-B1 AC You May Be Ready for More Support`
- Subject: `You may be ready for more direct support`
- Preheader: `If events are helping, coaching may be the next fit.`
- Delivery: `Standard ActiveCampaign`

#### Step 2

- Wait: `5 days`

#### Step 3

- If `level_2` no longer exists:
  - end
- Else:
  - continue

#### Step 4

- Email: `POS C10-B2 AC What Coaching Circle Adds`
- Subject: `What Coaching Circle adds`
- Preheader: `Live coaching can help you stay closer to the work.`
- Delivery: `Standard ActiveCampaign`

## C10C

### Automation

`POS | C10C | Inactivity Rescue`

### Purpose

Gently re-engage members who logged in but did not really start using the
product.

### Primary trigger

- `first_login_complete`

### Runs

- `Once`

### Entry segment

- no `first_listen_complete`
- no `first_journal_entry`

### Steps

#### Step 1

- Wait: `7 days`

#### Step 2

- If `first_listen_complete` or `first_journal_entry` now exists:
  - end
- Else:
  - continue

#### Step 3

- Email: `POS C10-C1 AC Come Back to Today's Practice`
- Subject: `Come back to today’s practice`
- Preheader: `You do not need to catch up. Just return.`
- Delivery: `Standard ActiveCampaign`

#### Step 4

- Wait: `4 days`

#### Step 5

- If `first_listen_complete` or `first_journal_entry` now exists:
  - end
- Else:
  - continue

#### Step 6

- Email: `POS C10-C2 AC A Gentle Reset`
- Subject: `A gentle way to reset`
- Preheader: `A few quiet minutes is enough to begin again.`
- Delivery: `Standard ActiveCampaign`

## C03

### Automation

`POS | C03 | Access Restored`

### Purpose

Confirm that access is back after a billing/access interruption and send the
member back to Today without treating them like a brand-new member.

### Primary trigger

- `access_restored`

### Runs

- `Multiple times`

### Entry segment

- member is active or trialing

### Tag handling

- `access_restored`
  - trigger tag
  - remove after use: `yes`
  - owner: `automation`

### Steps

#### Step 1

- Email: `POS C03-E01 PM Your Access Has Been Restored`
- Subject: `Your Positives access has been restored`
- Preheader: `Your Positives access is active again.`
- Delivery: `Postmark transactional`
- Postmark tag: `access_restored`
- CTA: `%LOGIN_LINK%`

#### Step 2

- Wait: `2 days`

#### Step 3

- If `first_listen_complete` or `first_journal_entry` exists:
  - end automation
- Else:
  - continue

#### Step 4

- Email: `POS C03-E02 PM Pick Up Where You Left Off`
- Subject: `Pick up where you left off`
- Preheader: `A gentle nudge back into your daily practice.`
- Delivery: `Postmark transactional`
- Postmark tag: `access_restored_followup`
- CTA: `%LOGIN_LINK%`

## C08

### Automation

`POS | C08 | Membership Reactivated`

### Purpose

Welcome a returning member back without restarting the first-time welcome
sequence.

### Primary trigger

- `membership_reactivated`

### Runs

- `Multiple times`

### Entry segment

- optional: `first_login_complete` exists

### Tag handling

- `membership_reactivated`
  - trigger tag
  - remove after use: `yes`
  - owner: `automation`

### Steps

#### Step 1

- Email: `POS C08-E01 PM Welcome Back to Positives`
- Subject: `Welcome back to Positives`
- Preheader: `Your membership is active again. Welcome back.`
- Delivery: `Postmark transactional`
- Postmark tag: `membership_reactivated`
- CTA: `%LOGIN_LINK%`

#### Step 2

- Wait: `2 days`

#### Step 3

- Email: `POS C08-E02 PM Here’s the Easiest Place to Resume`
- Subject: `Here’s the easiest place to resume`
- Preheader: `Start with Today and resume from there.`
- Delivery: `Postmark transactional`
- Postmark tag: `membership_reactivated_resume`
- CTA: `%LOGIN_LINK%`

## R01

### Automation

`POS | R01 | Level 2 Event Reminder - 24h`

### Purpose

Send the operational day-before reminder for the nearest qualifying Level 2
event.

### Primary trigger

- `event_reminder_24h`

### Runs

- `Multiple times`

### Steps

#### Step 1

- Email: `POS R01-E01 PM Event Tomorrow`
- Subject: `Reminder: %NEXT_EVENT_TITLE% is tomorrow`
- Preheader: `Your Positives event is coming up tomorrow.`
- Delivery: `Postmark transactional`
- Postmark tag: `event_24h`
- CTA: `%NEXT_EVENT_JOIN_URL%`

## R02

### Automation

`POS | R02 | Level 2 Event Reminder - 1h`

### Purpose

Send the operational one-hour reminder for the nearest qualifying Level 2
event.

### Primary trigger

- `event_reminder_1h`

### Runs

- `Multiple times`

### Steps

#### Step 1

- Email: `POS R02-E01 PM Event Starting Soon`
- Subject: `Starting soon: %NEXT_EVENT_TITLE%`
- Preheader: `Your Positives event starts soon.`
- Delivery: `Postmark transactional`
- Postmark tag: `event_1h`
- CTA: `%NEXT_EVENT_JOIN_URL%`

## R03

### Automation

`POS | R03 | Level 2 Replay Ready`

### Purpose

Send the replay-ready notice when event replay media exists.

### Primary trigger

- `event_replay_ready`

### Runs

- `Multiple times`

### Steps

#### Step 1

- Email: `POS R03-E01 PM Event Replay Ready`
- Subject: `Replay ready: %NEXT_EVENT_TITLE%`
- Preheader: `The replay is ready when you are.`
- Delivery: `Postmark transactional`
- Postmark tag: `event_replay`
- CTA: `%NEXT_EVENT_REPLAY_URL%`

## R04

### Automation

`POS | R04 | Level 3 Coaching Reminder - 24h`

### Purpose

Send the operational day-before reminder for the nearest qualifying Level 3
coaching session.

### Primary trigger

- `coaching_reminder_24h`

### Runs

- `Multiple times`

### Steps

#### Step 1

- Email: `POS R04-E01 PM Coaching Tomorrow`
- Subject: `Reminder: %NEXT_EVENT_TITLE% is tomorrow`
- Preheader: `Your coaching session is coming up tomorrow.`
- Delivery: `Postmark transactional`
- Postmark tag: `coaching_24h`
- CTA: `%NEXT_EVENT_JOIN_URL%`

## R05

### Automation

`POS | R05 | Level 3 Coaching Reminder - 1h`

### Purpose

Send the operational one-hour reminder for the nearest qualifying Level 3
coaching session.

### Primary trigger

- `coaching_reminder_1h`

### Runs

- `Multiple times`

### Steps

#### Step 1

- Email: `POS R05-E01 PM Coaching Starting Soon`
- Subject: `Starting soon: %NEXT_EVENT_TITLE%`
- Preheader: `Your coaching session starts soon.`
- Delivery: `Postmark transactional`
- Postmark tag: `coaching_1h`
- CTA: `%NEXT_EVENT_JOIN_URL%`

## R06

### Automation

`POS | R06 | Level 3 Replay Ready`

### Purpose

Send the replay-ready notice when coaching replay media exists.

### Primary trigger

- `coaching_replay_ready`

### Runs

- `Multiple times`

### Steps

#### Step 1

- Email: `POS R06-E01 PM Coaching Replay Ready`
- Subject: `Replay ready: %NEXT_EVENT_TITLE%`
- Preheader: `The coaching replay is ready when you are.`
- Delivery: `Postmark transactional`
- Postmark tag: `coaching_replay`
- CTA: `%NEXT_EVENT_REPLAY_URL%`

## Still missing in app code

These automations are planned correctly, but some triggers are not yet being
fired by the app:

- `first_listen_complete`
- `first_journal_entry`
- `first_event_attended`
- `affiliate_payout_ready`
- event attendance / replay behavioral triggers beyond the reminder dispatcher

## Highest-leverage next implementation work

1. Wire `C03`, `C08`, and the `R01-R06` reminder automations in ActiveCampaign
   using the existing `PM` templates.
2. Add `first_listen_complete`, `first_journal_entry`, and `first_event_attended`
   so `C10A-C10C` can run from real behavior instead of future placeholders.
3. Decide whether to add richer event-specific reminder copy fields later or
   keep v1 fully template-driven.
