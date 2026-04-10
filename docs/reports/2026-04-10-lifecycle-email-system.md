# Positives Lifecycle Email System

## Purpose

This document defines the current source of truth for member lifecycle emails and
the minimum required launch sequences.

The goal is to avoid running the same lifecycle from two systems at once.

## System Of Record

### Resend / app-owned sequences

These are the primary system of record for launch-critical member lifecycle email:

- auth emails via Supabase Send Email Hook
- welcome email after checkout
- receipt email after successful payment
- payment failed email sent immediately on `invoice.payment_failed`
- onboarding drip on days 3, 7, and 14
- payment recovery follow-up on days 3 and 7
- win-back follow-up on days 1, 14, and 30

These flows already live in the app and are backed by:

- `server/services/stripe/handle-checkout.ts`
- `server/services/stripe/handle-subscription.ts`
- `app/api/auth/send-email-hook/route.ts`
- `app/api/cron/onboarding-drip/route.ts`
- `app/api/cron/payment-recovery-drip/route.ts`
- `app/api/cron/winback-drip/route.ts`

### ActiveCampaign

ActiveCampaign is currently best treated as a CRM / tagging / selective automation layer, not
the primary delivery engine for core lifecycle email.

Current ActiveCampaign responsibilities:

- create or update member contacts
- subscribe members to the Positives Members list
- apply exact membership tier tags
- apply and clear `past_due`
- apply `founding_member`
- apply `affiliate`
- apply `onboarding_complete`
- store searchable custom field values such as tier, member-since date, Stripe customer ID, and billing link

Primary file:

- `lib/activecampaign/sync.ts`

## Minimum Required Launch Sequences

These should be considered launch-gate sequences.

### 1. Branded auth emails

Owner: app + Resend

Required:

- magic link sign-in
- password reset
- email change confirmations

Status:

- code is ready
- launch still depends on enabling the Supabase Send Email Hook in the hosted project

### 2. New member welcome

Owner: app + Resend

Trigger:

- checkout completion

Status:

- required
- implemented

### 3. Payment receipt

Owner: app + Resend

Trigger:

- successful Stripe invoice payment

Status:

- required
- implemented

### 4. Immediate payment failed email

Owner: app + Resend

Trigger:

- `invoice.payment_failed`

Status:

- required
- implemented

### 5. Onboarding drip

Owner: app + Resend

Timing:

- day 3
- day 7
- day 14

Status:

- required
- implemented

### 6. Payment recovery follow-up

Owner: app + Resend

Timing:

- day 3
- day 7

Status:

- required
- implemented

Important decision:

- do **not** also enable an ActiveCampaign past-due recovery email automation
- the app already owns payment recovery messaging
- enabling AC recovery would risk duplicate member emails

### 7. Affiliate welcome / onboarding

Owner: ActiveCampaign

Trigger:

- `affiliate` tag applied after affiliate enrollment

Status:

- required if affiliate portal is live at launch
- current architecture expects AC to handle this trigger

## Non-Blocking Or Deferred Sequences

These are useful, but they should not block launch.

### Onboarding complete upsell

Current trigger:

- `onboarding_complete` tag applied after day-14 onboarding email

Recommendation:

- keep the tag sync in place
- defer the actual upsell automation until the upsell offer and copy are finalized

### Win-back sequence

Owner: app + Resend

Timing:

- day 1
- day 14
- day 30

Recommendation:

- nice to have
- not a launch blocker if the rest of the member lifecycle is stable

## Recommended Launch Split

Use this split for launch:

### App / Resend owns

- auth emails
- welcome
- receipt
- immediate payment failed
- onboarding day 3 / 7 / 14
- payment recovery day 3 / 7
- win-back if kept active

### ActiveCampaign owns

- member CRM record
- tier tags
- affiliate tag + affiliate welcome automation
- optional future upsell automation based on `onboarding_complete`

### ActiveCampaign should not own

- core payment recovery email delivery
- core onboarding drip delivery
- core transactional email delivery

## Manual Follow-Ups Still Needed

### Required

- enable Supabase Send Email Hook in the hosted Supabase project

### Required only if affiliate launch stays live

- verify the affiliate welcome automation in ActiveCampaign

### Deferred / optional

- build the `onboarding_complete` upsell automation in ActiveCampaign

## Bottom Line

For launch, Positives should run a hybrid system:

- `Resend + app cron` for core lifecycle and transactional email
- `ActiveCampaign` for CRM state, tags, and selected marketing automation

That keeps the critical member journey in one reliable app-owned system and reduces the risk of
duplicate or conflicting lifecycle emails.
