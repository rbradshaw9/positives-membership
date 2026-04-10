# Positives Finish Roadmap

Prepared on April 10, 2026

## Purpose

This document turns the current Positives finish plan into a concrete execution roadmap.

It is meant to do three things:

- establish the real finish order
- reflect current implementation truth, not wishful thinking
- map directly into an Asana project and import file

## Current State Snapshot

Before deciding what to build next, it helps to be honest about where the product actually is right now.

### Repo truth

- the workspace is not green yet
- current blockers are in the affiliate area
- `npm run lint` is failing in `components/affiliate/AffiliatePortal.tsx`
- `npm run build` is failing because `app/(member)/account/affiliate/page.tsx` still passes an `autoEnroll` prop that `AffiliatePortal` no longer accepts

### Member content truth

- `/today` is already the living current-month experience
- monthly archive pages already exist at `/library/months/[monthYear]`
- the month model is close, but it is not fully clean yet
- the library archive query is still surfacing months it should not show
- the daily-audio archive on `/today` needs both data verification and a better navigation pattern

### Tier truth

- Level 3 coaching already exists with a member route and coaching content query
- Level 2 does not yet have a dedicated `/events` route
- pricing and feature promise need to be re-audited against what is actually implemented

### Affiliate truth

- the portal is partway through a simplification pass
- the tab structure is now better, but `My Links` still contains leftover explanatory copy
- the intended product direction is simpler than the current local implementation
- affiliate rules/agreement work is still incomplete

### Email and lifecycle truth

- Resend-backed email/admin tooling already exists
- app-managed onboarding, payment recovery, and winback cron routes already exist
- ActiveCampaign sync logic already exists, but it still needs an audit and launch-readiness review
- unsubscribe handling exists, but still needs end-to-end verification

### Admin and operations truth

- admin content, month, course, member, and email tooling already exist
- there is already a launch-readiness audit script for content coverage
- there are already a few Playwright smoke tests, but coverage is still thin for the highest-drift launch surfaces
- admin mutation security still needs a focused hardening pass

### Marketing truth

- the public marketing site exists and is live
- the current default offer is paid membership plus a 30-day guarantee
- there is no free-trial flow yet
- there is no VSL page yet
- there is no partner/webinar landing-page system yet
- there is no blog implementation yet

## Finish Order

The right order is still:

1. stabilize the repo and finish the affiliate cleanup
2. fix the month/content model so `/today`, archive, and library all agree
3. finish affiliate, email, and lifecycle systems
4. close the gap between plan promises and actual tier features
5. polish the public site and add funnel variants
6. defer non-blocking work like a full blog

That order matters because every later phase depends on the earlier phases becoming trustworthy first.

## Phase 0. Repo Stabilization

Exit goal:

- the workspace is green
- affiliate cleanup is no longer blocking other work

Tasks:

- fix the `autoEnroll` prop mismatch in the member affiliate page
- fix the `setState`-in-`useEffect` lint issue in `ShareTab`
- remove unused affiliate imports and leftover warnings
- simplify `My Links` so it reads like a clean promote-this-links surface
- keep rules and terms references only where they belong
- audit and harden admin mutations so action bodies enforce authorization directly
- rerun `lint` and `build`

Why this phase comes first:

- a red repo makes every later phase noisier
- the affiliate batch is already partially in motion and should be closed before context shifts again

## Phase 1. Content Model And Member Experience Core

Exit goal:

- `/today`, archive pages, and library behave like one coherent system

### Canonical month model

- `/today` is the active month in progress
- `/library/months/[monthYear]` is a closed archived month
- the library index should only show closed archived months
- members should never see future seeded months

### Core tasks

- verify all seeded April daily audios are connected to the correct `month_year`
- audit why only part of the expected April archive is appearing on `/today`
- confirm today’s audio is excluded once and only once
- run the existing launch-readiness content audit and clear coverage blockers
- redesign the daily-audio archive area at the bottom of `/today`
- avoid a long raw list as the final UX
- use a compact navigation pattern such as recent-days-first, expandable sections, or week-grouped sections
- align archive month pages visually and structurally with `/today`
- hide the current active month from the library while it is still in progress
- hide future months from the library entirely
- QA the admin publishing workflow for monthly themes, weekly principles, daily audios, and Vimeo-backed media
- verify account self-service flows end to end

### Account self-service scope

- update contact information
- set or change password
- open the billing portal
- upgrade
- cancel
- define the downgrade story explicitly

## Phase 2. Affiliate, Email, And Growth Systems

Exit goal:

- affiliate is simple and trustworthy
- lifecycle email behavior is documented and launch-ready

### Affiliate portal contract

- `My Links` is a simple link library
- `Performance` is FirstPromoter-only truth
- `Share Kit` is useful and practical
- `Earnings` is about payout and payout-readiness

### Core tasks

- complete the public affiliate program rules page
- require agreement before affiliate account creation
- keep payout setup required before full affiliate access
- decide whether affiliate agreement acceptance needs a durable stored audit trail
- improve Share Kit assets, scripts, and mobile UI
- make link customization simple around `sub_id`
- stop presenting local redirect behavior as affiliate truth
- keep FirstPromoter as the only attribution and reporting source of truth

### Email and CRM tasks

