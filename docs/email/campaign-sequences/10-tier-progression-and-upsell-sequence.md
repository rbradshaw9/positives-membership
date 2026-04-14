# Campaign Sequence 10: Tier Progression And Upsell

## Automation purpose

Support the member’s next step after orientation and early product use.

## Delivery lane

`Standard ActiveCampaign`

These are not Postmark transactional emails. They are progression and upsell
emails driven by product engagement and current tier.

## Recommended triggers

- `first_login_complete`
- `first_listen_complete`
- `first_journal_entry`
- `first_event_attended`

## Sequence A: Level 1 To Level 2

### Email A1: Keep The Practice Going

- Timing:
  - after first meaningful engagement
- Subject:
  - `A simple way to keep your Positives practice going`
- Preview:
  - `Consistency matters more than intensity.`
- CTA:
  - `Return To Today`
- CTA link:
  - `https://positives.life/today`

### Draft copy

Hi %FIRSTNAME%,

You’re already doing the most important part: returning to the practice.

The next step is not to do more all at once. It’s simply to keep the rhythm
going and let the daily work compound.

Button:
`Return To Today`

### Email A2: Add Live Events

- Timing:
  - 4 days later
- Subject:
  - `Want more support around the practice?`
- Preview:
  - `Live events can help you stay connected and engaged.`
- CTA:
  - `See Membership + Events`
- CTA link:
  - `https://positives.life/join`

### Draft copy

Hi %FIRSTNAME%,

If you want more support around your Positives practice, the next best step is
live event access.

That gives you a way to stay connected to the work in a more active rhythm.

Button:
`See Membership + Events`

### Email A3: Invitation To Upgrade

- Timing:
  - 5 days later
- Subject:
  - `If you’re ready for the next level of support`
- Preview:
  - `Here’s what Membership + Events adds.`
- CTA:
  - `Explore The Next Level`
- CTA link:
  - `https://positives.life/join`

### Draft copy

Hi %FIRSTNAME%,

If the daily practice is helping and you want a little more structure and
support, Membership + Events is the natural next step.

You can take a look any time and decide if it fits what you need right now.

Button:
`Explore The Next Level`

## Sequence B: Level 2 To Level 3

### Email B1: You’re Using Events Well

- Timing:
  - after event engagement
- Subject:
  - `You may be ready for more direct support`
- Preview:
  - `If events are helping, coaching may be the next fit.`
- CTA:
  - `See Coaching Circle`
- CTA link:
  - `https://positives.life/join`

### Draft copy

Hi %FIRSTNAME%,

If you’re already using the event side of Positives, you may be ready for a
more direct layer of support.

That’s where Coaching Circle comes in.

Button:
`See Coaching Circle`

### Email B2: Coaching Invitation

- Timing:
  - 5 days later
- Subject:
  - `What Coaching Circle adds`
- Preview:
  - `Live coaching can help you stay closer to the work.`
- CTA:
  - `Explore Coaching Circle`
- CTA link:
  - `https://positives.life/join`

### Draft copy

Hi %FIRSTNAME%,

Coaching Circle is designed for members who want to go deeper with live
support, direct guidance, and the accountability of returning in real time.

If that feels like the right next step, you can explore it here.

Button:
`Explore Coaching Circle`

## Sequence C: Inactivity Rescue

### Email C1: Come Back To Today

- Timing:
  - after inactivity following first login
- Subject:
  - `Come back to today’s practice`
- Preview:
  - `You do not need to catch up. Just return.`
- CTA:
  - `Return To Today`
- CTA link:
  - `https://positives.life/today`

### Draft copy

Hi %FIRSTNAME%,

If you’ve been away for a bit, that’s okay.

You do not need to catch up in Positives. The easiest way back in is simply to
return to today’s practice.

Button:
`Return To Today`

### Email C2: A Gentle Reset

- Timing:
  - 4 days later if still inactive
- Subject:
  - `A gentle way to reset`
- Preview:
  - `A few quiet minutes is enough to begin again.`
- CTA:
  - `Open Positives`
- CTA link:
  - `https://positives.life/today`

### Draft copy

Hi %FIRSTNAME%,

Sometimes the best reset is a very small one.

You don’t need a perfect streak or a fresh start. You just need one honest step
back into the practice.

Button:
`Open Positives`
