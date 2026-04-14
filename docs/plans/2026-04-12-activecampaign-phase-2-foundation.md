# ActiveCampaign Phase 2 Foundation

Date: 2026-04-12
Owner: Codex

## Summary

This pass completed the Phase 2 foundation work that could be done safely from the repo and the ActiveCampaign API:

- audited the current app-owned and ActiveCampaign-owned email flows
- locked the recommended ActiveCampaign contact model
- defined unsubscribe, consent, and re-opt-in rules
- locked the current trigger model for `App -> ActiveCampaign -> Postmark`
- created real ActiveCampaign lead-capture form shells
- tightened the ActiveCampaign account structure so the team can start using it

Important limitation:

- the ActiveCampaign API available to this account supports contact, list, tag, field, and form work
- it does **not** appear to support creating full automations from the API
- the first automation builds therefore still need dashboard/UI work

## What The App Triggers Today

### Auth and security emails

Source:

- Supabase Auth email sending (SMTP)

Emails:

- signup / magic link
- password recovery
- invite
- email-change confirmation

Classification:

- transactional / security

Recommendation:

- keep app-owned
- do not move these into ActiveCampaign
- send via SMTP (Postmark) in Supabase, not via app routes

### Stripe-triggered lifecycle and billing emails

Source:

- `server/services/stripe/handle-checkout.ts`
- `server/services/stripe/handle-subscription.ts`

Current behavior:

- app sets ActiveCampaign tags and fields only
- ActiveCampaign automations send the emails (via Postmark)

Triggers:

- welcome / trial started
- receipt / payment succeeded
- payment failed
- trial ending
- tier change

Related ActiveCampaign sync:

- `syncWelcomeEmail()`
- `syncPaymentSucceeded()`
- `syncPaymentFailed()`
- `syncPaymentRecovered()`
- `syncTrialEnding()`
- `syncTierChange()`
- `syncCancellation()`

Classification:

- mixed
- welcome and trial-started behave like lifecycle / marketing
- receipt, payment failed immediate, and trial ending are closer to essential transactional

### Cron-owned lifecycle sequences

Current behavior:

- removed from the app
- all lifecycle sequences are owned in ActiveCampaign

### Unsubscribe and preferences

Source:

- `app/api/unsubscribe/route.ts`
- `app/(member)/account/actions.ts`

Current behavior:

- updates `member.email_unsubscribed`
- syncs ActiveCampaign list subscription status

Recommendation:

- keep the app as the source of truth for the member preference toggle
- keep ActiveCampaign list status aligned from the app

### Admin email surfaces

Current behavior:

- removed from the app

Recommendation:

- ActiveCampaign is the single source of truth for email content and automation

## ActiveCampaign Account State After This Pass

### Lists

- `List 3` renamed from `Positives Members` to `Positives Audience`

Why:

- the current app sync is list-ID based, so the ID stays stable
- the new name now works for both members and non-member leads

### Existing lifecycle tags

- `level_1`
- `level_2`
- `level_3`
- `level_4`
- `past_due`
- `canceled`
- `founding_member`
- `onboarding_complete`
- `affiliate`

### New foundation tags created

- `source_general_optin`
- `source_save_enrich`
- `source_affiliate_interest`
- `status_lead`
- `welcome_ready`
- `trial_started`
- `payment_succeeded`
- `trial_ending`
- `tier_changed`
- `payment_failed`

These are meant to support non-member lead capture and future automation triggers.

### Existing fields

- `Membership Tier`
- `Member Since`
- `Stripe Customer ID`
- `Affiliate Link`
- `Affiliate Ref ID`
- `Affiliate Portal URL`
- `Billing Portal URL`
- `Billing Link`

### New foundation fields created

- `Contact Role`
- `Acquisition Source`
- `Opt-In Entry Point`
- `Login Link`
- `Trial End Date`
- `Amount Paid`
- `Invoice Number`
- `Invoice URL`
- `Next Billing Date`
- `Previous Tier`
- `New Tier`
- `Plan Name`

### Forms created

- `Form 3` — `Positives General Opt-In`
- `Form 4` — `Positives - Affiliate Interest Opt-In`
- `Form 5` — `Positives - Save and Enrich Opt-In`

These are shell forms, not finished embedded experiences. They give the team a real AC-side entry point to refine in the dashboard.

### Existing automations found

- `Affiliate Welcome` — active
- `Past Due Recovery` — present but inactive

## Recommended Contact Model

### Source of truth

- the app remains the source of truth for member identity, billing state, and secure account events
- ActiveCampaign is the lifecycle and CRM layer
- Postmark is the future transactional delivery layer behind ActiveCampaign, not a separate app-owned brain

### List strategy

Use one main marketing-permission list for now:

