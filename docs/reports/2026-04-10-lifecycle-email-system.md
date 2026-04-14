# Positives Lifecycle Email System

## Purpose

This document defines the current source of truth for member lifecycle emails and
the minimum required launch sequences.

The goal is to avoid running the same lifecycle from two systems at once.

Detailed campaign-by-campaign planning now lives in:

- `docs/email/transactional-campaigns/README.md`
- `docs/email/transactional-campaigns/*.md`

## System Of Record

### ActiveCampaign + Postmark (lifecycle + transactional)

ActiveCampaign is the automation brain and sends lifecycle + transactional email
using Postmark as the delivery layer.

The app does not send emails directly. It only sets tags and fields used by AC automations.

Primary app sources:

- `server/services/stripe/handle-checkout.ts`
- `server/services/stripe/handle-subscription.ts`
- `lib/activecampaign/sync.ts`

### Supabase Auth (security emails)

Supabase sends auth and security email via SMTP (Postmark).

These emails stay outside ActiveCampaign:

- magic link sign-in
- password reset
- email change confirmations
- invite

## Minimum Required Launch Sequences

These should be considered launch-gate sequences.

### 1. Branded auth emails

Owner: Supabase SMTP (Postmark)

Required:

- magic link sign-in
- password reset
- email change confirmations

Status:

- requires Supabase SMTP configuration in production

### 2. New member welcome

Owner: ActiveCampaign (triggered by app tag)

Trigger:

- checkout completion tag/field sync

Status:

- required
- automation must be verified in AC

### 3. Payment receipt

Owner: none for now

Decision:

- Positives does not send receipt emails for now
- do not build a receipt automation in ActiveCampaign

Status:

- intentionally deferred / off

### 4. Immediate payment failed email

Owner: ActiveCampaign (triggered by app tag + billing link)

Trigger:

- `invoice.payment_failed`

Status:

- required
- automation must be verified in AC

### 5. Onboarding drip

Owner: ActiveCampaign

Timing:

- day 3
- day 7
- day 14

Status:

- required if onboarding sequence is part of launch experience
- automation must be verified in AC

### 6. Payment recovery follow-up

Owner: ActiveCampaign

Timing:

- day 3
- day 7

Status:

- recommended
- ensure no duplicate sequences run in parallel

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
- defer the actual upsell automation until the offer and copy are finalized

### Win-back sequence

Owner: ActiveCampaign

Timing:

- day 1
- day 14
- day 30

Recommendation:

- nice to have
- not a launch blocker if the core member lifecycle is stable

## Recommended Launch Split

Use this split for launch:

### ActiveCampaign owns

- welcome
- immediate payment failed
- onboarding day 3 / 7 / 14
- payment recovery day 3 / 7
- win-back if kept active
- affiliate welcome

### Supabase owns

- auth emails via SMTP (Postmark)

### The app owns

- product and billing events
- ActiveCampaign tag/field sync

## Manual Follow-Ups Still Needed

### Required

- configure Supabase SMTP in production
- verify AC automations for welcome, payment failed, and onboarding

### Required only if affiliate launch stays live

- verify the affiliate welcome automation in ActiveCampaign

### Deferred / optional

- build the `onboarding_complete` upsell automation in ActiveCampaign

## Bottom Line

For launch, Positives should run a single email system:

- `ActiveCampaign` for lifecycle + transactional email (delivered by Postmark)
- `Supabase SMTP` for auth/security email (delivered by Postmark)

That keeps the member journey in one automation system while retaining secure auth flows in Supabase.
