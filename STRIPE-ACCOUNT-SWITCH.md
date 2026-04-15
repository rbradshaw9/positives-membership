# Stripe Account Switch Checklist

This document covers everything required to switch from the old Stripe account to the 
new one. Currently in **sandbox/test mode** (waiting on business verification docs).

---

## Summary of What Changes

| Category | Items |
|---|---|
| **API Keys** | 3 env vars (secret key, publishable key, webhook secret) |
| **Products & Prices** | 1 product (L4) + up to 7 prices to recreate |
| **Webhooks** | 1 endpoint to register in the new Stripe dashboard |
| **Database** | `stripe_customer_id` on member rows — all old IDs become invalid |
| **Connected Services** | FirstPromoter + Stripe Billing Portal config |
| **Vercel** | Update all STRIPE_* env vars in the Vercel dashboard |

---

## Step 1: Get the New Stripe Keys

In the **new Stripe sandbox account**, go to:
**Developers → API keys**

Copy and update these three values everywhere (local `.env.local` AND Vercel dashboard):

```
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

The webhook secret (`STRIPE_WEBHOOK_SECRET`) comes in Step 3 after registering the webhook.

---

## Step 2: Recreate Products & Prices

All existing Stripe objects (products, prices, customers, subscriptions) are **account-specific**.  
None of your old ones exist in the new account. They must be recreated.

### Products

**Create ONE product:**

| What | Name | Notes |
|---|---|---|
| L4 Executive Coaching | `Positives — Level 4 Executive Coaching` | Used as the base product when creating custom L4 prices |

Copy the product ID → set `STRIPE_PRODUCT_LEVEL_4=prod_...` in env.

### Prices (Recurring Subscriptions)

Create these 6 recurring prices under the appropriate products:

| Env Var | Name | Amount | Interval |
|---|---|---|---|
| `STRIPE_PRICE_LEVEL_1_MONTHLY` | Positives L1 Monthly | $49/mo | Monthly |
| `STRIPE_PRICE_LEVEL_1_ANNUAL` | Positives L1 Annual | $?/yr | Annual |
| `STRIPE_PRICE_LEVEL_2_MONTHLY` | Positives L2 Monthly | $?/mo | Monthly |
| `STRIPE_PRICE_LEVEL_2_ANNUAL` | Positives L2 Annual | $?/yr | Annual |
| `STRIPE_PRICE_LEVEL_3_MONTHLY` | Positives L3 Monthly | $?/mo | Monthly |
| `STRIPE_PRICE_LEVEL_3_ANNUAL` | Positives L3 Annual | $?/yr | Annual |

**Plus this optional one for the 3-pay L4 plan:**

| Env Var | Name | Amount | Interval |
|---|---|---|---|
| `STRIPE_PRICE_LEVEL_4_THREE_PAY` | Positives L4 3-Pay | $1,500/mo | Monthly (3 cycles) |

> **Note:** Your exact current prices are in your old Stripe dashboard. Match them exactly.

---

## Step 3: Register the Webhook

In the **new Stripe sandbox account**, go to:  
**Developers → Webhooks → Add endpoint**

**Endpoint URL:**
```
https://positives.life/api/webhooks/stripe
```
(Or your Vercel preview URL if testing on a branch first)

**Events to subscribe:** Select these exactly:
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

After creating, click **Reveal signing secret** → copy the `whsec_...` value:

```
STRIPE_WEBHOOK_SECRET=whsec_...
```

Update in `.env.local` AND Vercel.

> **For local testing:** Use the [Stripe CLI](https://stripe.com/docs/stripe-cli) to forward events:
> ```
> stripe listen --forward-to localhost:3000/api/webhooks/stripe
> ```
> The CLI gives you a temporary `whsec_...` secret — use that in `.env.local` during dev.

---

## Step 4: Configure the Billing Portal

The Stripe Billing Portal (where members manage their subscription) must be configured  
in the new account. It doesn't carry over automatically.

In the new Stripe dashboard:
**Settings → Billing → Customer portal**

Configure:
- ✅ Allow customers to cancel subscriptions
- ✅ Allow customers to update billing info
- ✅ Allow customers to update payment methods
- Set **Return URL** to: `https://positives.life/account`

---

## Step 5: Update All Env Vars

### Local `.env.local`

