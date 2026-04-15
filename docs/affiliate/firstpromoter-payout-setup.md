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

## PayPal Direct Payout Setup

FirstPromoter can handle PayPal payouts directly from the FirstPromoter
dashboard when PayPal Payouts is configured.

Requirements:

- A dedicated Positives PayPal Business account.
- PayPal Payouts API enabled on that account.
- FirstPromoter Business or Enterprise plan.
- A live PayPal app for FirstPromoter payouts.
- PayPal webhook events connected back to FirstPromoter.

Setup outline:

1. In PayPal Developer Dashboard, confirm Payouts is enabled on the Live
   account.
2. Create a Live app named `FirstPromoter payouts`.
3. Copy the PayPal Client ID and Secret into FirstPromoter Settings →
   Integrations → PayPal.
4. Copy the FirstPromoter PayPal webhook URL into the PayPal app.
5. Subscribe the webhook to all `Payment payouts-item` events and the
   `Payment payoutsbatch denied` event.
6. Copy the PayPal Webhook ID back into FirstPromoter and save.

If PayPal Payouts API is not approved yet, use FirstPromoter's external bulk
CSV payout flow temporarily, then mark payouts paid in FirstPromoter after the
payment provider processes them.

References:

- FirstPromoter PayPal Payout setup:
  <https://help.firstpromoter.com/en/articles/8971526-how-to-configure-paypal-payouts>
- FirstPromoter payout methods:
  <https://help.firstpromoter.com/en/articles/8971513-how-to-pay-your-promoters>

## Failed PayPal Payout Review Workflow

FirstPromoter can store a valid-looking PayPal email before PayPal proves the
recipient account is usable. Some issues only surface when a payout is
attempted.

Watch for these PayPal payout errors in FirstPromoter:

- `RECEIVER_UNREGISTERED`: the PayPal email was not found.
- `RECEIVER_UNCONFIRMED`: the PayPal email exists but is not confirmed.
- `RISK_DECLINE`: PayPal declined the recipient/payment for risk reasons.
- `UNDEFINED`: PayPal had an internal processing error.

When one of these occurs:

1. Do not assume FirstPromoter has sent the affiliate the right correction
   message.
2. Flag the affiliate as needing payout review.
3. Contact the affiliate from `support@positives.life`.
4. Ask them to update the payout email to the email connected to their PayPal
   account, or confirm the email inside PayPal.
5. Re-run or retry the payout after the affiliate confirms the correction.
6. Record the outcome in the payout review notes.

Recommended ActiveCampaign follow-up:

- Field: `AFFILIATE_PAYOUT_ERROR`
- Field: `AFFILIATE_PAYOUT_EMAIL`
- Field: `AFFILIATE_PAYOUT_FAILED_AT`
- Optional field: `AFFILIATE_PAYOUT_AMOUNT`
- Trigger tag: `affiliate_payout_failed`

The `affiliate_payout_failed` tag should be removed after automation entry so
it can be reused for a future payout issue.

The app now checks for failed FirstPromoter payouts once per day through
`/api/cron/affiliate-payouts`. The cron job:

1. Scans members with a FirstPromoter promoter ID.
2. Pulls recent payout records from FirstPromoter.
3. Creates or updates a durable `affiliate_payout_alert` row for each failed
   payout.
4. Syncs the payout failure fields to ActiveCampaign.
5. Applies `affiliate_payout_failed` once per unresolved payout issue.

The `affiliate_payout_alert` table dedupes by FirstPromoter promoter ID and
payout ID, so rerunning the cron will not repeatedly trigger the same AC
automation unless the alert was later marked resolved and the failure appears
again.

Reference:

- FirstPromoter common PayPal errors:
  <https://help.firstpromoter.com/en/articles/8971520-common-paypal-errors>

## Verification

Run:

```bash
npx playwright test tests/e2e/affiliate-portal.spec.ts
```

The test enrolls the configured test member as an affiliate, saves a PayPal email, and asserts that both Supabase and FirstPromoter's PayPal payout method contain the same payout email.
