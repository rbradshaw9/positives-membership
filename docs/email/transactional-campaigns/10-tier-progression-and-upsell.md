# Transactional Campaign 10: Tier Progression And Upsell

## Purpose

Create the right next-step automation after a member is already inside the
product.

This campaign should not trigger just because someone paid. It should trigger
from a mix of:

- current tier
- post-login status
- real product engagement

## Owner

`ActiveCampaign + Postmark`

## Core recommendation

Do not use the welcome campaign as the upsell campaign.

Instead:

- `Welcome / Access` gets them into the product
- `Post-Login Orientation` helps them understand it
- `Tier Progression / Upsell` responds to actual engagement and current tier

## Recommended trigger inputs

### Minimum useful trigger

- `first_login_complete`

### Better trigger set over time

- `first_listen_complete`
- `first_journal_entry`
- `first_event_attended`
- `practice_streak_3`
- `practice_streak_7`
- `inactive_after_login`

## Suggested app-side events to sync into ActiveCampaign

The app already records meaningful member behavior like:

- daily listens
- journal opened / note created
- event attended

Recommended next step is to sync a small subset of those into AC as
tags/fields, rather than trying to mirror everything.

Recommended first set:

- tag: `first_login_complete`
- tag: `first_listen_complete`
- tag: `first_journal_entry`
- tag: `first_event_attended`
- field: `FIRST_LOGIN_AT`
- field: `LAST_ACTIVE_AT`

## Recommended automation map

### Level 1 -> Level 2 progression

Trigger when:

- member is `level_1`
- has `first_login_complete`
- has shown at least one early engagement signal

Recommended sequence:

1. value reinforcement
2. explain what live events would add
3. invite upgrade

### Level 2 -> Level 3 progression

Trigger when:

- member is `level_2`
- has engaged with events or replays

Recommended sequence:

1. reinforce current value
2. explain the benefit of weekly live coaching
3. invite upgrade

### Inactivity rescue

Trigger when:

- member has `first_login_complete`
- but no further meaningful engagement after a defined window

Recommended sequence:

1. simple return-to-today email
2. reminder that Positives is a practice, not a course
3. direct path back to the next best member action

## Important principle

Upsell should be based on readiness signals, not just elapsed time since
purchase.

That will make the system feel:

- more helpful
- less pushy
- more aligned with actual member progress

## Launch recommendation

- Do not build the full progression system before launch unless there is room.
- Do lock the architecture now:
  - first login ends welcome
  - first login starts orientation
  - tier progression is a separate automation family

## Notes

- This is the right long-term place for “help them progress” and
  “upsell to the next level.”
- It will work much better once we sync a few member-product milestones into
  ActiveCampaign.
