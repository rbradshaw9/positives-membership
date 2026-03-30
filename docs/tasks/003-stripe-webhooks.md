# Task 003 — Stripe Webhook Scaffold

## Goal
Create the webhook endpoint and subscription-state update scaffold.

## Scope
Included:
- webhook route
- signature verification
- handler mapping for core events
- placeholder service layer for database updates

Events:
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`

Excluded:
- full billing portal UI
- full pricing UI
- advanced retry logic

## Files
- `app/api/webhooks/stripe/route.ts`
- `server/services/stripe/`
- `lib/stripe/`

## Verification
- signature verification logic is present
- endpoint structure is production-ready
- event routing is clear and extensible