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

These should generally be removed after they have served their purpose so they
can be re-applied later for a true new lifecycle event.

### State tags

- `level_1`
- `level_2`
- `level_3`
- `level_4`
- `affiliate`
- `canceled`
- `past_due`

These should remain on the contact while true.

## Campaign map

## C01

### Automation

`POS | C01 | Welcome And Access`

### Purpose

Get a brand-new member to first login.

### Primary trigger

- `welcome_ready`

### Runs

- `Multiple times`

### Entry segment

- `first_login_complete` does not exist

### Exit / pull-out rules

- if `first_login_complete` is added at any point, end automation
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
- Delivery: `Postmark transactional`
- Postmark tag: `welcome`
- Timing: immediately
- CTA: `%LOGIN_LINK%`

#### Step 2

- Wait: `1 day` or until `first_login_complete`

#### Step 3

- If `first_login_complete` exists:
  - end automation
- Else:
  - continue

#### Step 4

- Email: `POS C01-E02 AC Your Membership Is Ready`
- Subject: `Your Positives membership is ready`
- Delivery: `Standard ActiveCampaign`
- Timing: after first wait
- CTA: `%LOGIN_LINK%`

#### Step 5

- Wait: `2 days` or until `first_login_complete`

#### Step 6

- If `first_login_complete` exists:
  - end automation
- Else:
  - continue

#### Step 7

- Email: `POS C01-E03 AC Need Help Getting In`
- Subject: `Need help getting into Positives?`
- Delivery: `Standard ActiveCampaign`
- Timing: after second wait
- CTA: `%LOGIN_LINK%`

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
  - `first_login_complete` does not exist
- for `trial_ending`
  - `canceled` does not exist

### Tag handling

- `trial_started`
  - trigger tag
  - remove after use: `yes`
  - owner: `app`
- `trial_ending`
  - trigger tag
  - remove after use: `recommended`
  - owner: `app or automation`

### Branch A: Trial started

#### Step 1

- Email: `POS C02-E01 PM Your Trial Has Started`
- Subject: `Your Positives trial has started`
- Delivery: `Postmark transactional`
- Postmark tag: `trial_started`
- Timing: immediately
- CTA: `%LOGIN_LINK%`

### Branch B: Trial ending

#### Step 1

- Email: `POS C02-E02 PM Your Trial Ends Soon`
- Subject: `Your Positives trial ends soon`
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
  - trigger tag
  - remove after use: `yes`
  - owner: `app`

### Exit / pull-out rules

- if `payment_failed` is removed, end automation
- if access is restored, optionally apply `access_restored`

### Steps

#### Step 1

- Email: `POS C04-E01 PM Action Needed on Your Billing`
- Subject: `Action needed: update your payment method`
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
- Delivery: `Postmark transactional`
- Postmark tag: `plan_upgrade`

#### Downgrade path

- Email: `POS C05-E02 PM Downgrade Confirmation`
- Subject: `Your Positives plan has changed`
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
- Delivery: `Postmark transactional`
- Postmark tag: `cancellation_confirmed`

#### Optional Step 2

- Email: `POS C06-E02 PM Access Ending Soon`
- Subject: `Your Positives access ends soon`
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
- Delivery: `Standard ActiveCampaign`
- CTA: `%FIRSTPROMOTER_PORTAL_URL%`

## C09

### Automation

`POS | C09 | Post-Login Orientation`

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
- Delivery: `Standard ActiveCampaign`

#### Step 2

- Wait: `2 days`

#### Step 3

- Email: `POS C09-E02 AC The Best Way to Use Positives`
- Subject: `The easiest way to get value from Positives`
- Delivery: `Standard ActiveCampaign`

#### Step 4

- Wait: `3 days`

#### Step 5

- If/Else by tier tag

#### Step 6A

- Email: `POS C09-E03A AC Level 1 Orientation`
- Subject: `Make the most of your Positives membership`
- Delivery: `Standard ActiveCampaign`

#### Step 6B

- Email: `POS C09-E03B AC Level 2 Orientation`
- Subject: `Your events access is ready`
- Delivery: `Standard ActiveCampaign`

#### Step 6C

- Email: `POS C09-E03C AC Level 3 Orientation`
- Subject: `Your coaching access is ready`
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
- Delivery: `Standard ActiveCampaign`

## Still missing in app code

These automations are planned correctly, but some triggers are not yet being
fired by the app:

- `first_listen_complete`
- `first_journal_entry`
- `first_event_attended`
- `affiliate_payout_ready`
- `access_restored`
- `membership_reactivated`

## Highest-leverage next implementation work

1. Fix the `first_login_complete` app write path so it succeeds reliably.
2. Finish wiring `C01` and `C09` in ActiveCampaign.
3. Decide whether to build `C10A`, `C10B`, and `C10C` now or defer until the
   related app triggers exist.
4. Add comeback automations for:
   - `access_restored`
   - `membership_reactivated`
