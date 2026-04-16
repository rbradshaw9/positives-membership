# Live Events And Coaching Launch Model

## Summary

For launch, Positives should keep the live layer simple:

- `Level 1` = core daily practice only
- `Level 2` = core practice + live member events + replay access
- `Level 3` = everything in Level 2 + weekly live coaching + coaching replays
- `Level 4` = handled manually/off-platform at launch

This keeps the promise clear, matches the current app structure, and avoids inventing a complicated “event system” before the core rhythm is stable.

## Recommended Launch Promise

### Level 1 — Membership

Promise:

- daily guided audio practice
- weekly reflections
- monthly themes
- full core library

Do **not** position Level 1 as including live touchpoints.

### Level 2 — Membership + Events

Promise:

- everything in Level 1
- access to scheduled live member events
- replay access after those events are published

This should be framed as:

- a richer rhythm around the core practice
- occasional live support and reinforcement
- not a weekly coaching tier

### Level 3 — Coaching Circle

Promise:

- everything in Level 2
- weekly live coaching calls
- replay access to coaching sessions

This is the first tier that should feel meaningfully higher-touch.

### Level 4 — Executive Coaching

Launch recommendation:

- keep this manual and high-touch
- do not force it into the same self-serve member UX yet
- route discovery through the Breakthrough Session / consultation path

## Product Model At Launch

The cleanest launch model is:

1. `Events` are a Level 2+ member benefit.
2. `Coaching` is a Level 3+ member benefit.
3. Both are scheduled as real content records with dates, join URLs, and optional replay media.
4. The app, not ActiveCampaign, owns reminder timing and eligibility.

This matches what is already being built:

- `/events` for Level 2+
- `/coaching` for Level 3+
- `content` records with `starts_at`, `join_url`, `send_reminders`, and `send_replay_email`
- reminder dispatch via the app and Vercel cron

## Admin / Operator Workflow

Launch workflow should stay simple:

1. Admin creates a scheduled content record.
2. Admin chooses the effective tier floor:
   - `level_2` for member events
   - `level_3` or `level_4` for coaching
3. Admin enters:
   - title
   - starts_at
   - join_url
   - excerpt / description
   - replay media later if available
4. Admin leaves reminder cadence on the default launch model:
   - `24 hours before`
   - `1 hour before`
   - replay-ready if media exists

Do **not** add a custom event automation builder at launch.

## Member Experience At Launch

### Events page

Should answer:

- what is coming up
- how to join
- what replays are already available

It should feel like:

- a calm event home
- not a crowded webinar dashboard

### Coaching page

Should answer:

- when the next coaching session is
- how to join
- where to find recent replays

It should feel:

- more intimate
- more supportive
- more regular than the events surface

## Reminder / Email Model

For launch, keep the reminder model fixed and operational:

- `Level 2 events`
  - 24h reminder
  - 1h reminder
  - replay-ready email
- `Level 3 coaching`
  - 24h reminder
  - 1h reminder
  - replay-ready email

Do not add:

- SMS
- arbitrary reminder schedules
- per-event freeform email writing
- multiple template-picking decisions for admins

The current architecture should stay:

- app detects eligible members and upcoming sessions
- app writes the reminder context into ActiveCampaign fields
- app applies the trigger tag
- AC sends the email

## What To Avoid At Launch

Avoid these traps:

- promising weekly live touchpoints at Level 2
- blending community, events, coaching, and courses into one muddy tier story
- making admins manually coordinate reminder timing outside the app
- creating one-off event processes that bypass scheduled content

## Recommended Launch Decision

Approve this as the launch operating model:

- Level 2 = events tier
- Level 3 = coaching tier
- events and coaching are both powered by scheduled content
- reminders are fixed to `24h + 1h + replay`
- app-owned reminder logic remains the source of truth
- no SMS and no custom automation builder at launch

## Follow-On Work After Approval

If approved, the remaining work becomes mostly operational and QA:

- replace placeholder Level 2 and Level 3 scheduled content
- verify `/events` against the real launch promise
- verify `/coaching` against the real launch promise
- build the remaining AC reminder automations
- run a full event/coaching reminder smoke test once real sessions are scheduled
