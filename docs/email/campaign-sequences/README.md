# Positives Email Sequence Drafts

Date: 2026-04-14
Owner: Ryan + Codex

This folder contains the `actual review copy` for each email campaign before
templates are built in ActiveCampaign or Supabase.

## Delivery lanes

### Postmark transactional

Use for emails that are:

- expected because of a purchase, trial, billing event, or account change
- time-sensitive
- primarily service-related
- not promotional

### Standard ActiveCampaign

Use for emails that are:

- onboarding / orientation
- engagement support
- progression / upsell
- reminder or educational emails that are not strictly required to complete a
  transaction

### Supabase SMTP

Use for:

- magic links
- password resets
- email change confirmation
- other auth/security emails

## Sequence files

- `01-welcome-and-access-sequence.md`
- `02-trial-lifecycle-sequence.md`
- `03-receipt-policy-sequence.md`
- `04-payment-recovery-sequence.md`
- `05-plan-change-sequence.md`
- `06-cancellation-sequence.md`
- `07-affiliate-onboarding-sequence.md`
- `08-auth-and-security-sequence.md`
- `09-post-login-orientation-sequence.md`
- `10-tier-progression-and-upsell-sequence.md`

## Review goal

Use these files to approve:

- which emails exist
- what lane each email belongs in
- the subject and preview copy
- the CTA destination
- the actual draft body copy

After review, these become the source for template buildout.

## ActiveCampaign naming convention

Templates built in ActiveCampaign should use:

- `POS`
  - Positives
- `C##`
  - campaign number
- `E##`
  - email number
- `PM`
  - Postmark transactional email
- `AC`
  - standard ActiveCampaign email

Examples:

- `POS C01-E01 PM Welcome to Positives`
- `POS C01-E02 AC Your Membership Is Ready`
- `POS C09-E03B AC Level 2 Orientation`

Supabase auth/security emails are not created in ActiveCampaign.
