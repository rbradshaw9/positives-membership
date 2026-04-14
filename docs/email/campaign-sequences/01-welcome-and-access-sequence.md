# Campaign Sequence 01: Welcome And Access

## Automation purpose

Get a new member into the product for the first time.

## Trigger

- purchase complete

## Exit condition

- app adds `first_login_complete`

## Email 1: Welcome To Positives

- Delivery:
  - `Postmark transactional`
- Timing:
  - immediately after purchase
- Subject:
  - `Welcome to Positives`
- Preview:
  - `Your membership is live. Start with today’s practice.`
- CTA:
  - `Open Positives`
- CTA link:
  - `%LOGIN_LINK%`

### Draft copy

Hi %FIRSTNAME%,

Welcome to Positives.

Your membership is live, and your first step is simple: open Positives and
start with today’s practice.

Positives is built around a steady daily rhythm:

- Today
- This Week
- This Month

You do not need to catch up or complete anything perfectly. Just begin with
today.

Button:
`Open Positives`

If sign-in feels confusing, reply to this email and we’ll help.

## Email 2: Your Membership Is Ready

- Delivery:
  - `Standard ActiveCampaign`
- Timing:
  - 1 day later if `first_login_complete` is still absent
- Subject:
  - `Your Positives membership is ready`
- Preview:
  - `A quick reminder that your first practice is waiting.`
- CTA:
  - `Open Positives`
- CTA link:
  - `%LOGIN_LINK%`

### Draft copy

Hi %FIRSTNAME%,

Just a quick reminder that your Positives membership is ready whenever you are.

The easiest place to begin is today’s practice. You don’t need a long block of
time. Just start there and let the rest unfold from that rhythm.

Button:
`Open Positives`

If you’ve already logged in, you can ignore this note.

## Email 3: Need Help Getting In?

- Delivery:
  - `Standard ActiveCampaign`
- Timing:
  - 3 days later if `first_login_complete` is still absent
- Subject:
  - `Need help getting into Positives?`
- Preview:
  - `If sign-in has been the blocker, here’s the easiest next step.`
- CTA:
  - `Open Positives`
- CTA link:
  - `%LOGIN_LINK%`

### Draft copy

Hi %FIRSTNAME%,

Sometimes the first step gets missed in a busy inbox, so we wanted to make it
easy.

Your Positives membership is active. If you have not made it in yet, use the
button below and we’ll take you straight to the member experience.

Button:
`Open Positives`

If you hit any friction at all, reply to this email and we’ll help you get
settled.
