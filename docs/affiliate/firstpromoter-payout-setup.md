# FirstPromoter PayPal Payout Setup

The Positives affiliate portal saves a member's PayPal payout email in two places:

- Supabase `member.paypal_email`
- FirstPromoter's native PayPal payout method for that promoter

The local portal only opens after FirstPromoter accepts the payout email, so payout readiness stays visible in both systems.

## How The Sync Works

When a member saves their payout email, the app:

1. Finds the member's `fp_promoter_id`.
2. Checks FirstPromoter for an existing PayPal payout method using `GET /company/payout_methods?filters[promoter_id]=...`.
3. Updates the existing PayPal payout method, or creates one if none exists.
4. Stores the same email in Supabase after FirstPromoter accepts it.

The FirstPromoter payload uses:

```json
{
  "method": "paypal",
  "promoter_id": 123,
  "details": {
    "paypal_email": "member@example.com"
  },
  "is_disabled": false,
  "is_selected": true
}
```

## Verification

Run:

```bash
npx playwright test tests/e2e/affiliate-portal.spec.ts
```

The test enrolls the configured test member as an affiliate, saves a PayPal email, and asserts that both Supabase and FirstPromoter's PayPal payout method contain the same payout email.
