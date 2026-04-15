# Stripe Webhook Configuration — Positives Platform

For hosted Checkout and Customer Portal branding/proration setup, use
`docs/setup/stripe-hosted-billing.md`. That runbook is the source of truth for
configuring test mode now and repeating the setup in live mode after business
verification.

## Status

Current launch prep uses the real Positives Stripe account in **test mode**.
Live-mode billing is intentionally deferred until Stripe business verification
is complete.

| Field | Value |
|---|---|
| Test-mode Account | `acct_1THAYAIoN7XN0qfm` |
| Test-mode Webhook ID | `we_1TMUlxIoN7XN0qfmPqNI5lSO` |
| Endpoint URL | `https://positives.life/api/webhooks/stripe` |
| Status | `enabled` |
| Secret | Set locally and in Vercel as `STRIPE_WEBHOOK_SECRET` for deployed test-mode checkout |

---

## Webhook endpoint (code path)

```
app/api/webhooks/stripe/route.ts
```

The handler:
1. Reads the raw request body
2. Verifies the `stripe-signature` header against `STRIPE_WEBHOOK_SECRET`
3. Routes to the appropriate handler in `server/services/stripe/handle-subscription.ts`
   or `server/services/stripe/handle-course-entitlements.ts`

---

## Events configured

| Event | Handler | Effect |
|---|---|---|
| `checkout.session.completed` | `handleCheckoutSessionCompleted` | Creates/activates member and starts onboarding |
| `customer.subscription.created` | `handleSubscriptionCreated` | Sets member `subscription_status=active`, maps tier |
| `customer.subscription.updated` | `handleSubscriptionUpdated` | Updates status and tier |
| `customer.subscription.deleted` | `handleSubscriptionDeleted` | Sets `subscription_status=canceled` |
| `customer.subscription.trial_will_end` | `handleTrialWillEnd` | Syncs trial-ending state |
| `invoice.payment_succeeded` | `handlePaymentSucceeded` | Clears past-due state / syncs billing recovery |
| `invoice.payment_failed` | `handlePaymentFailed` | Sets `subscription_status=past_due` |
| `payment_intent.succeeded` | `handleCoursePaymentSucceeded` | Grants direct saved-card course purchase entitlements |
| `charge.refunded` | `handleChargeRefunded` | Marks matching one-time course entitlement `refunded` after a full refund |
| `charge.dispute.closed` | `handleDisputeClosed` | Marks matching one-time course entitlement `chargeback` when a dispute is lost |

---

## How the webhook secret was generated

The webhook endpoint was created against the real Positives Stripe account in
test mode. The signing secret (`whsec_...`) is only shown once at creation time.
It has been saved in:

- `.env.local` as `STRIPE_WEBHOOK_SECRET` (local dev)
- Vercel Production/Preview/Development as `STRIPE_WEBHOOK_SECRET`, alongside
  the matching test-mode publishable key, secret key, and price IDs

**Do not rotate the secret without updating every environment that uses this
test-mode Stripe account.**

---

## Verifying the webhook is working

After a successful checkout, check the Stripe Dashboard → Developers → Webhooks → `we_1TMUlxIoN7XN0qfmPqNI5lSO` → Recent deliveries.

You should see `customer.subscription.created` with a `200` response.

Also check the Supabase `member` table:

```sql
SELECT id, email, stripe_customer_id, subscription_status, subscription_tier
FROM member
WHERE email = 'your-test-email@example.com';
```

Expected after successful checkout:
- `stripe_customer_id` — populated
- `subscription_status` — `active`
- `subscription_tier` — `level_1`

---

## Re-registering the webhook (if needed)

If you ever need to create a new webhook endpoint (e.g., custom domain):

1. Go to Stripe Dashboard → Developers → Webhooks → Add endpoint
2. URL: `https://positives.life/api/webhooks/stripe`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `customer.subscription.trial_will_end`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `payment_intent.succeeded`
   - `charge.refunded`
   - `charge.dispute.closed`
4. Copy the signing secret and update `STRIPE_WEBHOOK_SECRET` locally and in Vercel

---

## Local testing with Stripe CLI

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward to local dev server
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# Copy the whsec_... value printed and set it as STRIPE_WEBHOOK_SECRET in .env.local

# Trigger test events
stripe trigger customer.subscription.created
stripe trigger invoice.payment_failed
```

See `docs/setup/stripe-local.md` for the full local testing guide.
