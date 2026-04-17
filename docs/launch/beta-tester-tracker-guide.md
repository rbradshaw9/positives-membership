# Beta Tester Tracker Guide

## Purpose

Keep one lightweight source of truth for who is in the beta, what access they have, how active they are, and whether they are actually giving us useful signal.

## Recommended Tool

Start with a simple Google Sheet or Airtable-style table. The goal is visibility and speed, not a heavy CRM.

## Recommended Columns

- `name`
- `email`
- `cohort`
  - alpha
  - private beta
  - live
- `invite_path`
  - alpha free
  - alpha paid test
  - beta discount
  - public join
- `campaign_code`
- `invited_at`
- `activated_at`
- `billing_state`
  - comped
  - discounted
  - grandfathered candidate
  - full price
- `subscription_tier`
- `course_access`
- `last_seen_at`
- `feedback_count`
- `last_feedback_at`
- `severity_flag`
  - none
  - low
  - medium
  - high
  - blocker
- `owner`
- `status`
  - invited
  - active
  - drifting
  - blocked
  - complete
- `notes`

## How To Use It

- update new invites the day they go out
- mark activation as soon as the member signs in
- review the tracker during the daily beta triage pass
- use `drifting` for testers who signed up but stopped engaging
- use `blocked` for testers waiting on a bug fix or manual help
- keep the invite path aligned with the actual link that was sent so billing-test
  users do not get mixed into the free alpha group later

## What Good Looks Like

- every beta tester has a clear status
- we know who is active and who is silent
- we can quickly spot:
  - who needs support
  - who is generating valuable feedback
  - who may be a strong testimonial or founding-member candidate later
