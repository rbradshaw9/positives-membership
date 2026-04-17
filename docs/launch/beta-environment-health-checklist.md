# Beta Environment Health Checklist

## Purpose

Run this before inviting the first beta cohort and again before widening access.

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
