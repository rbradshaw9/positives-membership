# Public Non-Member Partner Path

## Summary

Positives should eventually support affiliates and referral partners who are
not paying members, but the path should stay deliberately simple.

The recommended model is:

- keep the current launch flow member-first
- add a lightweight public partner application path later
- approve partners before giving them a live portal
- let partner-only users access a limited Positives account area without
  requiring a membership purchase
- keep FirstPromoter as the attribution and payout engine underneath

This avoids overbuilding a second full product while still making room for:

- spouses or family advocates
- coaches who are not active subscribers
- podcast or webinar partners
- creators and collaborators

## Locked Decisions

- Do not require a membership purchase to become a future partner.
- Do not open instant self-serve public affiliate signup in v1.
- Use an application-and-approval path instead of immediate auto-approval.
- Keep the partner-facing portal in Positives.
- Keep FirstPromoter as the tracking, commission, and payout source of truth.
- Partner-only users should have a limited Positives account, not a full member
  experience.
- If a partner later becomes a member using the same email, enrich the same
  account instead of creating a second one.

## Recommended Future Surface Area

### Public routes

- `/partners`
  - explains the program
  - makes the intended partner types clear
  - sets expectations around approval, payouts, and appropriate promotion
- `/partners/apply`
  - lightweight application form
- `/partners/success`
  - confirms submission and next steps

### Authenticated routes

- `/account/affiliate`
  - shared affiliate portal for:
    - members who are affiliates
    - partner-only approved affiliates
- no access to paid member areas unless the user also has product entitlement

## Recommended Application Flow

1. Visitor lands on `/partners`
2. Visitor chooses `Apply to partner`
3. Application captures:
   - name
   - email
   - website or audience handle
   - partner type
   - how they plan to share Positives
   - agreement to affiliate terms
4. Submission enters an admin review queue
5. Approved applicants get:
   - a Positives account if they do not already have one
   - a linked FirstPromoter promoter record
   - access to `/account/affiliate`
6. Rejected or pending applicants stay outside the portal

## Why Approval Beats Instant Signup

This keeps the system cleaner and closer to how strong partner programs
actually operate:

- lower spam and fraud risk
- fewer fake affiliates
- better fit with brand-sensitive promotion
- easier support load
- easier payout hygiene

For Positives, this is especially important because the best partners are
likely to be trust-based recommenders, not random coupon traffic.

## What A Partner-Only Account Should See

A partner-only user should be able to:

- sign in
- view their affiliate dashboard
- copy referral links
- use the share kit
- view clicks, leads, conversions, and earnings
- update payout details
- read program terms and guidance

A partner-only user should not automatically see:

- `Today`
- `Practice`
- `Community`
- `Coaching`
- any paid course or subscriber-only route

This keeps the experience clean instead of pretending a partner-only account is
a member account with missing features.

## Recommended Partner Types

For operations and reporting, use simple buckets:

- `member_partner`
  - existing Positives member who also promotes
- `partner_only`
  - approved affiliate without membership
- `strategic_partner`
  - creator, webinar host, organization, or special campaign partner

This is enough for launch-plus growth without introducing a giant partner CRM.

## Recommended Admin Rules

- approval required before affiliate activation
- partner-only accounts should be clearly labeled in admin
- support should be able to see:
  - partner type
  - approval state
  - FirstPromoter promoter ID
  - payout readiness
  - related member account, if one exists
- partner deactivation should not delete historical attribution or payouts

## Relationship To Funnel Routing

This path fits the existing funnel decisions:

- generic affiliate links can still point to `/join?fpr=...`
- selected campaigns can use `/try?fpr=...`
- partner-specific borrowed-trust traffic can use `/with/[slug]?fpr=...`

The public partner path is about partner onboarding and management, not about
creating a separate attribution system.

## Recommended Phase Order

### Phase 1

- keep affiliate onboarding member-first
- keep current member-facing portal

### Phase 2

- add `/partners`
- add `/partners/apply`
- add admin review queue
- allow approved partner-only accounts into `/account/affiliate`

### Phase 3

- add strategic partner variants
- add partner-type-specific onboarding copy
- add optional partner enablement resources or mini training

## Why This Is The Right Default

This path stays simple in the same way strong SaaS systems do:

- one clear public entrypoint
- one approval workflow
- one authenticated portal
- one underlying attribution engine
- no parallel mystery systems

It gives Positives room to grow the partner channel without forcing membership
where it does not belong and without turning affiliates into a second product.
