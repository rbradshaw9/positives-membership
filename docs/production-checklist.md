# Production Verification Checklist — Positives Platform

Use this checklist before declaring the Level 1 launch ready for the first live end-to-end test.
Run through it top to bottom. Each step depends on the previous.

---

## 1. Environment variables

Verify all required vars are set in Vercel:
**Project → Settings → Environment Variables**

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Must match live Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Public — safe in browser |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Secret — server-only, never expose |
| `STRIPE_SECRET_KEY` | ✅ | `sk_live_...` for production |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | ✅ | `pk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | ✅ | `whsec_...` from Stripe webhook dashboard |
| `STRIPE_PRICE_LEVEL_1_MONTHLY` | ✅ | `price_1TH2w4KStVEuswF7Fy1gEQeb` |
| `NEXT_PUBLIC_APP_URL` | ✅ | `https://positives.life` |
| `ADMIN_EMAILS` | ✅ | `ryan@drpauljenkins.com` |
| `ACTIVECAMPAIGN_API_URL` | ✅ | `https://lopcadmin.api-us1.com` |
| `ACTIVECAMPAIGN_API_KEY` | ✅ | AC API token |
| `EMAIL_UNSUBSCRIBE_SECRET` | ✅ | Used to sign unsubscribe links |

Keep these intentionally unset for an L1-only launch unless the broader rollout is approved:

- `STRIPE_PRICE_LEVEL_2_MONTHLY`
- `STRIPE_PRICE_LEVEL_2_ANNUAL`
- `STRIPE_PRICE_LEVEL_3_MONTHLY`
- `STRIPE_PRICE_LEVEL_3_ANNUAL`
- `STRIPE_PRICE_LEVEL_4_MONTHLY`
- `STRIPE_PRICE_LEVEL_4_ANNUAL`

---

## 2. Supabase connection

- [ ] Visit `https://positives.life/login`
- [ ] Page loads without 500 error
- [ ] Magic link form renders correctly
- [ ] Send a magic link to your email — it should arrive

**What this confirms:** Supabase URL + anon key are wired correctly in the deployed app.
**Also verify:** Supabase Auth SMTP is configured (Postmark) so magic links and resets deliver reliably.

---

## 3. Auth flow — unauthenticated

- [ ] Visit `https://positives.life/` and verify the expected marketing route behavior
- [ ] Visit `https://positives.life/today` → redirects to `/login`
- [ ] Visit `https://positives.life/admin` as a signed-out visitor → redirects to `/login`

**What this confirms:** Proxy middleware is running and protecting routes.

---

## 4. Auth flow — authenticated, inactive

- [ ] Sign in via magic link
- [ ] After sign-in, you should land on `/subscribe` (subscription is inactive by default)
- [ ] The subscribe page renders with "Your membership is not active"
- [ ] Signed-in email is shown correctly

**What this confirms:** Supabase session works, member row was auto-provisioned by the DB trigger, access guard redirects inactive users.

---

## 5. Checkout launches

- [ ] On `/subscribe`, click **"Start membership →"**
- [ ] Browser redirects to Stripe-hosted Checkout page
- [ ] The product shown is "Positives Level 1 Membership" at $29/month
- [ ] Success URL and cancel URL are `positives.life` (not `localhost`)

**What this confirms:** `STRIPE_SECRET_KEY`, `STRIPE_PRICE_LEVEL_1_MONTHLY`, and `NEXT_PUBLIC_APP_URL` are all correctly set.

---

## 6. Webhook updates member state

- [ ] Complete checkout with a live card (or use Stripe test mode)
- [ ] After payment, you're redirected to `/subscribe/success`
- [ ] Wait 5–10 seconds for the webhook to fire
- [ ] Navigate to `/today` — it should load (not redirect to `/subscribe`)

Verify in Supabase:
```sql
SELECT email, stripe_customer_id, subscription_status, subscription_tier
FROM member
WHERE email = 'your-email@example.com';
```
Expected: `subscription_status = 'active'`, `subscription_tier = 'level_1'`

Check Stripe Dashboard → Developers → Webhooks → Recent deliveries for `200` responses.

**What this confirms:** `STRIPE_WEBHOOK_SECRET`, webhook handler, and Supabase service role write path all work end-to-end.

---

## 7. Active member can reach `/today`

- [ ] After webhook fires, navigate to `https://positives.life/today`
- [ ] Page loads — daily practice content renders (or empty state if no content yet)
- [ ] Bottom nav renders correctly
- [ ] No redirect to `/login` or `/subscribe`
- [ ] Start audio on `/today`, navigate to `/library`, and confirm the persistent player continues

**What this confirms:** `requireActiveMember()` guard passes for active members.

---

## 8. Admin access

- [ ] Navigate to `https://positives.life/admin`
- [ ] Signed in as `ryan@drpauljenkins.com` → admin panel renders
- [ ] Any other account → redirected to `/today`

**What this confirms:** `ADMIN_EMAILS` env var is correctly wired.

---

## Stripe webhook reference

| Field | Value |
|---|---|
| Endpoint | `https://positives.life/api/webhooks/stripe` |
| Webhook ID | `we_1TH2waKStVEuswF7Z1V5ODVn` |
| Status | `enabled` |

See `docs/setup/stripe-live.md` for full webhook details.

---

## Known gaps before full production readiness

These are out of scope for this activation pass but should be tracked:

- Community launch remains intentionally off behind `ENABLE_COMMUNITY_PREVIEW=false`
- Level 2-4 commerce remains intentionally off until price IDs are configured
- Castos private podcast feed is not configured
- ActiveCampaign / lifecycle email is not configured
- Ingestion pipeline (Google Drive → S3) is not active
- AI embeddings and semantic search are not populated
