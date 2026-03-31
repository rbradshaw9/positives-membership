# Positives — Live Launch Test Runbook

**Purpose:** Step-by-step guide to walk the full happy path before/during launch.  
**Updated:** March 31, 2026  
**Environment:** Production — `https://positives-membership.vercel.app`

---

## Pre-Flight Checklist

Before running the test, confirm:

- [ ] Stripe webhook is registered (see Setup below)
- [ ] `STRIPE_WEBHOOK_SECRET` in Vercel matches the webhook signing secret in Stripe
- [ ] `STRIPE_PRICE_LEVEL_1_MONTHLY` matches the live price ID in Stripe
- [ ] You have access to Vercel runtime logs
- [ ] You have access to the Supabase table editor (member table)
- [ ] You are using a **real email address** you can receive magic links on

---

## Stripe Webhook Setup (One-Time)

1. Go to **Stripe Dashboard → Developers → Webhooks → Add endpoint**
2. Endpoint URL: `https://positives-membership.vercel.app/api/webhooks/stripe`
3. Select these events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Copy the **signing secret** (`whsec_...`) and confirm it matches `STRIPE_WEBHOOK_SECRET` in Vercel

---

## Happy Path Test Steps

### Step 1 — Sign Up

1. Open a **private/incognito browser window**
2. Navigate to `https://positives-membership.vercel.app/`
3. **Expect:** `307 → /login`
4. Enter a real test email address you control
5. Submit the magic link form
6. Check your email and click the magic link

**✅ Success:** You land on `/subscribe`  
**❌ Failure:** You stay on `/login` or see an error → check Supabase Auth settings and redirect URL configuration

---

### Step 2 — Verify Inactive Member State

On `/subscribe` confirm you see:
- "Your membership is not active"
- Your email address shown
- $49/month price
- "Start membership →" button

**Check in Supabase:**
- Open `member` table
- Find your row by email
- Confirm `subscription_status = 'inactive'` (or `null`)
- Confirm `stripe_customer_id IS NULL` at this point

---

### Step 3 — Start Checkout

1. Click **"Start membership →"**
2. **Expect:** Server-side redirect to Stripe Checkout (`checkout.stripe.com/...`)

**Check Vercel logs** (filter: last 5 min, source: serverless):
```
[Stripe] Starting checkout for userId: <uuid>
[Stripe] No existing customer — creating one for userId: <uuid>
[Stripe] Customer created: cus_xxx for userId: <uuid>
[Stripe] stripe_customer_id persisted for userId: <uuid>
[Stripe] Creating checkout session — customer: cus_xxx, price: price_xxx
[Stripe] Checkout session created: cs_xxx for userId: <uuid>
```

**Check Supabase:**
- `member.stripe_customer_id` should now be set to `cus_xxx`

---

### Step 4 — Complete Stripe Checkout

1. On the Stripe Checkout page, use Stripe's test card:
   - **Card:** `4242 4242 4242 4242`
   - **Expiry:** Any future date
   - **CVC:** Any 3 digits
   - **Name:** Any name

   > **Note:** In live mode, use a real card. In test mode, use the test card above.

2. Complete the purchase
3. **Expect:** Redirect to `https://positives-membership.vercel.app/subscribe/success`

---

### Step 5 — Verify Webhook Fired

**Check Vercel logs** (filter: last 2 min):
```
[Stripe Webhook] Received verified event: checkout.session.completed (id: evt_xxx)
[Stripe] checkout.session.completed — session: cs_xxx, customer: cus_xxx, userId: <uuid>
[Stripe] Member activated via checkout — userId: <uuid>, customerId: cus_xxx

[Stripe Webhook] Received verified event: customer.subscription.created (id: evt_xxx)
[Stripe] Member updated — customer: cus_xxx, memberId: <uuid>, status: active, tier: level_1
```

**Check Stripe Dashboard → Webhooks → your endpoint → Recent deliveries:**
- Both events should show `200` response

**Check Supabase `member` table:**
| Column | Expected Value |
|--------|---------------|
| `subscription_status` | `active` |
| `subscription_tier` | `level_1` |
| `stripe_customer_id` | `cus_xxx` |

---

### Step 6 — Confirm Member Access

1. From `/subscribe/success`, click **"Go to Today's Practice"**
2. **Expect:** Load `/today` successfully — no redirect back to `/subscribe`
3. If the page loads, membership is active and access control is working

**✅ Full happy path complete.**

---

## Failure Recognition Guide

### "Your membership is not active" after paying

The webhook did not fire or did not update the member row.

**Diagnose:**
1. Check Vercel logs for `[Stripe Webhook]` entries
2. Check Stripe → Webhooks → Recent deliveries for 4xx/5xx responses
3. Check Supabase `member` table — is `subscription_status` still `inactive`?
4. Check Stripe → Customers → find `cus_xxx` → verify subscription is active

**Common causes:**
- `STRIPE_WEBHOOK_SECRET` mismatch → webhook returns 400 signature failure
- Webhook not registered in Stripe Dashboard
- `stripe_customer_id` not set on member row (see logs for "No member row found")

---

### Redirect loop between `/subscribe` and `/today`

The member row exists but `subscription_status` is not `active`.

**Check Supabase `member` table** — look at `subscription_status`.  
**Check Vercel logs** for webhook delivery confirmation.

---

### Magic link not working / auth callback error

**Check Supabase Dashboard → Authentication → URL Configuration:**
- Site URL must be: `https://positives-membership.vercel.app`
- Redirect URLs must include: `https://positives-membership.vercel.app/**`

---

### `/today` shows empty content (no audio)

This is expected until content is added via the admin panel.

**To add test content:**
1. Sign in as admin (`ryan@drpauljenkins.com`)
2. Navigate to `/admin/content/new`
3. Add a title, a Castos episode URL or S3 key, and set `is_active = true`
4. Return to `/today` and refresh

---

## What to Monitor After First Real Member Signs Up

| Where | What to check |
|-------|--------------|
| **Vercel Logs** | `[Stripe Webhook]` events received + processed |
| **Stripe Dashboard → Webhooks** | All deliveries showing 200 |
| **Supabase → member table** | `subscription_status = active` for new row |
| **Stripe → Customers** | Customer exists, subscription active |
| **Stripe → Subscriptions** | Status = Active, price = Level 1 |

---

## Manual Member Fix (if webhook fails)

If a member paid but didn't get access, fix directly in Supabase:

```sql
UPDATE member
SET 
  subscription_status = 'active',
  subscription_tier = 'level_1',
  stripe_customer_id = 'cus_xxx'  -- from Stripe Dashboard
WHERE email = 'member@example.com';
```

Then ask the member to refresh `/today`.
