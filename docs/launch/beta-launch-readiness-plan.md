# Beta Launch Readiness Plan

## Goal

Get Positives to a point where a small private beta cohort can use the real product end to end, generate meaningful feedback, and help us surface bugs, friction, content gaps, and performance issues before a broader launch.

## Recommended Beta Structure

Use a two-step beta:

1. Friendly alpha
   - 5 to 10 trusted testers
   - Free access
   - Focus on obvious bugs, onboarding friction, content gaps, and support flow
2. Private beta
   - 15 to 30 real testers
   - Use real production flows
   - Prefer discounted beta pricing over full-price billing
   - Keep the option to comp specific testers manually

## Billing Recommendation

Recommended default:

- Do not rely on Stripe test mode for real beta testers
- Use production flows for the real private beta
- Offer a beta rate at roughly 50% off founding pricing, or manually comp selected testers
- If we want a stronger incentive, we can grandfather beta testers into that lower rate

Why:

- We need real billing, portal, cancellation, upgrade, webhook, and reminder behavior validated in production-like conditions
- Test-mode accounts are useful for QA but are not a good substitute for real user behavior
- Charging full price during beta raises the bar too early

## Beta Readiness Checklist

### Product and QA

- stable signup, login, logout, password reset, and account recovery
- member dashboard, Today, Library, and core navigation working cleanly
- course purchase, course ownership, and library access verified
- billing portal, upgrade, downgrade, cancel, and payment recovery verified
- reminder cron, affiliate payout cron, and site health cron monitored
- Sentry, Vercel, Stripe, and Supabase observability all checked before testers start

### Content Minimums

For beta we do not need the full long-term library, but we do need enough real content for meaningful usage:

- 21 to 30 daily practices
- 1 full monthly theme package
  - month intro
  - 4 weekly reflections
  - supporting prompts and copy
- 2 courses that are fully testable end to end
- 2 or more live events scheduled
- 2 or more coaching sessions scheduled if coaching beta is included
- at least 1 replay asset path tested

### Feedback and Support

Beta testers need one extremely easy path to report issues.

Recommended beta feedback pattern:

- persistent `Send beta feedback` button in the app
- very short form
  - what happened
  - what they expected
  - optional screenshot upload
  - optional screen recording link
  - urgency
- auto-capture:
  - member ID
  - email
  - current page URL
  - browser / device
  - app release or Sentry release

Recommended implementation approach:

- build a native beta feedback form first
- store uploads privately
- create durable admin triage records
- optionally add Sentry user feedback for crash/error contexts later

### Beta Operations

- define beta cohort goals and success criteria
- decide support owner and response expectation
- define daily triage rhythm for first 1 to 2 weeks
- create a known-issues / fixes review loop
- decide whether beta includes events, coaching, affiliate, and course commerce

## Recommended Launch Gate For Beta

We should feel comfortable inviting beta testers once:

- production signup and billing flows are stable
- support can see and manage member records confidently
- there is enough real content to create a habit, not just click around
- feedback capture is simple and visible
- critical observability is in place
- there is a daily issue-triage rhythm

## Key Open Decisions

- exact beta cohort size
- whether coaching is included in beta 1
- whether affiliates are in scope for beta 1
- whether beta pricing is discounted, comped, or mixed
- whether beta testers keep a grandfathered rate after launch

## Recommended Next Step

Treat beta readiness as its own project track with three lanes:

1. product stability and observability
2. real content creation
3. beta support and feedback operations
