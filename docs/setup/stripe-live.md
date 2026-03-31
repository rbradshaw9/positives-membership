# Stripe Live Webhook Configuration — Positives Platform

## Status

The live Stripe webhook is **already configured** and pointing to the correct deployed endpoint.

| Field | Value |
|---|---|
| Webhook ID | `we_1TH2waKStVEuswF7Z1V5ODVn` |
| Endpoint URL | `https://positives-membership.vercel.app/api/webhooks/stripe` |
| Status | `enabled` |
| Secret | Set in Vercel as `STRIPE_WEBHOOK_SECRET` |

---

## Webhook endpoint (code path)

```
app/api/webhooks/stripe/route.ts
```

The handler:
1. Reads the raw request body
2. Verifies the `stripe-signature` header against `STRIPE_WEBHOOK_SECRET`
3. Routes to the appropriate handler in `server/services/stripe/handle-subscription.ts`

---

## Events configured

| Event | Handler | Effect |
|---|---|---|
| `customer.subscription.created` | `handleSubscriptionCreated` | Sets member `subscription_status=active`, maps tier |
| `customer.subscription.updated` | `handleSubscriptionUpdated` | Updates status and tier |
| `customer.subscription.deleted` | `handleSubscriptionDeleted` | Sets `subscription_status=canceled` |
| `invoice.payment_failed` | `handlePaymentFailed` | Sets `subscription_status=past_due` |

---

## How the webhook secret was generated

The webhook endpoint was created in the Stripe dashboard (or via CLI). The signing secret (`whsec_...`) is only shown once at creation time. It has been saved in:

- `.env.local` as `STRIPE_WEBHOOK_SECRET` (local dev)
- Vercel environment variables as `STRIPE_WEBHOOK_SECRET` (production)

**Do not rotate the secret without updating both locations.**

---

## Verifying the webhook is working

After a successful checkout, check the Stripe Dashboard → Developers → Webhooks → `we_1TH2waKStVEuswF7Z1V5ODVn` → Recent deliveries.

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
2. URL: `https://your-domain.com/api/webhooks/stripe`
3. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Copy the signing secret and update `STRIPE_WEBHOOK_SECRET` in Vercel

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
