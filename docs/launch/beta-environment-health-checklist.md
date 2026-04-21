# Beta Environment Health Checklist

## Purpose

Run this before inviting the first beta cohort and again before widening access.

## Quick Ops Check

- Open `/admin/ops` and review every health card.
- Run `npm run ops:beta-check` locally for the same read-only review in Markdown.
- Run `npm run audit:email` locally to review ActiveCampaign, Postmark-facing,
  sender-domain, and DNS readiness without sending email.
- Confirm any `CHECK` or `Needs config` items have either:
  - an Asana task
  - a clear owner
  - a decision to defer

## Core Systems

- `Sentry`
  - project receiving app errors
  - cron monitors checking in
  - alert rules active for key failures
- `Vercel`
  - latest deployment healthy
  - no known failed env vars
  - Speed Insights and runtime logs accessible
- `Stripe`
  - checkout works
  - billing portal works
  - webhooks are healthy
  - expected products/prices are present
- `Supabase`
  - auth healthy
  - migrations applied
  - storage buckets available
  - database logs accessible for incident follow-up
- `Email`
  - ActiveCampaign launch tags, fields, templates, and automations verified
  - Postmark sender domain and message streams verified in the dashboard
  - sender DNS authenticated for each sending service
  - old personal sender addresses removed from launch messages
  - unsubscribe and marketing-preference webhooks verified

## Product Surfaces

- signup / login / password reset
- account page
- Today
- My Practice
- Library
- course purchase and ownership flow
- billing management flow
- admin members CRM
- admin beta feedback queue

## Beta Support Readiness

- in-app beta feedback enabled intentionally
- screenshot uploads working
- admin queue visible to support/admin users
- `/admin/ops` visible to admin users
- high/blocker feedback auto-escalates into Asana `Beta Feedback Triage`
- severity rubric available
- known-issues process available
- support owner assigned

## Content Minimums

- real daily practices loaded
- first monthly package loaded
- at least 2 testable courses available
- event/coaching schedule confirmed if included in beta

## Final Invite Check

- beta welcome flow enabled if desired
- invite message ready
- tracker updated
- first cohort list finalized
