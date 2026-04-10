# 7-Day Trial Funnel Spec

## Purpose

Define the targeted 7-day free-trial funnel.

This is an experiment.

It is not the default sitewide offer.

## Canonical Route

- proposed route: `/try`

## Offer

- 7 days free
- automatically converts to paid membership unless canceled
- same core Level 1 membership experience
- not shown as the default public offer

## Positioning Rule

Default public promise stays:

- paid membership
- 30-day guarantee

Trial promise is only for:

- affiliate campaigns
- colder paid traffic tests
- selected creator or newsletter traffic

## Primary Audience

- colder traffic
- affiliate traffic
- creator / influencer traffic
- audiences that need lower initial commitment

## Page Job

Reduce friction while still setting accurate expectations:

- this is a real membership
- billing starts after 7 days
- cancellation is easy
- the practice begins immediately

## Required Page Sections

### 1. Hero

- clear trial headline
- “7 days free” must be unmistakable
- trial-to-paid terms visible without hunting

### 2. What You Get During the Trial

- daily practice
- weekly reflection
- monthly theme
- library access rules if any

### 3. What Happens After Day 7

- exact conversion behavior
- exact paid amount
- cancellation path

### 4. Trust + Risk Reversal

- Dr. Paul credibility
- “cancel before billing if it’s not for you”

### 5. CTA

- `Start 7-day free trial`

### 6. FAQ

- when billing starts
- whether a card is required
- what happens if they cancel early

## Billing Rules

- Stripe Checkout should create a real subscription with a 7-day trial
- billing should begin automatically after the trial
- attribution must survive trial-to-paid conversion

## Lifecycle Requirements

- trial start confirmation
- reminder before trial ends
- clear cancellation access
- upgrade/downgrade behavior should stay inside Stripe customer portal

## Analytics Requirements

- track trial page entry
- track trial start
- track trial-to-paid conversion
- preserve affiliate attribution end to end

## Success Criteria

- trial funnel is clearly separate from the main paid offer
- terms are transparent
- affiliate attribution and Stripe lifecycle are intact

## Build Notes

- implementation should assume trial is targeted traffic only
- do not rewrite homepage and control-page copy around the trial
