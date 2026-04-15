# Environment Strategy Before Live Billing

This is the launch environment strategy for Positives. The goal is to keep
production safe while still giving us a realistic place to test billing,
webhooks, reminders, and lifecycle automations before real payments go live.

## Decision

Do not build an admin test/live switch.

Use real environment separation instead:

- `production`: `main` branch, production Vercel environment, production Supabase, Stripe live mode only after business verification.
- `preview/staging`: Vercel preview deployments, separate Supabase staging project, Stripe real-account test-mode keys.
- `local`: developer machine, local `.env.local`, Stripe CLI or the same test-mode Stripe account when needed.

The app should not let an admin flip a live site between test and live billing.
That kind of switch is too easy to misuse and creates confusing member data.

## Environment Matrix

| Surface | Local | Preview / Staging | Production |
|---|---|---|---|
| Vercel | `next dev` | Preview deployment | `main` deployment |
| Supabase | Staging or local-safe project | Dedicated staging project | Production project |
| Stripe | Test mode | Real Positives Stripe account in test mode | Live mode after verification |
| Stripe webhook | Stripe CLI or preview URL | Preview/staging endpoint | `https://positives.life/api/webhooks/stripe` |
| ActiveCampaign | Same account, test contacts/tags | Same account, test contacts/tags | Same account, real contacts |
| FirstPromoter | Test/manual affiliates where possible | Test/manual affiliates where possible | Real affiliates |
| Vercel Cron | Optional local/manual hit | Preview only if explicitly configured | Production cron from `vercel.json` |

## Stripe Policy

Current state:

- Use the real Positives Stripe account in test mode for launch testing.
- Do not use live mode until business verification is complete.
- Do not configure Stripe custom domain yet.
- Keep card brands unrestricted.

Live-mode cutover requires:

- Live products and prices created or copied.
- Live `pk_live` and `sk_live` set in Vercel Production only.
- Live webhook endpoint created and `STRIPE_WEBHOOK_SECRET` updated for Production.
- Live price IDs set in Vercel Production.
- A successful live $0/low-cost smoke test or controlled internal purchase.

Preview/staging should continue using test-mode keys so we can test checkout,
portal, upgrades, downgrades, cancellations, and webhooks without touching real
money.

## Supabase Policy

Production member data should stay isolated.

Preview/staging should use a separate Supabase project before we do meaningful
pre-live QA that creates members, subscriptions, entitlements, course purchases,
or reminder dispatch rows.

Staging Supabase should have:

- The same migrations as production.
- No copied production secrets.
- No real member PII unless intentionally sanitized.
- Separate Auth redirect URLs for preview/staging domains.
- Separate storage buckets if member documents or uploads are tested.

## ActiveCampaign Policy

ActiveCampaign can remain one account, but test contacts must be clearly
identified.

Recommended test contact convention:

- Use internal/test emails only.
- Add a `test_contact` tag when creating automation test contacts.
- Keep lifecycle trigger tags reusable and remove them after test runs.
- Do not point production Stripe live events at test-only automations.

For marketing emails, unsubscribe state still matters. For operational
Postmark/transactional email steps, use the agreed transactional templates and
tags.

## Reminder Cron Policy

Reminder dispatch should stay app-owned and cron-triggered through Vercel.

Current model:

- `vercel.json` is the source of truth for production cron scheduling.
- `/api/cron/reminders` scans scheduled content and applies ActiveCampaign
  reminder trigger tags/fields.
- The dispatch log prevents duplicate reminder windows.

Preview reminders should be tested manually or against controlled staging data
only. Do not let preview/staging cron fire against production contacts.

## Why Not An Admin Test/Live Switch

An admin switch sounds convenient, but it creates hidden risk:

- A real member could accidentally enter a test checkout.
- Test subscriptions could pollute production member records.
- Webhooks could update the wrong environment.
- Stripe customer IDs and price IDs are mode-specific.
- Support/admin screens could show misleading billing state.

The safer pattern is boring on purpose: environment variables decide the mode,
and each environment has its own data.

## Operational Checklist

Before live billing:

- Production Vercel uses production Supabase and test-mode Stripe until cutover.
- Preview/staging Vercel points to staging Supabase and test-mode Stripe.
- `STRIPE_WEBHOOK_SECRET` matches the exact endpoint and mode for each
  environment.
- `NEXT_PUBLIC_APP_URL` and auth redirect URLs match each environment.
- Reminder cron is enabled only where it should affect real members.
- ActiveCampaign test contacts are tagged and easy to clean up.
- A rollback plan exists: switch production env vars back to test mode or
  pause checkout entry points if live billing misbehaves.

## Future Improvement

If we later need stronger release discipline, add:

- A dedicated staging Vercel project or branch alias.
- A seeded staging Supabase database with synthetic members.
- Automated Playwright smoke tests for checkout, portal, account, and member
  access.
- A deployment checklist that must pass before promoting `main`.
