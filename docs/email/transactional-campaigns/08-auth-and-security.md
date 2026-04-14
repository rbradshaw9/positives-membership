# Transactional Campaign 08: Auth And Security Emails

## Purpose

Document the transactional emails that should exist, but stay outside
ActiveCampaign.

## Owner

`Supabase Auth via Postmark SMTP`

## Not built in ActiveCampaign

These emails should remain owned by Supabase Auth:

- magic link sign-in
- password reset
- email change confirmation
- invite / auth system email

## Recommended set

### Email 1: Magic Link Sign-In

- Trigger:
  - user requests magic link
- Goal:
  - secure sign-in

### Email 2: Password Reset

- Trigger:
  - user requests password reset
- Goal:
  - secure account recovery

### Email 3: Email Change Confirmation

- Trigger:
  - user changes email
- Goal:
  - confirm account ownership

### Email 4: Invite / Account Setup

- Trigger:
  - invitation or account-setup flow if used
- Goal:
  - complete secure account setup

## Brand recommendation

- Brand these emails to match Positives visually.
- Keep copy very short.
- Prioritize trust and clarity over warmth.

## Notes

- These are transactional and launch-critical, but not ActiveCampaign work.
- They should be audited alongside the AC campaigns so the full email system
  feels consistent.
