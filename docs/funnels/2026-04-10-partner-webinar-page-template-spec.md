# Partner Or Webinar Landing Page Template Spec

## Purpose

Define the reusable landing-page template for:

- webinar traffic
- podcast appearances
- affiliate campaigns
- creator partnerships
- co-branded partner promotions

## Canonical Route Pattern

- proposed route family: `/with/[slug]`

Examples:

- `/with/april-webinar`
- `/with/podcast-name`
- `/with/partner-name`

## Core Rule

This is a template system, not a completely different site each time.

Each page should share:

- one visual system
- one component structure
- configurable copy blocks
- configurable CTA target

## Primary Job

Turn borrowed trust into action.

These pages should answer:

- why this is relevant to this audience
- why Dr. Paul is worth listening to
- what to do next

## Template Variants Supported

### 1. Webinar Replay / Registration

- event-specific framing
- video or replay block
- CTA to join or start trial

### 2. Podcast / Interview

- reference the conversation they just heard
- reinforce the specific pain point discussed
- CTA to join or watch

### 3. Partner Recommendation

- co-branded headline
- personalized intro copy
- CTA based on traffic warmth

## Required Template Slots

- partner slug
- optional partner name
- optional event name
- optional hero kicker
- optional video block
- proof/testimonial block
- CTA destination
- source-tag guidance for attribution

## CTA Rules

The partner template should support exactly three CTA modes:

- direct paid join
- VSL page
- trial page

Do not create one-off CTA behavior outside those paths.

## Copy Rules

- acknowledge the source relationship
- keep it specific
- do not over-customize to the point each page becomes bespoke

## Attribution Rules

- partner traffic should preserve `fpr` or campaign source
- page-specific links should support source tags
- attribution truth should still live in FirstPromoter

## Success Criteria

- new partner pages are fast to create
- partner traffic feels intentionally welcomed
- attribution remains clean

## Build Notes

- build as a configurable route pattern, not a pile of static copies
- page sections should be composable with simple content props
