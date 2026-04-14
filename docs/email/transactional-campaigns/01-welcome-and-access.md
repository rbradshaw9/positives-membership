# Transactional Campaign 01: Welcome And Access

## Purpose

Get a new paying member into Positives immediately and confidently.

This campaign is not a nurture sequence. Its job is:

- confirm access
- explain the product simply
- give the member one clear next step
- reduce login confusion

## Owner

`ActiveCampaign + Postmark`

## Trigger

- Paid checkout completed
- App sets:
  - `welcome_ready` tag
  - `LOGIN_LINK`
  - `PLAN_NAME`

## Exit trigger

This campaign should stop as soon as the member successfully enters the member
product for the first time.

Recommended app-side sync:

- add tag: `first_login_complete`
- set field: `FIRST_LOGIN_AT`

Recommended AC behavior:

- end this automation when `first_login_complete` is added
- remove the member from any remaining welcome reminder emails
- immediately hand the member into the `Post-Login Orientation` automation

## Required merge fields

- `%FIRSTNAME%`
- `%PLAN_NAME%`
- `%LOGIN_LINK%`

## CTA destination

- Primary CTA: `%LOGIN_LINK%`
- Fallback text link: `%LOGIN_LINK%`

## Recommended sequence

### Email 1: Welcome To Positives

- Timing:
  - immediately
- Subject:
  - `Welcome to Positives`
- Preview:
  - `Your membership is live. Start with today’s practice.`
- Goal:
  - get the member into the app
- CTA:
  - `Open Positives`

### Email 2: Access Reminder

- Timing:
  - 24 hours later, only if the member has not yet logged in or listened
- Subject:
  - `Your Positives membership is ready`
- Preview:
  - `A quick reminder that your first practice is waiting.`
- Goal:
  - reduce drop-off caused by inbox overload or login confusion
- CTA:
  - `Open Positives`

### Optional Email 3: Need Help Getting In?

- Timing:
  - 3 days later, only if `first_login_complete` is still absent
- Subject:
  - `Need help getting into Positives?`
- Preview:
  - `If sign-in has been the blocker, here’s the easiest next step.`
- Goal:
  - rescue members who paid but never reached the product
- CTA:
  - `Open Positives`

## Body outline

### Email 1

- Welcome the member warmly.
- Name the plan if useful.
- Explain Positives as a daily practice, not a course.
- Point them to `Today`.
- Mention that they can set a password after entering.

### Email 2

- Keep it shorter than Email 1.
- Reassure them that getting started is simple.
- Point them back to `Today`.
- Mention support if they had trouble signing in.

### Email 3

- Keep this brief and helpful.
- Acknowledge that sometimes the login step gets missed.
- Offer support directly.
- Do not keep pushing past this point if they still have not entered.

## Launch recommendation

- Required:
  - Email 1
- Strongly recommended:
  - Email 2
- Optional:
  - Email 3

## Notes

- This campaign should stay transactional in tone.
- Do not turn it into a long onboarding drip inside this sequence.
- Longer onboarding can live in a separate lifecycle campaign later if needed.
- The app, not email clicks, should be the source of truth for pulling someone
  out of this campaign.
- The cleanest first-login trigger is the first successful authenticated arrival
  into the protected member app after magic-link or password sign-in.
