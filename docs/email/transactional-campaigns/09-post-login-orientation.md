# Transactional Campaign 09: Post-Login Orientation

## Purpose

Move a member from `I paid` to `I understand how to use this`.

This campaign starts after the member has successfully entered the member app for
the first time. Its job is not to get them to log in. Its job is to help them
orient and begin using Positives well.

## Owner

`ActiveCampaign + Postmark`

## Trigger

- App detects first successful member login / first authenticated arrival in the
  protected member app
- App sets:
  - `first_login_complete` tag
  - `FIRST_LOGIN_AT` field

## Automation rule

- This campaign should start immediately when `first_login_complete` is added.
- It should also serve as the condition that removes the member from the
  `Welcome And Access` campaign.

## Recommended audience splits

Split this automation by `membership tier`.

- `level_1`
- `level_2`
- `level_3`
- `level_4` if needed later

## Recommended sequence

### Email 1: You’re In

- Timing:
  - immediately after first login
- Subject:
  - `You’re in — here’s where to start`
- Preview:
  - `A simple way to use Positives well from day one.`
- Goal:
  - explain Today, This Week, and This Month

### Email 2: How To Use Positives

- Timing:
  - 2 days later
- Subject:
  - `The easiest way to get value from Positives`
- Preview:
  - `Keep it simple: return daily, not perfectly.`
- Goal:
  - reinforce the practice rhythm

### Email 3: Tier-Specific Orientation

- Timing:
  - 5 days later
- Subject examples:
  - `Your Membership includes more than today’s practice`
  - `Your Events access is ready`
  - `Your Coaching Circle access is ready`
- Goal:
  - explain the most important tier-specific value clearly

## Recommended content by tier

### Level 1

- focus on:
  - Today
  - library
  - notes / reflection
  - building the daily habit

### Level 2

- everything in Level 1, plus:
  - events page
  - replays
  - how to join live sessions

### Level 3

- everything in Level 2, plus:
  - coaching access
  - how and when to join
  - how to get the most value from live coaching

## Launch recommendation

- Strongly recommended

This is the right place for “how to use Positives” education. It should not live
inside the pre-login welcome sequence.

## Notes

- This campaign is about orientation and early value.
- It should feel supportive, not salesy.