```bash
# Stripe — New sandbox account keys
STRIPE_SECRET_KEY=sk_test_<new>
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_<new>
STRIPE_WEBHOOK_SECRET=whsec_<new>

# Stripe Price IDs — all new values from Step 2
STRIPE_PRICE_LEVEL_1_MONTHLY=price_<new>
STRIPE_PRICE_LEVEL_2_MONTHLY=price_<new>
STRIPE_PRICE_LEVEL_3_MONTHLY=price_<new>
STRIPE_PRICE_LEVEL_4_THREE_PAY=price_<new>
STRIPE_PRICE_LEVEL_1_ANNUAL=price_<new>
STRIPE_PRICE_LEVEL_2_ANNUAL=price_<new>
STRIPE_PRICE_LEVEL_3_ANNUAL=price_<new>

# Stripe Product ID
STRIPE_PRODUCT_LEVEL_4=prod_<new>
```

### Vercel Dashboard

Go to: **Vercel → positives-membership → Settings → Environment Variables**

Update all the same keys for **Production**, **Preview**, and **Development** environments.

> **Important:** After updating Vercel env vars, you must **redeploy** the project  
> (or trigger a re-deployment) for changes to take effect. Vercel does not hot-reload env vars.

---

## Step 6: Connected Third-Party Services

These services are connected to Stripe and must be updated:

### FirstPromoter (Affiliate platform)

FirstPromoter connects to Stripe through its Stripe integration. The connection is account-specific.

**Action:** In FirstPromoter dashboard → **Settings → Integrations → Stripe** and connect the correct Stripe account/mode.

### Stripe Billing Portal (see Step 4 above)

Already covered.

---

## Step 7: Handle Existing Database Records (Critical)

The `member` table in Supabase has a `stripe_customer_id` column.  
All existing `cus_...` values point to the **old** Stripe account.

**For sandbox testing:** This is fine — you're testing with new test checkouts anyway. New signups via the test checkout will get new `cus_...` IDs from the new account. Existing dev/test member rows will have stale customer IDs, but that's expected.

**For production cutover (future — when business verification is done):**

You have two options:
1. **Fresh start** (simplest for a small member base): Accept that existing members will need to re-subscribe at launch. Handle manually for any early members.
2. **Customer migration**: Export customers from old Stripe account and import via API into new account. Stripe Support can assist with this for live accounts.

> For now (sandbox phase), don't worry about this. Test the full new-signup flow end-to-end and make sure webhooks fire correctly.

---

## Step 8: Code Changes Needed

**Good news: Zero code changes required.** The entire Stripe integration flows through:
- `lib/stripe/config.ts` — reads from env vars
- `lib/config.ts` — central env var access layer

All Stripe objects (keys, price IDs, product IDs) are env-var-driven.  
Swapping accounts = updating env vars only.

---

## Checklist: Sandbox Readiness

- [ ] New Stripe sandbox account created
- [ ] API keys copied to `.env.local`
- [ ] Stripe CLI installed for local webhook forwarding
- [ ] L4 product created → `STRIPE_PRODUCT_LEVEL_4` set
- [ ] Level 1 Monthly price created → `STRIPE_PRICE_LEVEL_1_MONTHLY` set
- [ ] Level 2 Monthly price created → `STRIPE_PRICE_LEVEL_2_MONTHLY` set
- [ ] Level 3 Monthly price created → `STRIPE_PRICE_LEVEL_3_MONTHLY` set
- [ ] L4 3-Pay price created → `STRIPE_PRICE_LEVEL_4_THREE_PAY` set
- [ ] Annual prices created (all 3) → env vars updated
- [ ] Webhook registered in new Stripe dashboard
- [ ] `STRIPE_WEBHOOK_SECRET` updated
- [ ] Billing portal configured in new Stripe dashboard
- [ ] Test a full L1 checkout end-to-end in test mode
- [ ] Verify webhook fires → member row updated in Supabase
- [ ] Verify billing portal redirect works (`/account/billing`)
- [ ] Vercel env vars updated (when ready to deploy to preview/production)

## Checklist: Production Cutover (Future — After Business Verification)

All of the above, plus:
- [ ] Switch from test keys (`sk_test_`, `pk_test_`) to live keys (`sk_live_`, `pk_live_`)
- [ ] Recreate products/prices in **live** mode (separate from test mode)
- [ ] Register webhook pointing to production URL in **live** mode
- [ ] Reconnect FirstPromoter to live Stripe account
- [ ] Decide on existing member migration strategy
- [ ] Update Vercel production env vars
- [ ] Redeploy

---

*See also: `RESUME.md` for overall project context, `FIRSTPROMOTER-MIGRATION.md` for affiliate platform plan.*
