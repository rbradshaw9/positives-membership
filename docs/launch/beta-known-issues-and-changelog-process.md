# Beta Known-Issues And Changelog Process

## Purpose

Reduce duplicate reporting, keep testers confident, and help the team communicate progress clearly during beta.

## Working Rules

- Keep a simple running known-issues list during beta.
- Add an item when:
  - it has been reproduced
  - it affects more than one person
  - it meaningfully blocks or confuses testers
- Remove or mark fixed once the resolution is deployed and verified.

## Recommended Fields

- issue title
- severity
- affected area
- workaround, if any
- owner
- current status
- fixed in release/date

## Changelog Rhythm

- update after meaningful fixes, not every tiny commit
- summarize:
  - what got fixed
  - what improved
  - what is still being watched

## Suggested Operating Pattern

- queue item is triaged in `/admin/beta-feedback`
- confirmed issue is mirrored into the known-issues list
- once fixed and verified, add it to the beta changelog update

## Recommended Tone

- calm
- specific
- transparent
- never defensive