- `Positives Audience`

Meaning:

- list active = allowed to receive marketing / lifecycle email
- list unsubscribed = opted out of marketing
- essential transactional emails are not blocked by this

### Role model

Use tags for role and lifecycle state because contacts can hold more than one role:

- `status_lead`
- `level_1` ... `level_4`
- `affiliate`
- `past_due`
- `canceled`

Use fields for reporting and segmentation context:

- `Contact Role`
- `Acquisition Source`
- `Opt-In Entry Point`

Recommended values:

- `Contact Role`
  - `lead`
  - `member`
  - `affiliate`
  - `member_affiliate`
- `Acquisition Source`
  - `general_optin`
  - `save_and_enrich`
  - `affiliate_interest`
  - `checkout_paid`
  - `checkout_trial`
- `Opt-In Entry Point`
  - human-readable route or funnel name such as `/join`, `/try`, `save-and-enrich`, `partner-webinar`

### Member state model

Keep using the existing tags and fields:

- tier tags indicate active plan access
- `past_due` and `canceled` indicate billing risk / churn state
- `Member Since` and `Stripe Customer ID` stay as CRM reference fields
- `Billing Link` remains the merge field for past-due recovery flows

## Consent, Unsubscribe, And Re-Opt-In Rules

### Marketing / lifecycle emails

These should stay unsubscribable:

- general opt-in follow-up
- save-and-enrich lead magnet sequence
- onboarding day 3 / 7 / 14
- affiliate nurture
- winback
- payment recovery day 3 / 7
- future upsell / onboarding-complete sequences

Suppression behavior:

- ActiveCampaign list status should move to unsubscribed
- app flag `member.email_unsubscribed` should stay aligned

### Essential transactional emails

These should remain sendable even after marketing unsubscribe:

- auth / magic link / password reset / email-change
- receipt
- payment failed immediate notice
- trial ending reminder
- security and account notices

### Gray-area lifecycle emails

These are currently app-owned and still include marketing-style footer behavior:

- welcome
- trial started

Recommended direction:

- move these into ActiveCampaign lifecycle ownership later
- keep them unsubscribable once moved there
- do not reclassify them as strict transactional just to avoid unsubscribe logic

### Re-opt-in rules

- if a member manually re-enables marketing in the app, resubscribe them on `Positives Audience`
- a purchase alone should **not** silently overwrite a prior marketing opt-out
- essential transactional sends still continue regardless

## Locked Trigger Model

### Keep app-owned now

- Supabase auth email hook
- one-click unsubscribe endpoint
- member email preference toggle
- Stripe webhook source of truth

### App events that should map into ActiveCampaign

- checkout success / new member
- trial started
- tier change
- cancellation
- payment failed
- payment recovered
- onboarding complete
- affiliate enrollment
- marketing opt-in / opt-out changes

### Current bridge-sprint rule

- the app continues to send the current transactional and lifecycle emails while the ActiveCampaign foundation is being prepared
- ActiveCampaign receives the tags, fields, and list state needed for future automation ownership
- Postmark cutover is not part of this pass

### Target rule after future cutover

- app emits trusted product events
- ActiveCampaign owns lifecycle automation logic
- Postmark handles transactional delivery behind ActiveCampaign where appropriate
- auth/security stays app-controlled even if the delivery provider changes

## First Automations To Build In The Dashboard

The API available here did not support creating full automations directly, so these still need dashboard work.

### 1. Save and Enrich Opt-In

Trigger:

- form `Positives - Save and Enrich Opt-In`
- add tag `source_save_enrich`

Actions:

- confirm opt-in / deliver asset
- short nurture toward Positives

### 2. General Opt-In Welcome

Trigger:

- form `Positives General Opt-In`
- add tag `source_general_optin`

Actions:

- welcome sequence
- orient to Positives

### 3. Affiliate Welcome

Current state:

- already present and active

Trigger:

- `affiliate` tag

### 4. Onboarding Complete Upsell

Trigger:

- `onboarding_complete` tag

Actions:

- explain next-step value
- point toward higher-tier upgrade path

### 5. Past Due Recovery

Current state:

- automation exists but is inactive

Trigger:

- `past_due` tag
- use `Billing Link` merge field in CTA

## What Was Actually Completed In ActiveCampaign

- renamed the main list to `Positives Audience`
- created four source / role tags
- created three new source / role fields
- created three real opt-in form shells
- verified the current automation inventory

## What Still Needs Dashboard Work

- refine the form layouts and embed strategy
- create or activate the first non-affiliate automations in the AC UI
- connect each form to the exact tags / field updates the team wants
- decide whether `Past Due Recovery` should be activated as-is or rebuilt
- later, prepare Postmark and then move transactional delivery