- audit ActiveCampaign sync behavior for new customers and tier changes
- verify affiliate tagging and affiliate welcome triggers
- define which sequences remain app-managed in Positives
- define which sequences live in ActiveCampaign
- define the minimum launch sequence set
- verify Stripe webhook behavior for lifecycle changes and member-state updates
- verify Vercel cron jobs and sequence timing in a real environment
- verify unsubscribe and support/contact flows end to end

## Phase 3. Tier Features, Events, And Coaching

Exit goal:

- every paid level has a complete, believable experience

### Tier audit goals

- Level 1 should fully deliver the daily, weekly, monthly, library, and account experience
- Level 2 should have a real events or community-plus-events experience, not just pricing copy
- Level 3 should have a complete weekly coaching flow
- Level 4 should stay intentionally admin-assigned unless and until the product model changes

### Core tasks

- audit each level against the current pricing page and offer language
- decide whether Level 2 events and community are combined or separate
- build a dedicated `/events` member route for Level 2 access
- define replay and archive behavior for events
- validate Level 3 coaching upcoming-call, join-link, and replay behavior
- confirm Zoom operational flow for weekly coaching
- run one full promise-vs-product audit across pricing, join, FAQ, upgrade, and gated routes

## Phase 4. Marketing, Funnel Variants, And Launch Polish

Exit goal:

- the public-facing experience is sharp, truthful, and ready for multiple acquisition paths

### Public site polish

- fix mobile issues on the marketing page
- tighten spacing and CTA clarity
- improve proof and trust presentation
- re-audit pricing and plan-name consistency
- re-audit homepage, join, FAQ, support, and legal pages for truth alignment
- finish SEO primitives including metadata, sitemap, robots, and canonical coverage
- verify GA4 and affiliate attribution events on the main public flows
- add focused smoke coverage for pricing, billing, affiliate onboarding, and legal/support surfaces
- reduce public script weight where practical, especially around third-party scripts
- choose a minimal production error-monitoring or incident-review approach

### Funnel strategy

Keep the default public offer as:

- paid membership
- 30-day guarantee

Add these funnel variants:

- primary sales page
- VSL sales page
- 7-day free-trial page
- partner or webinar landing-page template

### Funnel notes

- the 7-day trial should be a targeted experiment, not the new universal offer
- it requires real product and billing work, not just copy changes
- trial-to-paid attribution must still work correctly for affiliates
- VSL and partner pages should be intentional variants, not random duplicates

## Phase 5. Deferred Or Post-Launch

Exit goal:

- keep good ideas captured without letting them block completion

Deferred for now:

- blog decision
- blog build and CMS
- more landing-page variants
- challenge funnel
- expanded affiliate training center
- public non-member partner path
- partner/member identity linking by email
- a separate affiliate success guide beyond the rules page

## Asana Project Structure

Use one project with these sections:

1. `Phase 0 — Repo Stabilization`
2. `Phase 1 — Content Model + Member Experience`
3. `Phase 2 — Affiliate + Email + Growth Systems`
4. `Phase 3 — Tier Features: Events + Coaching`
5. `Phase 4 — Marketing + Funnel Variants + Launch Polish`
6. `Phase 5 — Deferred / Post-Launch`
7. `Blocked / Needs Decision`

## Custom Fields

Use these custom fields in Asana:

- `Area`
  - Marketing
  - Today / Archive
  - Library
  - Affiliate
  - Email / CRM
  - Billing / Account
  - Events / Coaching
  - Admin / Content
  - Funnels / Offers
- `Priority`
  - P0
  - P1
  - P2
- `Status`
  - Not started
  - In progress
  - Ready for review
  - Blocked
  - Done
- `Launch Gate`
  - Yes
  - No
- `Type`
  - Bug
  - Feature
  - Polish
  - Decision
  - QA / Verification
  - Experiment

## Recommended First-Wave Tasks

These are the first tasks that should be actively worked, in order:

1. fix affiliate repo blockers and get `lint` and `build` green
2. remove leftover explanatory copy from affiliate `My Links`
3. verify seeded April daily-audio month linkage
4. redesign the `/today` daily-audio archive navigation
5. convert monthly archive pages into the finalized closed-month experience
6. hide active and future months from the library
7. verify account billing, cancel, and upgrade flows end to end
8. create the public affiliate program rules page
9. complete affiliate agreement gating
10. run the launch-readiness content audit and clear blockers
11. audit ActiveCampaign sync and required launch sequences
12. verify Stripe webhooks and cron-based email timing
13. build the Level 2 `/events` route and gating
14. finish the Level 3 coaching Zoom and replay flow
15. run the full tier promise audit
16. harden admin mutation authorization
17. finish marketing-page mobile polish and copy truth alignment
18. finish SEO primitives and analytics verification
19. create the VSL page spec
20. create the 7-day trial funnel spec
21. create the partner or webinar page-template spec
22. define offer-routing rules for paid vs trial vs VSL vs partner traffic

## Definition Of Done

A phase or feature should count as finished only when:

- shipped behavior matches the copy
- the repo is green
- the route works on mobile and desktop
- the feature is no longer a half-built placeholder
- it has been QA checked against the intended product promise

## Companion Files

This roadmap is paired with:

- `docs/reports/2026-04-10-positives-asana-setup.md`
- `docs/reports/2026-04-10-positives-asana-import.csv`
