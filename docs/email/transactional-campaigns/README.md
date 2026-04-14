# Positives Transactional Campaign Map

Date: 2026-04-14
Owner: Ryan + Codex

This folder is the working source of truth for transactional email planning in
`ActiveCampaign + Postmark`.

These files are intentionally organized by `campaign`, not by individual HTML
template, so we can decide:

- which automations we actually need
- which emails belong in each automation
- which merge fields and tags are required
- which sequences are launch-critical vs later

Reviewable draft copy now lives in:

- `docs/email/campaign-sequences/README.md`
- `docs/email/campaign-sequences/*.md`

## System split

### Postmark transactional

Use ActiveCampaign automations with the `Send transactional email (Postmark)`
action only for emails that are operational, expected, and time-sensitive.

Recommended campaigns / emails:

- membership welcome
- trial lifecycle
- payment recovery
- plan changes
- cancellation notices
- affiliate welcome

### Standard ActiveCampaign

Use standard ActiveCampaign emails for:

- access reminders after the initial welcome
- affiliate follow-up
- post-login orientation
- inactivity rescue
- tier progression and upsell

### Supabase SMTP

Use Supabase auth email via SMTP for:

- magic link sign-in
- password reset
- email change confirmation
- invite / auth system email

Those are documented here too so the full transactional system is clear, but
they are not built in ActiveCampaign.

## Recommended campaign set

### Launch-critical now

1. `01-welcome-and-access.md`
2. `02-trial-lifecycle.md`
3. `03-payment-receipts.md`
4. `04-payment-recovery.md`
5. `05-plan-change.md`
6. `06-cancellation.md`
7. `07-affiliate-onboarding.md`
8. `08-auth-and-security.md`

### Recommended next-layer lifecycle campaigns

9. `09-post-login-orientation.md`
10. `10-tier-progression-and-upsell.md`

## Important link rules

These should stay true across every transactional email:

- every CTA must use a full `https://` URL
- every link merge field must be populated before the trigger tag is applied
- affiliate emails should link to the `Positives affiliate portal page`, not
  directly to FirstPromoter
- payment-recovery emails should link to the `signed billing recovery URL`
- welcome / trial emails should link to the `magic-link onboarding URL`

## Current recommended CTA destinations

- Welcome / trial access:
  - `%LOGIN_LINK%`
- Payment recovery:
  - `%BILLING_LINK%`
- Affiliate:
  - `%AFFILIATE_PORTAL_URL%` or `%FIRSTPROMOTER_PORTAL_URL%` if we keep the
    existing field name but repoint it to the Positives member portal route
    instead of FirstPromoter directly

## Recommended next step after approving these docs

1. Lock the campaign list.
2. Lock the merge field list.
3. Fix app-side field syncing where needed.
4. Approve the draft copy in `docs/email/campaign-sequences/*.md`.
5. Create the final templates for each approved email.
6. Build the automations in ActiveCampaign.

## Recommended trigger model

The cleanest lifecycle split is:

1. `Welcome / Access`
   - starts on purchase
   - ends on first successful member login
2. `Post-Login Orientation`
   - starts on first successful member login
   - helps members understand how to use Positives
3. `Tier Progression / Upsell`
   - starts from meaningful product behavior
   - should be split by tier and engagement level

Recommended new app-to-AC sync items:

- tag: `first_login_complete`
- field: `FIRST_LOGIN_AT`
- optional tags for later:
  - `first_listen_complete`
  - `first_journal_entry`
  - `first_event_attended`
