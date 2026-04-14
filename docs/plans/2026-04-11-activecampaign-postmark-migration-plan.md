# ActiveCampaign + Postmark Migration Plan

## Goal

Move Positives from the current mixed email setup toward:

- `ActiveCampaign` as the main automation and lifecycle system
- `Postmark` as the transactional email delivery provider
- no long-term dependence on legacy app-owned email tooling
- no long-term dependence on the in-app admin email editing surfaces as the main email-control center

This is a migration plan, not an instruction to change everything at once.

## Why This Direction

- The team needs real marketing automation right away.
- ActiveCampaign is easier for non-technical team members to manage for opt-ins, nurture, segmentation, and ongoing changes.
- Postmark is a cleaner long-term transactional delivery layer than trying to make marketing software do every kind of email.
- Keeping both marketing automation and transactional delivery outside the core app reduces the amount of lifecycle logic trapped in code.

## Important Truth

This is not truly a “one tool” setup.

The closest practical target is:

- `ActiveCampaign = automation brain`
- `Postmark = transactional delivery layer`
- `App = source of product events and secure auth/billing triggers`

That means the app still matters. It just should not own more email logic than necessary.

## Current State

As of 2026-04-14, Positives no longer sends transactional or lifecycle email directly from the app:

- auth emails are sent by Supabase via SMTP (Postmark)
- Stripe webhooks only set ActiveCampaign tags and fields
- ActiveCampaign automations send lifecycle and transactional email (via Postmark)
- app-owned cron sequences are removed
- admin email template management surfaces are removed

There is also existing ActiveCampaign sync logic in:

- [client.ts](/Users/ryanbradshaw/AntiGravity/positives-membership/lib/activecampaign/client.ts)
- [sync.ts](/Users/ryanbradshaw/AntiGravity/positives-membership/lib/activecampaign/sync.ts)

## Target State

### ActiveCampaign should own

- lead capture and opt-ins
- nurture sequences
- onboarding/lifecycle sequences that the team wants to manage
- affiliate welcome and future affiliate nurture
- tags, fields, lists, and lifecycle state
- team-managed campaign logic

### Postmark should own

- transactional delivery for app-triggered emails
- receipts
- payment/account notices
- trial/account/billing confirmations
- security/account delivery once migrated

### The app should still own

- the product events that trigger lifecycle changes
- secure auth flow integration
- the business rules for who should receive what
- synchronization into ActiveCampaign
- transactional send triggers where the product must initiate the email

## Recommended Migration Order

### Phase 1. Audit and design

1. Inventory every current email.
2. Classify each email:
   - auth/security
   - billing/account
   - lifecycle/nurture
   - affiliate
   - win-back
   - support/operational
3. Define the future owner of each email:
   - ActiveCampaign
   - Postmark
   - app trigger + Postmark delivery
4. Define consent and unsubscribe rules before moving more logic.

### Phase 2. Prepare ActiveCampaign

1. Audit the current AC account.
2. Clean up or confirm:
   - lists
   - tags
   - custom fields
   - naming conventions
   - lifecycle states
3. Set up the first real forms and entry points for:
   - opt-ins
   - lead magnets
   - affiliate entry if needed
4. Build the first automations the team most needs.

Recommended first automations:

- affiliate welcome
- lead magnet / ebook opt-in
- new lead nurture
- onboarding or upsell follow-up

### Phase 3. Prepare Postmark

1. Create the account.
2. Verify the sender domain.
3. Set up the right server/message-stream structure.
4. Confirm account ownership and billing ownership.

### Phase 4. Verify transactional delivery

1. Confirm Postmark sender domain and message streams.
2. Re-test:
   - auth
   - checkout success / welcome
   - receipt
   - payment failed
   - trial notices
   - cancellation / account emails
3. Verify in production-like conditions.

### Phase 5. Verify lifecycle ownership

1. Rebuild the selected lifecycle sequences in ActiveCampaign (if not already).
2. Validate delivery timing and segmentation rules.
3. Keep a written map of:
   - what ActiveCampaign owns
   - what the app still triggers
   - what is intentionally deferred

### Phase 6. Documentation + monitoring

1. Keep docs and env vars aligned with the current stack.
2. Add monitoring for key email events (delivery failures, payment failures).
3. Maintain a simple audit checklist for launch readiness.

## Biggest Risks

### 1. Duplicate sends

If app-owned sequences stay on while AC versions go live, members can get doubled onboarding, win-back, or payment-related email.

### 2. Missing transactional email

If the Postmark cutover is incomplete, auth or billing emails can quietly break.

### 3. Consent confusion

If marketing and transactional rules are not defined clearly, unsubscribes and re-opt-ins will become messy.

### 4. Two sources of truth

If the app admin email tools, ActiveCampaign, and Postmark are all “kind of live” at once, the team will not know where to make changes.

## Recommended Rules

### Marketing email

- owned by ActiveCampaign
- unsubscribe should stop marketing
- examples:
  - ebook follow-up
  - nurture
  - upsells
  - affiliate nurture
  - optional practice/lifestyle messaging

### Transactional email

- delivered by Postmark
- still triggered by the product where appropriate
- examples:
  - auth/security
  - receipts
  - billing notices
  - trial ending confirmations
  - cancellation confirmations

### Re-opt-in

- do not silently re-subscribe a person to marketing just because they bought again
- transactional eligibility and marketing permission should be treated separately

## What Can Happen Before Launch

Reasonable before-launch work:

- verify Postmark domain + SMTP for Supabase
- confirm ActiveCampaign automations for key lifecycle events
- validate Stripe webhook -> AC tag/field triggers
- finalize unsubscribe + consent rules

## Practical Recommendation

If the team wants to move toward this stack now, the safest path is:

1. commit to the target architecture
2. keep ActiveCampaign and Postmark configured as the single email system
3. verify the key lifecycle automations and transactional flows
4. keep documentation aligned as the system evolves

That keeps the direction clear without forcing a fragile big-bang migration.
