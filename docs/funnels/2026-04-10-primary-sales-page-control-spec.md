# Primary Sales Page Control Spec

## Purpose

Define the default direct-to-paid funnel page for Positives.

This is the control version of the offer.

It should stay:

- clear
- calm
- premium
- low-friction
- easy to compare against future VSL, trial, and partner variants

## Canonical Route

- primary control sales page: `/join`
- homepage `/` remains the broader brand front door
- most direct-response traffic that is not trial-, VSL-, or partner-specific should land on `/join`

## Offer

- paid membership
- default headline offer starts at `$37/month`
- annual option shown alongside monthly
- 30-day money-back guarantee
- no free trial on the control page

## Primary Audience

- cold and warm traffic
- podcast listeners
- social traffic
- homepage click-through visitors
- affiliates without a trial-specific link

## Page Job

Answer three questions fast:

1. what Positives is
2. why it is different and worth paying for
3. which level someone should choose today

The page should not try to do everything.

It should move people from interest to confident paid selection.

## Messaging Frame

Core frame:

- Positives is a daily practice, not a course
- a few minutes a day changes how the rest of the day feels
- daily, weekly, and monthly rhythm makes growth sustainable
- Dr. Paul brings trusted clinical wisdom without making the experience feel clinical

Avoid:

- course language
- lesson/module/completion language
- urgency-heavy funnel language
- hype claims
- shame-based copy

## Required Sections

### 1. Header

- Positives logo
- light nav only if it helps trust
- `Sign in`
- main CTA to join

### 2. Hero

- clear daily-practice headline
- short subhead
- one strong CTA to join
- supporting trust line:
  - `From $37/month`
  - `30-day guarantee`
  - `Cancel anytime`

### 3. What It Is

- explain daily / weekly / monthly rhythm
- make the habit loop feel simple and repeatable

### 4. Why It Works

- explain the problem:
  - people react all day
  - Positives helps them reset before the day runs them
- reinforce calm clarity, not intensity

### 5. About Dr. Paul

- clinical credibility
- human warmth
- trust transfer

### 6. Pricing / Plan Selection

- Level 1 anchored as the main entry point
- higher tiers visible but secondary
- pricing should match actual platform reality

### 7. FAQ

- cancellation
- guarantee
- what is included
- who this is for
- how it differs from podcast / meditation apps / therapy

### 8. Final CTA

- repeat the core offer
- keep this simple

## CTA Rules

Primary CTA language:

- `Start your daily practice`
- `Choose your level`

Avoid CTA copy that implies:

- free trial
- free access
- booking a call
- webinar registration

## Design Rules

- preserve the current Positives visual language
- spacious, premium, emotionally safe
- mobile-first
- pricing cards must feel trustworthy, not gimmicky
- headings should use balanced wrapping

## Analytics Requirements

- track `join_cta_clicked`
- track `begin_checkout`
- track `checkout_error`
- preserve FirstPromoter handoff when present

## Success Criteria

The control page is successful if it:

- clearly explains the offer without video
- converts direct-paid traffic cleanly
- serves as the baseline to compare VSL and trial variants

## Implementation Notes

- current route `/join` should be treated as this control page
- build future variants around this control, not instead of it
- keep the guarantee and paid-offer copy consistent across homepage, `/join`, FAQ, and support
