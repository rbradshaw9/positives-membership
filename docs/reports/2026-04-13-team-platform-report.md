# Positives Platform Report

Prepared for the team meeting on April 13, 2026

## Executive Summary

We now have a real membership platform, not just a collection of pages and tools.

At a business level, Positives now has:

- a live public site at `positives.life`
- paid membership checkout and recurring billing
- member login and account access
- a member experience for daily practice, library access, journaling, and progress
- an internal admin/content system for managing what members see
- an affiliate system powered by FirstPromoter with a Positives-facing portal
- early analytics, support flows, and legal/privacy groundwork

The biggest takeaway is that we have moved from "idea and infrastructure setup" into "operating product with launch cleanup and partner growth decisions still in front of us."

## What We Have Already Created

### 1. A real paid membership platform

Members can:

- join the program
- choose from the live membership levels
- pay through Stripe
- log in and manage their account
- access protected member content
- use the billing portal

This is the foundation of the actual business, not just a marketing site.

### 2. A structured member experience

The member side of the platform now supports:

- daily audio practice
- streak/progress behavior
- a content library
- journaling and practice-related activity
- monthly and weekly content organization
- coaching and replay support

This means the product is no longer just "buy and hope." There is now a system for ongoing engagement and retention.

### 3. A back-office operating system

Behind the scenes, the platform includes:

- content management tools
- member management tools
- protected admin routes
- structured data in Supabase
- billing and subscription logic in Stripe

This matters because it reduces the amount of manual patchwork required to run the business.

### 4. Affiliate infrastructure

We migrated the affiliate system to FirstPromoter and now have:

- live affiliate attribution through FirstPromoter
- a member affiliate portal inside Positives
- payout setup through PayPal
- a cleaner "My Links / Performance / Share Kit / Earnings" structure

This is meaningful because it creates the beginnings of a real partner growth channel rather than just a manual referral idea.

### 5. Marketing and operational groundwork

The platform now also includes:

- Google Analytics phase-1 wiring
- support/contact flows
- updated privacy and terms groundwork
- standardized pricing/naming across key surfaces
- a clearer public join flow than we had before

## What Is True Right Now

### Current workspace truth

As of April 9, 2026, the local workspace is ahead of the last clean pushed baseline.

The current workspace includes:

- a more refined affiliate experience
- a new affiliate rules/agreement direction
- a simplified affiliate Share Kit direction
- cleaner truth docs and project handoff docs

Important note:

- this current workspace is not fully build-clean yet
- there is an affiliate/legal batch in progress that still needs to be finished before it should be treated as shipped

### Live truth

The live product is already enough to count as a working membership platform.

Live truth includes:

- `positives.life` is live
- Stripe is the billing source of truth
- Supabase is the app database/auth foundation
- FirstPromoter is the affiliate tracking source of truth
- membership pricing is live across Levels 1, 2, and 3

## What Is Still In The Plan

### 1. Finish the affiliate/legal batch

This is the next immediate cleanup batch.

It includes:

- a public affiliate program rules page
- explicit agreement to affiliate terms before affiliate signup
- final Share Kit refinement
- finishing the current affiliate refactor so the repo is green again

### 2. Decide the long-term affiliate/partner model

Right now the affiliate experience is still mainly member-first.

The team has been leaning toward a larger future model:

- keep FirstPromoter underneath for tracking and payouts
- keep the partner-facing experience in Positives
- eventually support non-member partners and spouses who promote the brand
- automatically connect partner and member records by email if the same person later becomes both

This is an important strategic decision because it affects growth, support, and how much of the partner experience we own.

### 3. Continue launch cleanup

After the affiliate/legal work is stable, the next broader cleanup items are:

- SEO verification and cleanup
- admin auth hardening
- targeted smoke testing
- more consistency across public/legal/support surfaces

## Open Questions For The Team

These are not technical questions. They are business/operations questions that still need clear decisions.

### Affiliate program rules

- What commission structure do we want to lock in long-term?
- What is the payout timing rule?
- What exactly is prohibited?
- Are self-referrals always disallowed?
- How do we handle refunds and reversed commissions?

### Partner strategy

- Do we want affiliates to remain mainly members, or become a broader partner program?
- How much of the partner experience do we want to own inside Positives versus leaving in FirstPromoter?
- Do we want a lightweight public-facing referral partner signup path soon?

### Growth and support

- What should the Share Kit really include so it is easy for real people to use?
- Do we want a simple affiliate success guide or training center?
- Who is the ideal referral partner: members, coaches, influencers, webinar partners, or all of the above?

### Financial model

- What is the target margin after software, affiliate payouts, refunds, and support costs?
- Which costs are treated as platform costs versus general business costs?
- What counts as "effective revenue" if we later create a revenue-share arrangement internally?

## Estimated Platform Costs

These are the platform/tooling costs we should expect to discuss. Where exact billing is account-dependent, I have labeled that clearly.

### Core platform stack

| Tool | Current planning assumption | Monthly | Annual | Notes |
| --- | --- | ---: | ---: | --- |
| Vercel Pro | 1 deploying seat | $20 | $240 | Includes 1 paid seat and $20 usage credit; usage can go higher if traffic/build/compute grows. |
| Supabase Pro | 1 paid org / default project | $25 | $300 | Includes $10 compute credit that covers one default Micro project in the common case. |
| FirstPromoter Business | 1 account | $99 | $1,188 | Official current Business plan price. |
| Vimeo Standard | 1 seat | $25 | $300 | Official public pricing page JSON shows Standard at $25/mo. |

