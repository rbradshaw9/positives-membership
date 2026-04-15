# Stripe Hosted Checkout And Portal Setup

This is the repeatable setup path for Stripe-hosted billing surfaces:

- Checkout
- Customer Portal
- Stripe account branding used by hosted billing pages

Use the real Positives Stripe account in test mode for launch prep. A separate
Stripe Sandbox is useful for isolated experiments, but the real account's test
mode is easier to transition from because the setup happens in the account that
will later accept live payments.

Do not add an admin UI toggle for switching Stripe test/live mode. Billing mode
should be controlled by deployment environment variables, not a product setting:

- Vercel Preview / staging: Stripe test keys
- Vercel Production: Stripe live keys after business verification
- Admin UI may show a read-only billing environment badge later, but should not
  switch secrets or payment mode

## Current Default

- Use test-mode keys now: `sk_test...` and `pk_test...`
- Current test-mode account: `acct_1THAYAIoN7XN0qfm`
- Do not configure a Stripe custom domain yet
- Accept all card brands
- Use Stripe Customer Portal for plan changes, payment method updates, and
  cancellation
- Keep live setup gated until business verification is complete

## Configure Product Catalog

Run this first when setting up a new Stripe account or mode:

```bash
npm run stripe:catalog
```

The script creates or reuses:

- `Positives Membership`
  - `$37/month`
  - `$370/year`
- `Positives Membership + Events`
  - `$97/month`
  - `$970/year`
- `Positives Coaching Circle`
  - `$297/month`
  - `$2,970/year`
- `Positives Executive Coaching`
  - `$1,500/month` three-pay price

It writes the resulting `STRIPE_PRICE_LEVEL_*` and `STRIPE_PRODUCT_LEVEL_4`
values back to `.env.local`.

## Configure Test Mode

Run:

```bash
npm run stripe:hosted-billing
```

The script:

- derives the Stripe account from the active secret key
- refuses unknown or mismatched key modes
- prints account branding dashboard instructions
- configures Customer Portal headline, policy links, and return URL
- enables plan switching for the configured L1/L2/L3 prices
- sets upgrade proration to `create_prorations`
- schedules downgrades / shortening interval changes at period end
- leaves custom domain disabled

Stripe does not allow updating your own account-level branding through the
Accounts API method used for connected accounts, so use the dashboard fallback
printed by the script:

- Stripe Dashboard -> Settings -> Public details
- Stripe Dashboard -> Settings -> Branding

Use:

- business name: `Positives`
- support email: `support@positives.life`
- support URL: `https://positives.life/support`
- website: `https://positives.life`
- primary color: `#2EC4B6`
- secondary color: `#44A8D8`
- logo: `public/logos/png/positives-logos_Positives-logo-full.png`
- icon: `public/logos/png/positives-logos_positives-icon-square.png`

## Verify Proration

The Customer Portal configuration should report:

```txt
subscription_update.enabled = true
subscription_update.proration_behavior = create_prorations
subscription_update.billing_cycle_anchor = unchanged
subscription_update.trial_update_behavior = continue_trial
```

Manual sandbox check:

1. Create or use a Level 1 monthly test member.
2. Open the billing portal from `/account`.
3. Switch to Level 2 or Level 3.
4. Confirm Stripe shows prorated upgrade behavior.
5. Confirm the webhook updates the member tier/status.

Downgrades and interval-shortening changes should be scheduled at period end.

## Webhook Setup

The live account's test-mode webhook is configured as:

- endpoint: `https://positives.life/api/webhooks/stripe`
- mode: test
- events:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `customer.subscription.trial_will_end`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`
  - `charge.refunded`
  - `charge.dispute.closed`

The matching `STRIPE_WEBHOOK_SECRET` must be set anywhere the app uses these
test-mode keys. It is currently set in local `.env.local` and Vercel
Production/Preview/Development with the matching test-mode Stripe keys and
price IDs.

## Secret And IP Restriction Policy

Do not add an app/admin toggle that switches Stripe test/live mode. Use
deployment environment variables instead.

Stripe key IP restrictions should only be enabled after we have stable outbound
IP addresses for the app runtime. Standard serverless outbound IPs can rotate,
so IP allowlisting a Stripe key without a stable egress path can break checkout
and webhook-side Stripe reads.

Recommended future live setup:

- production uses live keys only after business verification
- preview/staging uses test keys
- if IP restrictions are required, first add stable outbound IP infrastructure
  or a trusted proxy/egress layer, then restrict the live key to that egress
  set in Stripe Dashboard
- rotate the test keys that were pasted into chat before broader team use

## Live Mode Later

After Stripe business verification:

1. Copy or recreate products and prices into live mode.
2. Update live/Vercel env vars:
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live...`
   - `STRIPE_SECRET_KEY=sk_live...`
   - `STRIPE_WEBHOOK_SECRET=whsec_...`
   - all live `STRIPE_PRICE_LEVEL_*` values
   - `STRIPE_PRODUCT_LEVEL_4`
3. Register/verify the live webhook endpoint.
4. Run:

```bash
ALLOW_STRIPE_LIVE_SETUP=true npm run stripe:hosted-billing
```

5. Open live Checkout and Customer Portal in a controlled smoke test before
   accepting real launch traffic.

Important: test-mode customers, subscriptions, invoices, checkout sessions, and
price IDs do not become live-mode records. Live mode gets its own IDs and data.
