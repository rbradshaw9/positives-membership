# Stripe Local Webhook Testing — Positives Platform

## Prerequisites

- A Stripe account with test mode enabled
- Stripe CLI installed

---

## 1. Install the Stripe CLI

```bash
# macOS
brew install stripe/stripe-cli/stripe

# Or download directly
# https://stripe.com/docs/stripe-cli#install
```

Verify:

```bash
stripe --version
```

---

## 2. Authenticate

```bash
stripe login
```

This opens a browser to authenticate against your Stripe account.

---

## 3. Configure your `.env.local`

```bash
STRIPE_SECRET_KEY=sk_test_...       # from Stripe Dashboard → Developers → API Keys
STRIPE_WEBHOOK_SECRET=              # set in step 4 below
```

---

## 4. Forward webhooks to your local server

In a separate terminal, start the webhook forwarder:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

The CLI prints a webhook signing secret (`whsec_...`). Copy it to your `.env.local`:

```bash
STRIPE_WEBHOOK_SECRET=whsec_...
```

Restart your dev server after setting this value.

---

## 5. Start your dev server

```bash
npm run dev
```

---

## 6. Trigger test events

In a third terminal, fire Stripe test events:

```bash
# Subscription created (activates a member)
stripe trigger customer.subscription.created

# Subscription updated
stripe trigger customer.subscription.updated

# Subscription canceled
stripe trigger customer.subscription.deleted

# Payment failed (marks past_due)
stripe trigger invoice.payment_failed
```

Watch your dev server terminal for `[Stripe] Member updated` log output.

---

## 7. Set up Stripe Price IDs

Before webhook tier mapping works, create products and prices in your Stripe test dashboard and add the price IDs to `.env.local`:

```bash
STRIPE_PRICE_LEVEL_1_MONTHLY=price_...
STRIPE_PRICE_LEVEL_2_MONTHLY=price_...
STRIPE_PRICE_LEVEL_3_MONTHLY=price_...
STRIPE_PRICE_LEVEL_4_MONTHLY=price_...
STRIPE_PRICE_LEVEL_1_ANNUAL=price_...   # optional
STRIPE_PRICE_LEVEL_2_ANNUAL=price_...   # optional
STRIPE_PRICE_LEVEL_3_ANNUAL=price_...   # optional
STRIPE_PRICE_LEVEL_4_ANNUAL=price_...   # optional
```

If a price ID is not configured, the webhook will throw a descriptive error and return 400 (Stripe retries automatically).

---

## 8. Test the full Stripe Checkout flow

This is the end-to-end test for the billing-to-access path introduced in Milestone 03.

### Prerequisites
- Dev server running (`npm run dev`)
- Webhook forwarder running (`stripe listen --forward-to localhost:3000/api/webhooks/stripe`)
- `STRIPE_PRICE_LEVEL_1_MONTHLY` set in `.env.local` with a valid test mode price ID

### Steps

1. **Sign in** at `http://localhost:3000/login` using magic link (use any email)
2. After sign-in, you should land on `/subscribe` (subscription inactive by default)
3. Click **"Start membership →"** — you will be redirected to Stripe Checkout
4. On the Stripe Checkout page, use a test card:

   | Scenario | Card number | Expiry | CVC |
   |---|---|---|---|
   | Success | `4242 4242 4242 4242` | Any future date | Any 3 digits |
   | Requires auth | `4000 0027 6000 3184` | Any future date | Any 3 digits |
   | Declined | `4000 0000 0000 9995` | Any future date | Any 3 digits |

5. Complete checkout — you'll be redirected to `/subscribe/success`
6. Watch the webhook forwarder terminal for `customer.subscription.created`
7. Watch the dev server terminal for `[Stripe] Member updated` log

### Verify the member row

In the Supabase SQL Editor or Table Editor:

```sql
SELECT id, email, stripe_customer_id, subscription_status, subscription_tier
FROM member
WHERE email = 'your-test-email@example.com';
```

Expected after successful checkout + webhook:
- `stripe_customer_id` — populated (set during checkout creation)
- `subscription_status` — `'active'` (set by webhook handler)
- `subscription_tier` — `'level_1'` (set by webhook handler via price ID mapping)

### Verify access

Navigate to `http://localhost:3000/today` — should load the daily practice page.
If you still see `/subscribe`, wait a moment and refresh (webhook may still be processing).

---

## 9. Test inactive vs active access

| State | Expected behavior |
|---|---|
| No session | Redirected to `/login` |
| Signed in, `subscription_status = 'inactive'` | Redirected to `/subscribe` |
| Signed in, `subscription_status = 'active'` | `/today` loads normally |

To manually test inactive state:

```sql
UPDATE member
SET subscription_status = 'inactive'
WHERE email = 'your-test-email@example.com';
```

Then navigate to `/today` — you should be redirected to `/subscribe`.