### Transactional / variable costs

| Tool | Current planning assumption | Monthly | Annual | Notes |
| --- | --- | ---: | ---: | --- |
| Stripe | variable | variable | variable | Online card pricing is `2.9% + 30c` per successful domestic card transaction, plus extra fees for international/manual-entry/currency conversion cases. |
| Vercel overages | usage-dependent | variable | variable | If traffic, bandwidth, image transforms, or compute exceed included credit. |
| Supabase overages | usage-dependent | variable | variable | If storage, MAU, egress, or compute exceed included quotas. |

### Email / marketing ops tools

| Tool | Current planning assumption | Monthly | Annual | Notes |
| --- | --- | ---: | ---: | --- |
| Resend | likely Free or Pro depending on volume | $0 to $20 | $0 to $240 | Good chance this stays low early; Pro becomes relevant if transactional email volume grows. |
| ActiveCampaign Starter | around 7,500 contacts | $109 | $1,308 | User-supplied current pricing for the 7,500-contact band, billed annually. |
| ActiveCampaign Plus | around 7,500 contacts | $127 | $1,524 | User-supplied current pricing for the 7,500-contact band, billed annually. |
| ActiveCampaign Pro | around 7,500 contacts | $289 | $3,468 | User-supplied current pricing for the 7,500-contact band, billed annually. |
| ActiveCampaign Enterprise | around 7,500 contacts | $479 | $5,748 | User-supplied current pricing for the 7,500-contact band, billed annually. |

### Baseline software subtotal

If we exclude Stripe transaction fees and exclude any unverified ActiveCampaign number, the most defensible current baseline is:

- **Monthly baseline:** about **$169/month**
- **Annual baseline:** about **$2,028/year**

That baseline is:

- Vercel Pro `20`
- Supabase Pro `25`
- FirstPromoter Business `99`
- Vimeo Standard `25`

If Resend is on Pro, that moves to:

- **Monthly baseline with Resend Pro:** about **$189/month**
- **Annual baseline with Resend Pro:** about **$2,268/year**

### Baseline plus ActiveCampaign scenarios

If we include ActiveCampaign at roughly 7,500 contacts, the likely planning ranges become:

| Scenario | Monthly | Annual |
| --- | ---: | ---: |
| Core platform + ActiveCampaign Starter | $278 | $3,336 |
| Core platform + ActiveCampaign Plus | $296 | $3,552 |
| Core platform + ActiveCampaign Pro | $458 | $5,496 |
| Core platform + ActiveCampaign Enterprise | $648 | $7,776 |

If Resend is also on Pro, add another:

- **$20/month**
- **$240/year**

### Costs To Confirm Outside This Repo

These may also be real business expenses, but they are not fully verifiable from this codebase alone and should be confirmed from current billing screens before using them in a board-style budget:

- ActiveCampaign exact plan/contact-band cost
- Keap/Infusionsoft cost, if still active
- existing WordPress/server hosting costs
- webinar/meeting software costs
- domain/email infrastructure costs
- any paid plugins or media/storage tools outside the core app stack

## What This Probably Would Have Cost To Build Externally

This is not a formal quote. It is a realistic business estimate.

If Positives had hired:

- a strong freelance full-stack developer, plus some design/product support, or
- a small boutique development shop

then a platform with this scope would likely have cost somewhere in the range of:

- **$60,000 to $150,000+** on the low-to-mid professional market

And that still would not necessarily include all of the surrounding operational work such as:

- funnel updates
- email operations
- webinar support
- business automation work
- employee training
- server and legacy system management

If a more brand-heavy or agency-led build had been commissioned, the total could have been materially higher.

## Why This Matters

The important story for the team is not just "we built a website."

The real story is:

- we now have a functioning digital membership product
- it already supports revenue, delivery, retention, and partner growth basics
- there is still cleanup and policy work to finish
- but the hard middle of the platform has already been created

That changes the conversation from "should we build?" to "how do we finish, operate, and grow what we now have?"

## Recommended Talking Points For Monday

1. We now have a real membership platform that supports paid subscriptions, member access, content delivery, and affiliate growth.
2. The biggest remaining work is not rebuilding the core product. It is finishing affiliate/legal clarity, partner strategy, and launch cleanup.
3. The software stack itself is relatively affordable compared with the value of the platform.
4. The bigger strategic decision now is how partner/affiliate growth should work and how much of that experience Positives wants to own directly.

## Sources

- Vercel Pro plan docs: https://vercel.com/docs/plans/pro
- Vercel pricing/update notes: https://vercel.com/blog/new-pro-pricing-plan
- Supabase billing FAQ: https://supabase.com/docs/guides/platform/billing-faq
- Supabase usage/pricing examples: https://supabase.com/docs/guides/platform/manage-your-usage/egress
- FirstPromoter pricing: https://firstpromoter.com/pricing
- Stripe pricing: https://stripe.com/pricing
- Resend pricing: https://resend.com/pricing
- Vimeo pricing page: https://vimeo.com/upgrade-plan
- ActiveCampaign pricing page: https://www.activecampaign.com/pricing
- ActiveCampaign pricing overview article: https://www.activecampaign.com/blog/activecampaign-pricing-myths-debunked
