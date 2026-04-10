# Front-End Offer Routing Rules

## Goal

Define when traffic should be sent to:

- the primary paid control page
- the VSL page
- the 7-day trial page
- the partner / webinar page template

This should reduce random funnel sprawl.

## Rule Set

### 1. Default Traffic

Send to:

- `/join`

Use for:

- homepage click-through traffic
- organic visitors
- generic ads
- general social links

Why:

- this is the control page
- it keeps the default promise simple

### 2. Trust-Heavy Warm Traffic

Send to:

- `/watch`

Use for:

- podcast traffic
- email traffic
- retargeting
- traffic that already knows Dr. Paul

Why:

- these people benefit from hearing directly from Dr. Paul before buying

### 3. Lower-Friction Test Traffic

Send to:

- `/try`

Use for:

- selected affiliate campaigns
- colder paid traffic experiments
- selected creator partnerships

Why:

- this is where the 7-day trial should be tested
- keep trial traffic intentionally scoped

### 4. Source-Specific Borrowed-Trust Traffic

Send to:

- `/with/[slug]`

Use for:

- webinars
- podcasts
- partner launches
- co-branded campaigns

Why:

- these audiences should land on a page that matches the context they came from

## Global Rules

- do not make the trial the default public offer
- do not send generic cold traffic to the VSL by default
- do not build custom one-off partner pages when the template can handle it
- all paid CTAs should ultimately converge on the same billing truth

## Recommended Mapping

- nav CTA from homepage: `/join`
- sticky CTA on homepage: `/join`
- podcast show notes: `/watch`
- warm email CTA: `/watch`
- affiliate default link: `/join?fpr=...`
- affiliate trial test link: `/try?fpr=...`
- webinar or partner campaign link: `/with/[slug]?fpr=...`

## Measurement Rules

- compare `/join` against `/watch`
- compare paid vs trial only inside targeted experiments
- keep attribution fields consistent across all routes

## Decision Summary

- `/join` is the default paid control
- `/watch` is the trust-heavy Dr. Paul path
- `/try` is the targeted experiment
- `/with/[slug]` is the contextual partner wrapper
