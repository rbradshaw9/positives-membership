# Monday Meeting Brief

## Purpose
Use this meeting to make a small number of business decisions that will let Positives launch cleanly and let the team start retiring expensive legacy systems over time.

This is not a technical implementation meeting.

The goal is to leave with:
- clear decisions
- clear owners
- a short list of follow-up actions

## Must Decide
If time is tight, these are the decisions to finish in the room.

### 1. Launch promise by tier
Decide what each membership level honestly includes at launch.

We want:
- clear promise for Membership
- clear promise for Membership + Events
- clear promise for Coaching Circle
- no overpromising

### 2. Stripe readiness and payout ownership
Confirm whether the Positives Stripe account is truly ready for live money.

Need to settle:
- bank account / payouts
- legal/business setup
- tax / identity verification
- long-term account owner

### 3. Existing member migration to Stripe
Current recommendation:
- phased rebilling
- no hard cutover
- move members in cohorts

Need to settle:
- whether new members go straight to Stripe immediately
- which existing member groups are easiest to migrate first
- which groups are risky or complicated
- what communication and support path members get during migration

### 4. Email stack direction
Current recommendation:
- app triggers events into ActiveCampaign
- ActiveCampaign owns automation logic
- Postmark handles transactional delivery under that plan

Need to settle:
- whether that is the approved direction
- what emails matter on day one
- what counts as marketing versus essential account email
- who will manage automations

### 5. Legacy stack migration scope
Decide how much of the old system we are actually carrying forward.

Current recommendation:
- membership first
- then only highest-value supporting offers
- defer the long tail

Need to settle:
- which offers/funnels/products still matter
- which ones can be retired
- which ones must be rebuilt on Vercel first

### 6. Software stack and cost direction
Need to settle:
- whether we approve the new Positives stack
- whether we accept the temporary overlap period
- which legacy tools we intend to phase out first

## If Time Allows
These are useful, but they should not block the bigger launch decisions above.

- software payment method and card ownership
- account ownership / shared logins
- content readiness and publishing ownership
- launch-ready checklist and final sign-off
- Liquid Web future
- live events and coaching shape
- VSL importance
- support workflow and Help Scout
- refunds and edge cases
- referrals
- what to soften or hide at launch
- weekly success metrics
- accounting/bookkeeping
- Coaching Circle extra support promise
- Save and Enrich homepage question
- community
- transcripts
- Ask Dr. Paul
- reminders

## Target Stack
### New Positives stack we are intentionally choosing
- Vercel
- Supabase
- Stripe
- ActiveCampaign Pro
- Postmark
- FirstPromoter
- Vimeo
- Sentry free for now

### Why this stack
- cleaner member experience
- cleaner billing foundation in Stripe
- easier funnel ownership on Vercel
- better automation ownership in ActiveCampaign
- long-term path away from expensive legacy systems

## Legacy Costs To Phase Out
These are the main legacy costs now in the picture:

- Keap / Infusionsoft: likely around `$600/month`, needs confirmation
- ClickFunnels: likely `$97` or `$197/month`, needs confirmation
- Liquid Web: `$160.36/month`
- Vimeo Pro: `$300/year`
- WordPress plugin stack still tied to the old environment:
  - Memberium
  - LearnDash
  - The Events Calendar
  - Gravity Forms

Important framing:
- the new Positives stack does not instantly save money
- there will likely be an overlap period where both old and new systems cost money
- the point is to move to a cleaner system first, then retire legacy costs in a controlled way

## What To Bring
If possible, bring or confirm:

- Stripe account readiness screen
- ActiveCampaign pricing screen
- Vimeo billing screen
- Liquid Web billing screen
- Keap / Infusionsoft billing screen
- ClickFunnels billing screen
- WordPress plugin renewal screens
- current active member count
- rough monthly vs annual split
- any special pricing or grandfathered members
- list of legacy products/funnels that still matter
- rough Keap contact count
- rough ActiveCampaign contact count

## Best Meeting Order
1. Launch promise by tier
2. Stripe live-money readiness
3. Existing member migration to Stripe
4. Email stack approval
5. Legacy funnel / product migration scope
6. Cost review and legacy-cost reduction story
7. Software payment method and account ownership
8. Secondary strategy items only if time remains

## Decisions We Already Lean Toward
- ActiveCampaign Pro instead of Plus
- Postmark for transactional delivery under the ActiveCampaign-centered plan
- Sentry can stay free for now
- membership first, not full legacy catalog first
- phased rebilling, not hard cutover
- ClickFunnels should go away over time
- Keap / Infusionsoft should go away over time
- Liquid Web should be treated as a legacy infrastructure cost to reduce over time if possible

## Fast Version
If the meeting gets compressed, try to leave with explicit answers to just these 5 questions:

1. What are we promising at each membership level?
2. Is Stripe truly ready to take real money, and who owns it?
3. Are we approving phased rebilling for existing members?
4. Are we approving ActiveCampaign Pro + Postmark as the future email stack?
5. Are we agreeing that membership comes first and the long tail of legacy offers can wait?
