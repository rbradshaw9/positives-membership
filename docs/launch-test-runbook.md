# Positives — Level 1 Launch Rehearsal Runbook

**Purpose:** Operator-grade rehearsal for the Level 1 public launch.\
**Last updated:** April 10, 2026\
**Scope:** Level 1 only. Community stays off. Level 2-4 stay preview / notify-me only.

---

## 1. Preflight

Run these from the repo root before touching production data:

```bash
npx supabase migration list
npm run lint
npm run build
npm run audit:launch
PLAYWRIGHT_PORT=3011 npx playwright test tests/e2e/auth-and-member.spec.ts --project=chromium
PLAYWRIGHT_PORT=3012 npx playwright test tests/e2e/admin-calendar.spec.ts --project=chromium
PLAYWRIGHT_PORT=3013 npx playwright test tests/e2e/join-checkout.spec.ts tests/e2e/billing-portal.spec.ts tests/e2e/subscribe-success.spec.ts --project=chromium
```

Go / no-go rule:

- `npx supabase migration list` must show local and remote aligned
- `npm run lint` must pass
- `npm run build` must pass
- both Playwright smoke suites must pass
- the hosted-billing / subscribe-success smoke suite must pass
- `npm run audit:launch` must report zero blockers before launch day

---

## 2. Environment lock

Verify production env intent against [.env.example](/Users/ryanbradshaw/AntiGravity/positives-membership/.env.example):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_LEVEL_1_MONTHLY`
- `NEXT_PUBLIC_APP_URL`
- `ADMIN_EMAILS`

For full hosted-billing testing, these are configured in Vercel for the real
Positives Stripe account in test mode:

- `STRIPE_PRICE_LEVEL_2_MONTHLY`
- `STRIPE_PRICE_LEVEL_2_ANNUAL`
- `STRIPE_PRICE_LEVEL_3_MONTHLY`
- `STRIPE_PRICE_LEVEL_3_ANNUAL`
- `STRIPE_PRICE_LEVEL_4_THREE_PAY`
- `STRIPE_PRODUCT_LEVEL_4`

Operational launch settings:

- `ENABLE_COMMUNITY_PREVIEW=false`
- Supabase auth Site URL and Redirect URLs must match [docs/setup/supabase-auth-urls.md](/Users/ryanbradshaw/AntiGravity/positives-membership/docs/setup/supabase-auth-urls.md)

---

## 3. Content runway

Before the rehearsal, fill the launch window through June 4, 2026.

Expected runway:

- one published `daily_audio` for every day from `2026-04-07` through `2026-06-04`
- one published `weekly_principle` for every Monday in that window
- published `monthly_theme` rows for `2026-05` and `2026-06`
- no published daily or weekly rows missing both `castos_episode_url` and `s3_audio_key`

Use the structured content workflow in [docs/launch-content-ops.md](/Users/ryanbradshaw/AntiGravity/positives-membership/docs/launch-content-ops.md).

Operator note:

- `scripts/launch-content-plan.l1-window.template.json` is the base runway plan
- `scripts/launch-content-plan.june-window-extension.json` extends the seeded daily coverage through `2026-06-04`

Quick verification queries:

```bash
npx supabase db query --linked "select month_year, status from monthly_practice order by month_year;" --output table
npx supabase db query --linked \"select type, status, count(*) from content group by 1,2 order by 1,2;\" --output table
npx supabase db query --linked \"select title, week_start from content where type = 'weekly_principle' and status = 'published' and castos_episode_url is null and s3_audio_key is null order by week_start;\" --output table
```

Then rerun:

```bash
npm run audit:launch
```

---

## 4. Member rehearsal

Use an incognito window and a real inbox you control.

### A. Unauthenticated route checks

Confirm these redirect correctly while signed out:

- `/today`
- `/library`
- `/practice`
- `/community`
- `/coaching`
- `/account`
- `/admin`

### B. Authentication checks

Confirm both paths work:

1. Password login to an existing member account
2. Magic-link login for a fresh or inactive account

### C. Checkout happy path

1. Open `/join`
2. Start Level 1 checkout
3. Verify Stripe Checkout loads with the correct live Level 1 product
4. Complete checkout
5. Confirm redirect to `/subscribe/success`
6. Confirm the success flow signs the member in and lands them in `/today`
7. If instant sign-in does not complete, confirm the fallback state still clearly tells the member their membership is active and routes them toward `/login`

Stripe / member verification:

```bash
npx supabase db query --linked \"select email, subscription_status, subscription_tier, stripe_customer_id from member order by created_at desc limit 10;\" --output table
```

Expected result for the new checkout member:

- `subscription_status = active`
- `subscription_tier = level_1`
- `stripe_customer_id` populated
- the member should either be auto-signed into `/today` or see a clean `/subscribe/success` fallback with a sign-in CTA

### D. Level 1 member experience

Once signed in as an active member:

1. Open `/today`
2. Confirm a real daily practice renders
3. Start playback on `/today`
4. Navigate to `/library`, `/practice`, then `/account`
5. Confirm the persistent player survives after leaving `/today`
6. Save a note or reflection
7. Open the billing portal from `/account`
8. Confirm the billing portal opens cleanly and shows the correct current plan

### E. Admin checks

While signed in as an admin:

1. Open `/admin/content/calendar`
2. Confirm create links still prefill dates correctly
3. Edit one piece of content and save it successfully
4. Confirm a signed-in non-admin is redirected away from `/admin`

---

## 5. Logs and dashboards

During the rehearsal, monitor:

- Stripe Dashboard → Webhooks → recent deliveries
- Vercel runtime logs for checkout, webhook, and auth callback traffic
- Sentry monitors:
  - `cron-reminders`
  - `cron-affiliate-payouts`
- Sentry alert rules:
  - `Alert on cron monitor failures`
  - `Alert on Stripe webhook failures`
  - `Alert on auth API failures`
- Supabase member/content tables for expected writes

Key things to confirm:

- webhook deliveries return `200`
- Sentry cron monitors show healthy check-ins after the handlers run
- member activation happens once, not repeatedly
- success-page token exchange signs the user in without inbox fallback
- no server errors appear in runtime logs during `/today`, `/join`, `/subscribe/success`, or `/admin`

If `/subscribe/success` falls back to manual sign-in:

- verify the member still reached `active` + correct tier in Supabase
- verify the fallback copy says the membership is active
- verify the sign-in CTA goes to `/login`
- verify the member can still access `/today` immediately after login

---

## 6. Manual recovery

### If a member pays but stays inactive

Verify the Stripe customer and subscription, then patch the member row:

```bash
npx supabase db query --linked \"update member set subscription_status = 'active', subscription_tier = 'level_1', stripe_customer_id = 'cus_xxx' where email = 'member@example.com';\" --output table
```

### If a content row was published to the wrong slot

Use the content plan workflow with `--allow-update` to correct the slot, or update the row directly:

```bash
npx supabase db query --linked \"select id, title, type, publish_date, week_start, month_year, status from content where title ilike '%replace-me%' order by created_at desc;\" --output table
```

---

## 7. Launch-day go signal

Launch only after all of these are true on the target day:

- schema truth is aligned
- code gates are green
- content audit is green
- one full end-to-end rehearsal completed cleanly
- Level 1 checkout, success-page auth, and Today playback all worked
- admin edit/save worked
- non-admin admin redirect worked

If any one of those is red, hold launch and fix the blocker first.
