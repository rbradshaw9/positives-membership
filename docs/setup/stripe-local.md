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

## 8. Test the full billing flow

1. Create a test customer in Stripe with a known email
2. Manually set `member.stripe_customer_id` in Supabase to match the test customer ID
3. Fire `customer.subscription.created` via the CLI
4. Check `member.subscription_status` in Supabase — should be `'active'`
5. Navigate to `/today` — member should now have access
