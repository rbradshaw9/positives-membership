# Resume Brief — 2026-04-07

> Read this at the start of the next session before doing anything else.

---

## Where we left off

Building the **native affiliate portal** at `/account/affiliate`. Files are written but **not yet committed or pushed**.

---

## Uncommitted files (finish and commit these first)

| File | Status | Notes |
|---|---|---|
| `app/(member)/account/affiliate/page.tsx` | New, not committed | Server component — fetches affiliate + commissions from Rewardful, passes to AffiliatePortal |
| `components/affiliate/AffiliatePortal.tsx` | New, not committed | Client component — 4 tabs: My Link, Stats, Resources, Earnings |
| `lib/rewardful/client.ts` | Modified, not committed | Added `RewardfulCommission` type + `getAffiliateCommissions()` |

---

## Remaining tasks (in order)

### 1. Fix unused import in affiliate page
Remove `getReferralLinkAction` from `app/(member)/account/affiliate/page.tsx` — it's imported but not used there (client component handles it).

### 2. Update account page
`app/(member)/account/page.tsx` — for members who are already affiliates, add a link/button to `/account/affiliate` instead of just showing the inline ReferralCard. The ReferralCard can stay for non-affiliates.

### 3. Check member nav
Check `MemberShellClient` or equivalent nav component to see if an Affiliate nav item is needed/appropriate.

### 4. Commit and push
All three affiliate portal files above.

### 5. Add BILLING_TOKEN_SECRET to Vercel ⚠️ CRITICAL
Without this, Campaign 2 billing recovery emails produce broken links.

```bash
openssl rand -hex 32
# Paste output into:
# Vercel → Settings → Environment Variables
# Name: BILLING_TOKEN_SECRET
# Environments: Production + Preview
```

---

## What was shipped today (deployed, no action needed)

- `lib/auth/billing-token.ts` — HMAC-SHA256 signed billing recovery tokens
- `app/account/billing/route.ts` — 1-click email → Stripe portal (token-based, no login)
- `lib/auth/require-active-member.ts` — past_due → `/account/billing` redirect
- `server/services/stripe/handle-subscription.ts` — generates token at payment_failed, sets BILLING_LINK in AC
- `lib/activecampaign/sync.ts` — syncPaymentFailed sets AC field 9 (BILLING_LINK) before past_due tag
- AC custom field `BILLING_LINK` (field ID 9) created and linked to list 3

## AC work in progress (user is building in ActiveCampaign)

- Campaign 2 prompt: `campaign2-past-due-prompt.md` (in artifacts)
- Campaign 3 prompt: `campaign3-canceled-winback-prompt.md` (in artifacts)

---

## Key field/ID reference

| Thing | ID / Value |
|---|---|
| AC List — Positives Members | 3 |
| AC Field — BILLING_LINK | 9 |
| AC Field — REWARDFUL_LINK | 5 |
| AC Field — REWARDFUL_TOKEN | 6 |
| AC Field — REWARDFUL_PORTAL | 7 |
| AC Tag — past_due | `past_due` |
| AC Tag — canceled | `canceled` |
| AC Tag — affiliate | `affiliate` |

---

## Supabase column names (use these exactly)

- `rewardful_affiliate_id` — Rewardful affiliate UUID
- `rewardful_affiliate_token` — the `via=` token for referral links
- `stripe_customer_id` — Stripe customer ID
