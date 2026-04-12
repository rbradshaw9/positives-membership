# Phased Rebilling Playbook

## Purpose
This playbook describes the safest recommended path for moving existing paying members from the current `Infusionsoft / Authorize.net` billing setup to `Stripe` without unnecessary revenue loss.

## Core Recommendation
- new members go to Stripe immediately
- existing members move in phases
- add an announcement phase before any billing wave begins
- try secure processor-to-processor payment-data migration first
- if payment data cannot be migrated directly, use a guided Stripe payment-update flow
- do not shut down the old billing stack until the final migration waves are stable

## Important Assumptions
- We should not assume we can export full reusable card numbers from Keap / Infusionsoft.
- We should expect payment data to be tokenized and subject to processor support.
- Grandfathered pricing should be addressed intentionally, not accidentally.
- The current business lean is to move older cohorts like `67` and `47` toward the `37` plan unless an exception is approved.

## Migration Principles
1. Protect recurring revenue first.
2. Do not hard-cut everyone at once.
3. Keep communication calm and clear.
4. Move the simplest cohorts first.
5. Review each wave before the next one begins.

## Phase 0: Stabilize The New World
Before touching legacy members:
- make sure all new memberships sell through Stripe
- confirm Stripe products and prices are ready
- confirm app access logic works correctly from Stripe-backed subscriptions
- decide how legacy prices map to the new pricing model

## Phase 1: Audit The Existing Member Base
Build a real migration inventory that includes:
- active member count
- monthly vs annual
- price cohort
- grandfathered rates
- special pricing
- bundle history
- paused/reactivated members
- any members already present in the new Positives system

This inventory should classify members into:
- easy
- moderate
- high-risk

## Phase 2: Confirm Payment-Data Migration Options
Ask:
- can Stripe support a processor-to-processor import from the current Authorize.net setup?
- what proof, support tickets, or approvals are needed?
- what mapping output will Stripe provide if import succeeds?

Best-case outcome:
- payment methods migrate securely
- we recreate subscriptions in Stripe using imported customer/payment mappings

Fallback outcome:
- some or all members must update payment details directly in Stripe

## Phase 3: Announcement Phase
Before billing changes:
- explain that the new Positives platform is launching
- explain what is changing
- explain what stays the same
- explain whether pricing or billing method will change
- explain what members may need to do later
- give support contact information

This should feel like:
- a relationship transition
- not a cold re-signup request

## Phase 4: Define Migration Waves
Recommended order:
1. new members on Stripe now
2. simple monthly active members
3. grandfathered monthly cohorts
4. annual members
5. bundles, paused/reactivated members, and other edge cases

Each wave should have:
- entry criteria
- communication plan
- support plan
- success/failure review checkpoint

## Phase 5: Pricing Transition Rules
Explicitly decide:
- which members move to `37`
- which members get delayed normalization
- which members receive exceptions

Do not let pricing changes happen ad hoc.

## Phase 6: Guided Stripe Update Flow
If direct payment migration is not possible, use a guided flow:
- member receives explanation
- member is identified as an existing member
- member updates payment in Stripe
- access and pricing are mapped correctly
- support exists if anything fails

This should not feel like a generic public checkout.

## Phase 7: Pilot Wave
Start with a small group.

Measure:
- successful payment transitions
- failures
- support volume
- access mismatches
- unexpected churn

Do not move to the next wave until the pilot is reviewed.

## Phase 8: Final Migration And Shutdown
Only retire the old billing/membership stack once:
- migrated subscriptions are stable
- member access is correct
- pricing is behaving as intended
- support volume is manageable
- the team is confident no major cohort is still stranded

## What Can Go Wrong
- payment import not supported
- unclear cohort/pricing data
- members confused by the new platform
- annual or special-price members handled inconsistently
- support load spikes
- old and new systems get out of sync during overlap

## Minimum Success Definition
- all new members are Stripe-native
- existing members are moving through clear waves
- revenue loss is minimized
- pricing policy is explicit
- old membership infrastructure can eventually be shut down cleanly
